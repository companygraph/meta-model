// The one file that names a judge: how a request becomes TypeSafe's wire shape, how its answers
// come back, and what a refusal, a rate limit and a failure do. A fake fetch stands in for the
// service; nothing here reaches the network.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { SERVICE, toWire, fromWire, ask, KeyRefused, REQUEST_BUDGET, digestOf, forecastOf, costOf, CHARS_PER_TOKEN } from "../bin/judges/typesafe.mjs";

const request = {
  path: "a.md", type: "experience", name: "A", state: { purpose: "P.", entity: "# A\n" },
  questions: [
    { id: "r1", kind: "rule", rule: "Every entry in `skills:` is one the body shows." },
    { id: "g1", kind: "group", section: "Achievements", heading: "Delivery", bullet: "Split a service.", options: { Delivery: { summary: "Built." }, Results: { summary: "Measured." } } },
  ],
};
const body = { model: "jev-1.13.0", answers: {
  r1: { type: "noul", noul: 0.83 },
  g1: { type: "choice", choice: "Delivery", probabilities: { Delivery: 0.9, Results: 0.1 }, confidence: 0.8 },
} };
const reply = (status, json, headers = {}) => ({ ok: status < 300, status, headers: new Headers(headers), json: async () => json, text: async () => JSON.stringify(json) });

test("a rule is a noul carrying the rule verbatim, a bullet a choice over the options, on the pinned model", () => {
  const wire = toWire(request);
  assert.equal(wire.model, SERVICE.model);
  assert.deepEqual(wire.state, request.state);
  assert.equal(wire.questions.r1.type, "noul");
  assert.equal(wire.questions.r1.instructions.rule, "Every entry in `skills:` is one the body shows.");
  assert.match(wire.questions.r1.criteria.true, /including where the rule does not apply/);
  assert.doesNotMatch(wire.questions.g1.instructions.question, /chiefly/, "the wording is any grouped section's, not the achievements' alone");
  assert.match(wire.questions.g1.instructions.question, /## Achievements/);
  assert.equal(wire.questions.g1.type, "choice");
  assert.equal(wire.questions.g1.instructions.bullet, "Split a service.");
  assert.deepEqual(wire.questions.g1.criteria, request.questions[1].options);
});

test("the answers come back in the module's own shape, and a missing one is refused", () => {
  assert.deepEqual(fromWire(request, body), { r1: { p: 0.83 }, g1: { pick: "Delivery", probabilities: { Delivery: 0.9, Results: 0.1 } } });
  assert.throws(() => fromWire(request, { answers: { r1: body.answers.r1 } }), /gave no choice for g1/);
});

test("the digest covers what would be sent and nothing else: the place, the model and every page's request", () => {
  const other = { ...request, path: "b.md", state: { purpose: "P.", entity: "# B\n" } };
  const at = { url: "https://api.example/v1/systemone", model: "jev-x" };
  const d = digestOf([request, other], at);
  assert.match(d, /^[0-9a-f]{16}$/);
  assert.equal(digestOf([other, request], at), d, "the order pages are read in does not move it");
  assert.notEqual(digestOf([request, { ...other, state: { ...other.state, entity: "# B\nedited\n" } }], at), d, "an edited page moves it");
  assert.notEqual(digestOf([request, { ...other, questions: [{ id: "r1", kind: "rule", rule: "Another rule." }] }], at), d, "a changed rule moves it");
  assert.notEqual(digestOf([request], at), d, "a page left out moves it");
  assert.notEqual(digestOf([request, other], { ...at, url: "https://elsewhere.example/v1/systemone" }), d, "another place moves it");
  assert.notEqual(digestOf([request, other], { ...at, url: "http://api.example/v1/systemone" }), d, "another scheme on the same host moves it");
  assert.notEqual(digestOf([request, other], { ...at, url: "https://api.example/other" }), d, "another path on the same host moves it");
  assert.notEqual(digestOf([request, other], { ...at, model: "jev-y" }), d, "another model moves it");
});

test("the forecast counts the requests as they are sent, split ones included, and prices only the input", () => {
  const options = Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`Kind ${i}`, { summary: "x".repeat(700) }]));
  const big = { ...request, path: "big.md", questions: Array.from({ length: 60 }, (_, i) => ({ id: `g${i + 1}`, kind: "group", section: "Achievements", heading: "Kind 0", bullet: `Bullet ${i}.`, options })) };
  const small = forecastOf([request]);
  assert.equal(small.requests, 1);
  assert.equal(small.tokens, Math.ceil(JSON.stringify(toWire(request)).length / CHARS_PER_TOKEN));
  const both = forecastOf([request, big]);
  assert.ok(both.requests > 2, "the large page is sent in several requests");
  assert.ok(both.tokens > small.tokens + Math.ceil(JSON.stringify(toWire(big)).length / CHARS_PER_TOKEN), "each split request carries the whole state again");
  assert.equal(both.usd, costOf(both.tokens));
  assert.equal(SERVICE.usdPerMtok, 0.042);
  assert.equal(costOf(1_000_000), 0.042);
});

