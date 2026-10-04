// The one place the tooling names a judge: TypeSafe's Jev, over its HTTP API
// (https://docs.typesafe.ai/api). A request of lib/questions.mjs becomes Jev's wire shape here,
// and Jev's answers come back in the module's own, so a second judge is a second file beside
// this one and the questions do not change. The model is pinned rather than `jev-latest`,
// because the band the report flags by is measured against one model, and a newer one is
// measured again before it is named here.
/** @import { Request, Answers } from "../../lib/questions.mjs" */
import { createHash } from "node:crypto";

export const SERVICE = { name: "TypeSafe", model: "jev-1.13.0" };
const URL_DEFAULT = "https://api.typesafe.ai/v1/systemone";

// Where a request goes: TypeSafe, unless COMPANYGRAPH_TYPESAFE_URL points the tests at a fake.
// `judge` names this host before it sends, so the name is the one the key would go to.
export const endpoint = () => new URL(process.env.COMPANYGRAPH_TYPESAFE_URL ?? URL_DEFAULT);

// Whether the endpoint is TypeSafe itself, where a page leaves the machine for real.
export const isTypeSafe = () => endpoint().href === URL_DEFAULT;

// The longest wait a `retry-after` is waited out for; past it, the page fails and says so.
const LONGEST_WAIT = 60_000;

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
          instructions: { bullet: q.bullet, question: `\`bullet\` is a bullet of the page's "## ${q.section}", which groups its bullets under headings that name these options. Under which does it belong?` },
          criteria: q.options };
  return { model: SERVICE.model, state: request.state, questions };
}

// What a yes given away from a terminal covers: the place the pages go, the model that reads
// them, and every request in the shape it leaves in, so an edited page, an upgraded rule or
// another endpoint is another question to ask. Sorted by path, so the order the pages were read
// in does not move it; the key is not in it, so a run without one shows the digest a run with
// one checks.
/**
 * @param {Request[]} requests
 * @param {{ host?: string; model?: string }} [at]
 * @returns {string}
 */
export function digestOf(requests, { host = endpoint().host, model = SERVICE.model } = {}) {
  const sorted = [...requests].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const wire = sorted.map((r) => ({ path: r.path, ...toWire(r), model }));
  return createHash("sha256").update(JSON.stringify({ host, model, wire })).digest("hex").slice(0, 16);
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

// A rate limit (429), an overload (529) and a request that never reached the service are
// retried, after the `retry-after` the service sends or else a doubling wait, as TypeSafe's own
// clients do; a wait past a minute is not waited out. Anything else is the page's failure, and a
// refused key is the run's.
/**
 * @param {Request} request
 * @param {{ key: string; fetch?: typeof globalThis.fetch; sleep?: (ms: number) => Promise<void>; attempts?: number }} options
 * @returns {Promise<Answers>}
 */
async function askOnce(request, { key, fetch = globalThis.fetch, sleep = (ms) => new Promise((done) => setTimeout(done, ms)), attempts = 4 }) {
  const url = endpoint();
  for (let i = 1; ; i++) {
    /** @type {Response} */
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify(toWire(request)),
      });
    } catch (error) {
      if (i >= attempts) throw error;
      await sleep(1000 * 2 ** (i - 1));
      continue;
    }
    if (res.ok) return fromWire(request, await res.json());
    if (res.status === 401) throw new KeyRefused();
    if ((res.status === 429 || res.status === 529) && i < attempts) {
      const after = Number(res.headers.get("retry-after"));
      const wait = after > 0 ? after * 1000 : 1000 * 2 ** (i - 1);
      if (wait > LONGEST_WAIT) throw new Error(`${SERVICE.name} asked to wait ${after} s, longer than a run waits`);
      await sleep(wait);
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
