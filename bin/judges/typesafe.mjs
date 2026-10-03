// The one place the tooling names a judge: TypeSafe's Jev, over its HTTP API
// (https://docs.typesafe.ai/api). A request of lib/questions.mjs becomes Jev's wire shape here,
// and Jev's answers come back in the module's own, so a second judge is a second file beside
// this one and the questions do not change. The model is pinned rather than `jev-latest`,
// because the band the report flags by is measured against one model, and a newer one is
// measured again before it is named here.
/** @import { Request, Answers } from "../../lib/questions.mjs" */

export const SERVICE = { name: "TypeSafe", host: "api.typesafe.ai", model: "jev-1.13.0" };
const URL_DEFAULT = "https://api.typesafe.ai/v1/systemone";

// A rule that does not apply to a page is kept by it, and the criteria say so: without that, a
// rule about one-offs reads as broken by every page that is not one.
/**
 * @param {Request} request
 */
export function toWire(request) {
  /** @type {Record<string, object>} */
  const questions = {};
  for (const q of request.questions)
    questions[q.id] = q.kind === "rule"
      ? { type: "noul",
          instructions: { rule: q.rule, question: "Does the page in `entity` keep `rule`? `purpose` is what the page's type is for." },
          criteria: { true: "The page keeps the rule, including where the rule does not apply to it.", false: "The page breaks the rule." } }
      : { type: "choice",
          instructions: { bullet: q.bullet, question: `\`bullet\` is a bullet of the page's "## ${q.section}". Which option is it chiefly evidence of?` },
          criteria: q.options };
  return { model: SERVICE.model, state: request.state, questions };
}

/**
 * @param {Request} request
 * @param {unknown} body
 * @returns {Answers}
 */
export function fromWire(request, body) {
  const answers = /** @type {Record<string, any>} */ (/** @type {any} */ (body)?.answers ?? {});
  /** @type {Answers} */
  const out = {};
  for (const q of request.questions) {
    const a = answers[q.id];
    if (q.kind === "rule" && a?.type === "noul" && typeof a.noul === "number") out[q.id] = { p: a.noul };
    else if (q.kind === "group" && a?.type === "choice" && typeof a.choice === "string") out[q.id] = { pick: a.choice, probabilities: a.probabilities ?? {} };
    else throw new Error(`${SERVICE.name} gave no ${q.kind === "rule" ? "noul" : "choice"} for ${q.id}`);
  }
  return out;
}

export class KeyRefused extends Error {
  constructor() {
    super(`${SERVICE.name} refused the key in TYPESAFE_API_KEY`);
  }
}

// Jev reads 64k tokens in one request, state and every question together. A page with many
// grouped bullets repeats every option's description in every choice, so its questions are
// sent in as many requests as keep each under this many characters, three to a token with room
// to spare, each with the whole state, and the answers are merged.
export const REQUEST_BUDGET = 150_000;

/**
 * @param {Request} request
 * @returns {Request[]}
 */
function partsOf(request) {
  /** @type {Request[]} */
  const parts = [];
  /** @type {Request["questions"]} */
  let questions = [];
  for (const q of request.questions) {
    if (questions.length && JSON.stringify(toWire({ ...request, questions: [...questions, q] })).length > REQUEST_BUDGET) {
      parts.push({ ...request, questions });
      questions = [];
    }
    questions.push(q);
  }
  if (questions.length) parts.push({ ...request, questions });
  return parts;
}

/**
 * @param {Request} request
 * @param {{ key: string; fetch?: typeof globalThis.fetch; sleep?: (ms: number) => Promise<void>; attempts?: number }} options
 * @returns {Promise<Answers>}
 */
export async function ask(request, options) {
  /** @type {Answers} */
  const answers = {};
  for (const part of partsOf(request)) Object.assign(answers, await askOnce(part, options));
  return answers;
}

// A rate limit (429) and an overload (529) are retried, after the `retry-after` the service
// sends or else a doubling wait, as TypeSafe's own clients do; anything else is the page's
// failure, and a refused key is the run's.
/**
 * @param {Request} request
 * @param {{ key: string; fetch?: typeof globalThis.fetch; sleep?: (ms: number) => Promise<void>; attempts?: number }} options
 * @returns {Promise<Answers>}
 */
async function askOnce(request, { key, fetch = globalThis.fetch, sleep = (ms) => new Promise((done) => setTimeout(done, ms)), attempts = 4 }) {
  const url = process.env.COMPANYGRAPH_TYPESAFE_URL ?? URL_DEFAULT;
  for (let i = 1; ; i++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify(toWire(request)),
    });
    if (res.ok) return fromWire(request, await res.json());
    if (res.status === 401) throw new KeyRefused();
    if ((res.status === 429 || res.status === 529) && i < attempts) {
      const after = Number(res.headers.get("retry-after"));
      await sleep(after > 0 ? after * 1000 : 1000 * 2 ** (i - 1));
      continue;
    }
    // The service's own reason, where it gave one, so a refused page says why; it never holds
    // the key, which went only in a header.
    const reason = await res.text().then((body) => {
      try {
        const detail = JSON.parse(body)?.detail;
        return typeof detail === "string" ? detail : JSON.stringify(detail ?? body);
      } catch {
        return body;
      }
    }, () => "");
    throw new Error(`${SERVICE.name} answered ${res.status}${reason ? `: ${reason.slice(0, 300)}` : ""}`);
  }
}