test("every answer's usage is handed to the caller, one call per request sent", async () => {
  const seen = [];
  await ask(request, { key: "k", onUsage: (u) => seen.push(u), fetch: async () => reply(200, { ...body, usage: { input_tokens: 296, output_tokens: 20 } }) });
  assert.deepEqual(seen, [{ input_tokens: 296, output_tokens: 20 }]);
});

test("a rate limit is retried after the time the service asks for, then answered", async () => {
  const waits = [];
  const replies = [reply(429, {}, { "retry-after": "2" }), reply(529, {}), reply(200, body)];
  const sent = [];
  const answers = await ask(request, {
    key: "sk-secret",
    fetch: async (url, init) => { sent.push({ url, init }); return /** @type {any} */ (replies.shift()); },
    sleep: async (ms) => { waits.push(ms); },
  });
  assert.deepEqual(waits, [2000, 2000]);
  assert.equal(sent.length, 3);
  assert.equal(sent[0].init.headers.authorization, "Bearer sk-secret");
  assert.equal(JSON.parse(sent[0].init.body).model, "jev-1.13.0");
  assert.equal(answers.r1.p, 0.83);
});

test("a refused key stops with its own error, a failure names the status, and neither carries the key", async () => {
  await assert.rejects(ask(request, { key: "sk-secret", fetch: async () => reply(401, {}) }), (e) => e instanceof KeyRefused && !e.message.includes("sk-secret"));
  await assert.rejects(ask(request, { key: "sk-secret", fetch: async () => reply(500, {}) }), (e) => /TypeSafe answered 500/.test(e.message) && !e.message.includes("sk-secret"));
  await assert.rejects(ask(request, { key: "sk-secret", fetch: async () => reply(429, {}), sleep: async () => {}, attempts: 2 }), /TypeSafe answered 429/);
});
// fileURLToPath, not `.pathname`: on Windows a URL's pathname is `/C:/…`, which no process can run.
const cli = fileURLToPath(new URL("../bin/companygraph.mjs", import.meta.url));
const fresh = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "companygraph-judge-"));
  execFileSync(process.execPath, [cli, "init", root, "--name", "Acme", "--agent", "claude", "--no-hook"], { encoding: "utf8" });
  return root;
};
const withoutKey = () => {
  const env = { ...process.env };
  delete env.TYPESAFE_API_KEY;
  delete env.COMPANYGRAPH_TYPESAFE_URL;
  return env;
};
// Spawned, never execFileSync: the fake service below answers on this process's event loop,
// which a synchronous child would block.
const judge = (root, { input = "", env, args = [] }) => new Promise((done, fail) => {
  const child = spawn(process.execPath, [cli, "judge", root, ...args], { env });
  let out = "", err = "";
  child.stdout.on("data", (d) => (out += d));
  child.stderr.on("data", (d) => (err += d));
  child.on("error", fail);
  child.on("close", (code) => done({ code, out, err }));
  child.stdin.end(input);
});
const digestIn = (out) => out.match(/^digest: ([0-9a-f]{16})$/m)?.[1];
// A fake TypeSafe: every noul answered 0.9, every choice its first option.
const service = async (status = 200) => {
  const seen = [];
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (d) => (raw += d));
    req.on("end", () => {
      const body = JSON.parse(raw);
      seen.push({ auth: req.headers.authorization, body });
      const answers = Object.fromEntries(Object.entries(body.questions).map(([id, q]) => [id, q.type === "noul"
        ? { type: "noul", noul: 0.9 }
        : { type: "choice", choice: Object.keys(q.criteria)[0], probabilities: {}, confidence: 1 }]));
      res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify({ model: "jev-1.13.0", answers, usage: { input_tokens: 1000, output_tokens: 10 } }));
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { url: `http://127.0.0.1:${server.address().port}/v1/systemone`, seen, close: () => server.close() };
};

