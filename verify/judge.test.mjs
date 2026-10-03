// The one file that names a judge: how a request becomes TypeSafe's wire shape, how its answers
// come back, and what a refusal, a rate limit and a failure do. A fake fetch stands in for the
// service; nothing here reaches the network.
import test from "node:test";
import assert from "node:assert/strict";
import { SERVICE, toWire, fromWire, ask, KeyRefused } from "../bin/judges/typesafe.mjs";

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
const reply = (status, json, headers = {}) => ({ ok: status < 300, status, headers: new Headers(headers), json: async () => json });

test("a rule is a noul carrying the rule verbatim, a bullet a choice over the options, on the pinned model", () => {
  const wire = toWire(request);
  assert.equal(wire.model, SERVICE.model);
  assert.deepEqual(wire.state, request.state);
  assert.equal(wire.questions.r1.type, "noul");
  assert.equal(wire.questions.r1.instructions.rule, "Every entry in `skills:` is one the body shows.");
  assert.match(wire.questions.r1.criteria.true, /including where the rule does not apply/);
  assert.equal(wire.questions.g1.type, "choice");
  assert.equal(wire.questions.g1.instructions.bullet, "Split a service.");
  assert.deepEqual(wire.questions.g1.criteria, request.questions[1].options);
});

test("the answers come back in the module's own shape, and a missing one is refused", () => {
  assert.deepEqual(fromWire(request, body), { r1: { p: 0.83 }, g1: { pick: "Delivery", probabilities: { Delivery: 0.9, Results: 0.1 } } });
  assert.throws(() => fromWire(request, { answers: { r1: body.answers.r1 } }), /gave no choice for g1/);
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