test("with no key, judge prints the questions and sends nothing", async () => {
  const { code, out } = await judge(fresh(), { env: withoutKey() });
  assert.equal(code, 0);
  assert.match(out, /^judge: \d+ questions about \d+ pages of /m);
  assert.match(out, /^model\/identity\.md$/m);
  assert.match(out, /^ {2}r1 {2}\S/m);
  assert.match(out, /^This would send these files of model\/, whole, with the purposes of their schemas, to TypeSafe \(https:\/\/api\.typesafe\.ai\/v1\/systemone, jev-1\.13\.0\), about \d+ input tokens in \d+ requests, about USD \d+\.\d{3}:$/m);
  assert.match(out, /^ {2}model\/identity\.md$/m);
  assert.ok(digestIn(out), "the keyless run prints the digest");
  assert.match(out, /no TYPESAFE_API_KEY: nothing was sent/);
});

test("with no key, judge lists the rules it would leave out, and why", async () => {
  const root = fresh();
  fs.mkdirSync(path.join(root, "model", "concepts"), { recursive: true });
  fs.writeFileSync(path.join(root, "model", "concepts", "term.md"), "---\nid: 01a0c25c-19f8-7ccf-b892-f4144684c95f\nsource: Local\n---\n\n# Term\n\n> A word the company uses.\n");
  const { code, out } = await judge(root, { env: withoutKey() });
  assert.equal(code, 0);
  assert.match(out, /^left out, for want of what they are about:$/m);
  assert.match(out, /^ {2}concept r3: not asked of 1 without an `As` column$/m);
});

test("with a key, judge names the service and every file, and sends nothing without a typed yes", async () => {
  const fake = await service();
  try {
    for (const input of ["", "n\n", "no\n"]) {
      const { code, out } = await judge(fresh(), { input, env: { ...withoutKey(), TYPESAFE_API_KEY: "sk-secret", COMPANYGRAPH_TYPESAFE_URL: fake.url } });
      assert.equal(code, 0);
      assert.ok(out.includes(`to TypeSafe (${fake.url}, jev-1.13.0)`), "it names the endpoint it would send to, not the one it usually does");
      assert.match(out, /^ {2}model\/identity\.md$/m);
      assert.match(out, /Nothing was sent\./);
      assert.ok(!out.includes("sk-secret"));
    }
    assert.equal(fake.seen.length, 0);
  } finally {
    fake.close();
  }
});

test("on a yes, judge sends one request per page with the key and prints the advisory report", async () => {
  const fake = await service();
  try {
    const { code, out } = await judge(fresh(), { input: "y\n", env: { ...withoutKey(), TYPESAFE_API_KEY: "sk-secret", COMPANYGRAPH_TYPESAFE_URL: fake.url } });
    assert.equal(code, 0, out);
    assert.ok(fake.seen.length > 0);
    assert.ok(fake.seen.every((s) => s.auth === "Bearer sk-secret" && s.body.model === "jev-1.13.0"));
    assert.match(out, /^judge: advisory/m);
    assert.match(out, new RegExp(`^sent: ${fake.seen.length} requests, ${fake.seen.length * 1000} input tokens, USD \\d+\\.\\d{3}, against a forecast of USD \\d+\\.\\d{3}$`, "m"));
    assert.match(out, /^not asked:$/m);
    assert.ok(!out.includes("✓") && !out.includes("sk-secret"));
  } finally {
    fake.close();
  }
});

test("a refused key stops the run with one sentence and no report", async () => {
  const fake = await service(401);
  try {
    const { code, out, err } = await judge(fresh(), { input: "y\n", env: { ...withoutKey(), TYPESAFE_API_KEY: "sk-wrong", COMPANYGRAPH_TYPESAFE_URL: fake.url } });
    assert.equal(code, 1);
    assert.match(err, /^TypeSafe refused the key in TYPESAFE_API_KEY; no report\.$/m);
    assert.doesNotMatch(out, /judge: advisory/);
  } finally {
    fake.close();
  }
});

test("a page the service fails is named under not asked, and the run goes on", async () => {
  const fake = await service(500);
  try {
    const { code, out } = await judge(fresh(), { input: "y\n", env: { ...withoutKey(), TYPESAFE_API_KEY: "sk-secret", COMPANYGRAPH_TYPESAFE_URL: fake.url } });
    assert.equal(code, 0);
    assert.match(out, /^ {2}model\/identity\.md: TypeSafe answered 500(: .+)?$/m);
  } finally {
    fake.close();
  }
});

test("judge outside an instance cannot run, and says why", async () => {
  const { code, err } = await judge(fs.mkdtempSync(path.join(os.tmpdir(), "companygraph-judge-")), { env: withoutKey() });
  assert.equal(code, 1);
  // The error's own words: the usage text says "a repository that is not an instance" too.
  assert.match(err, /is not an instance: it has no \.companygraph\/manifest\.json/);
});

test("a page whose questions outgrow one request is sent in several, each with the whole state, and the answers merged", async () => {
  const options = Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`Kind ${i}`, { summary: "x".repeat(700) }]));
  const big = { ...request, questions: Array.from({ length: 60 }, (_, i) => ({ id: `g${i + 1}`, kind: "group", section: "Achievements", heading: "Kind 0", bullet: `Bullet ${i}.`, options })) };
  assert.ok(JSON.stringify(toWire(big)).length > REQUEST_BUDGET, "the fixture is larger than one request");
  const sent = [];
  const answers = await ask(big, { key: "k", fetch: async (url, init) => {
    const wire = JSON.parse(init.body);
    sent.push(wire);
    const answered = Object.fromEntries(Object.keys(wire.questions).map((id) => [id, { type: "choice", choice: "Kind 0", probabilities: { "Kind 0": 1 } }]));
    return reply(200, { answers: answered });
  } });
  assert.ok(sent.length > 1);
  assert.ok(sent.every((w) => JSON.stringify(w).length <= REQUEST_BUDGET && w.state.entity === big.state.entity));
  assert.deepEqual(Object.keys(answers).sort(), big.questions.map((q) => q.id).sort());
});

test("a refusal carries the service's own reason, never the key", async () => {
  const refusal = { ok: false, status: 422, headers: new Headers(), json: async () => ({}), text: async () => JSON.stringify({ detail: "questions.g1.criteria: at most 255 options" }) };
  await assert.rejects(ask(request, { key: "sk-secret", fetch: async () => refusal }),
    (e) => /TypeSafe answered 422: .*at most 255 options/.test(e.message) && !e.message.includes("sk-secret"));
});

test("a network error is retried like an overload", async () => {
  const waits = [];
  let calls = 0;
  const answers = await ask(request, { key: "k", sleep: async (ms) => { waits.push(ms); }, fetch: async () => {
    if (++calls === 1) throw new TypeError("fetch failed");
    return reply(200, body);
  } });
  assert.equal(calls, 2);
  assert.deepEqual(waits, [1000]);
  assert.equal(answers.r1.p, 0.83);
});

test("a wait longer than a minute is not waited out, and the page says what was asked", async () => {
  const waits = [];
  await assert.rejects(ask(request, { key: "k", sleep: async (ms) => { waits.push(ms); }, fetch: async () => reply(429, {}, { "retry-after": "3600" }) }),
    /TypeSafe asked to wait 3600 s/);
  assert.deepEqual(waits, []);
});

test("a send to TypeSafe itself takes a yes typed at a terminal, never a piped one", async () => {
  const env = { ...withoutKey(), TYPESAFE_API_KEY: "sk-not-a-real-key" };
  const { code, out } = await judge(fresh(), { input: "y\n", env });
  assert.equal(code, 0);
  assert.match(out, /sends only on a yes typed at a terminal/);
  assert.match(out, /Nothing was sent\./);
  assert.doesNotMatch(out, /judge: advisory/);
  assert.match(out, new RegExp(`^Ask the owner, showing the files above and this digest; on their yes, pass --consent ${digestIn(out)}\\.$`, "m"));
});

test("the digest a run without a key prints is the one a run with a key accepts, and it sends with no terminal and no typed yes", async () => {
  const fake = await service();
  try {
    const root = fresh();
    const env = { ...withoutKey(), COMPANYGRAPH_TYPESAFE_URL: fake.url };
    const shown = digestIn((await judge(root, { env })).out);
    assert.ok(shown);
    const { code, out } = await judge(root, { args: ["--consent", shown], env: { ...env, TYPESAFE_API_KEY: "sk-secret" } });
    assert.equal(code, 0, out);
    assert.ok(fake.seen.length > 0);
    assert.match(out, /^judge: advisory/m);
    assert.doesNotMatch(out, /Send them\?/);
  } finally {
    fake.close();
  }
});

test("a digest copied with a space or in capitals is the same consent", async () => {
  const fake = await service();
  try {
    const root = fresh();
    const env = { ...withoutKey(), COMPANYGRAPH_TYPESAFE_URL: fake.url, TYPESAFE_API_KEY: "sk-secret" };
    const shown = digestIn((await judge(root, { env })).out);
    const { code, out } = await judge(root, { args: ["--consent", ` ${shown.toUpperCase()} `], env });
    assert.equal(code, 0, out);
    assert.ok(fake.seen.length > 0);
  } finally {
    fake.close();
  }
});

test("a page edited after the digest was shown refuses, names the new digest and sends nothing", async () => {
  const fake = await service();
  try {
    const root = fresh();
    const env = { ...withoutKey(), COMPANYGRAPH_TYPESAFE_URL: fake.url, TYPESAFE_API_KEY: "sk-secret" };
    const shown = digestIn((await judge(root, { env })).out);
    const page = path.join(root, "model", "identity.md");
    fs.appendFileSync(page, "\nOne more line.\n");
    const { code, out, err } = await judge(root, { args: ["--consent", shown], env });
    assert.equal(code, 1);
    const now = digestIn(out);
    assert.ok(now && now !== shown);
    assert.match(err, new RegExp(`^What would be sent has changed since the consent for ${shown}: its digest is now ${now}\\. Nothing was sent\\.$`, "m"));
    assert.equal(fake.seen.length, 0);
    assert.doesNotMatch(out, /judge: advisory/);
  } finally {
    fake.close();
  }
});

test("a consent given for one endpoint does not send to another", async () => {
  const one = await service();
  const two = await service();
  try {
    const root = fresh();
    const shown = digestIn((await judge(root, { env: { ...withoutKey(), COMPANYGRAPH_TYPESAFE_URL: one.url } })).out);
    const { code } = await judge(root, { args: ["--consent", shown], env: { ...withoutKey(), COMPANYGRAPH_TYPESAFE_URL: two.url, TYPESAFE_API_KEY: "sk-secret" } });
    assert.equal(code, 1);
    assert.equal(one.seen.length + two.seen.length, 0);
  } finally {
    one.close();
    two.close();
  }
});

test("a consent given for one path on a host does not send to another path on it", async () => {
  const fake = await service();
  try {
    const root = fresh();
    const shown = digestIn((await judge(root, { env: { ...withoutKey(), COMPANYGRAPH_TYPESAFE_URL: fake.url } })).out);
    const elsewhere = fake.url.replace("/v1/systemone", "/v1/other");
    const { code, out } = await judge(root, { args: ["--consent", shown], env: { ...withoutKey(), COMPANYGRAPH_TYPESAFE_URL: elsewhere, TYPESAFE_API_KEY: "sk-secret" } });
    assert.equal(code, 1);
    assert.ok(out.includes(elsewhere), "the run names the whole endpoint it would send to");
    assert.equal(fake.seen.length, 0);
  } finally {
    fake.close();
  }
});

test("a consent that is not a digest is refused as one, before anything is compared or sent", async () => {
  const fake = await service();
  try {
    const root = fresh();
    const { code, err } = await judge(".", { args: ["--consent", root], env: { ...withoutKey(), COMPANYGRAPH_TYPESAFE_URL: fake.url, TYPESAFE_API_KEY: "sk-secret" } });
    assert.equal(code, 1);
    assert.match(err, /^--consent takes the 16 hex characters of a digest judge printed, not .+$/m);
    assert.equal(fake.seen.length, 0);
  } finally {
    fake.close();
  }
});

test("--consent with no value refuses before anything is read, and with no key nothing is sent", async () => {
  const bare = await judge(fresh(), { args: ["--consent"], env: withoutKey() });
  assert.equal(bare.code, 1);
  assert.match(bare.err, /--consent needs a value/);
  const root = fresh();
  const shown = digestIn((await judge(root, { env: withoutKey() })).out);
  const keyless = await judge(root, { args: ["--consent", shown], env: withoutKey() });
  assert.equal(keyless.code, 0);
  assert.match(keyless.out, /no TYPESAFE_API_KEY: nothing was sent/);
});

const measure = fileURLToPath(new URL("../tools/measure-judge.mjs", import.meta.url));
const measured = (env, args = []) => new Promise((done, fail) => {
  const child = spawn(process.execPath, [measure, ...args], { env });
  let out = "", err = "";
  child.stdout.on("data", (d) => (out += d));
  child.stderr.on("data", (d) => (err += d));
  child.on("error", fail);
  child.on("close", (code) => done({ code, out, err }));
});

test("the measuring asks in judge's own shape, a whole page per request, and prints both curves", async () => {
  const fake = await service();
  try {
    const { code, out } = await measured({ ...withoutKey(), TYPESAFE_API_KEY: "k", COMPANYGRAPH_TYPESAFE_URL: fake.url });
    assert.equal(code, 0, out);
    assert.ok(fake.seen.length > 0);
    assert.ok(fake.seen.every((s) => Object.keys(s.body.questions).filter((id) => id.startsWith("r")).length > 1), "every request carries all of a page's rules");
    assert.match(out, /^rules: /m);
    assert.match(out, /^choices: /m);
    assert.match(out, /^failed: 0 requests$/m);
  } finally {
    fake.close();
  }
});

test("a failing request is counted and the measuring still prints what it has", async () => {
  const fake = await service(500);
  try {
    const { code, out } = await measured({ ...withoutKey(), TYPESAFE_API_KEY: "k", COMPANYGRAPH_TYPESAFE_URL: fake.url });
    assert.equal(code, 0, out);
    assert.match(out, /^failed: [1-9]\d* requests/m);
    assert.match(out, /^rules: /m);
  } finally {
    fake.close();
  }
});

test("the measuring reads the instances it is named, and says per fault how often the judge caught it", async () => {
  // An instance holding the example's model, with one tagline marked, so what was sent can be traced to it.
  const root = fresh();
  fs.rmSync(path.join(root, "model"), { recursive: true });
  fs.cpSync(fileURLToPath(new URL("../example/model", import.meta.url)), path.join(root, "model"), { recursive: true });
  const page = path.join(root, "model/profiles/mira-halvorsen/experiences/2022-beacon-systems.md");
  fs.writeFileSync(page, fs.readFileSync(page, "utf8").replace("> Ongoing. Taking one service", "> Ongoing. MARKED: taking one service"));
  const fake = await service();
  try {
    const { code, out } = await measured({ ...withoutKey(), TYPESAFE_API_KEY: "k", COMPANYGRAPH_TYPESAFE_URL: fake.url }, [root]);
    assert.equal(code, 0, out);
    assert.ok(fake.seen.some((s) => s.body.state.entity.includes("MARKED")), "the named instance's pages were sent");
    assert.match(out, new RegExp(`over ${root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    for (const name of ["a stack listed as an achievement", "a skill the body does not show", "a bullet under a kind it is not chiefly evidence of", "a running period whose tagline does not say so"])
      assert.match(out, new RegExp(`^ {2}${name}: \\d+ pages, caught on \\d+, clean mean \\d\\.\\d\\d, faulted mean \\d\\.\\d\\d$`, "m"));
  } finally {
    fake.close();
  }
});
