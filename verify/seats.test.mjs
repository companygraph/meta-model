import test from "node:test";
import assert from "node:assert/strict";
import { seatAddress, domainOf, governingOf, judgeCommit, tally, renderReport } from "../lib/seats.mjs";

// The example instance's shape, as parseInstance returns it, holding only what the judge reads.
const entities = [
  { id: "identity", type: "identity", name: "Beacon Systems", fields: { url: "https://www.Beacon.example/about", email: "Hello@beacon.example" }, owner: null },
  { id: "roles/backend-engineer", type: "role", name: "Backend Engineer", fields: {}, owner: null },
  { id: "roles/reviewer", type: "role", name: "Reviewer", fields: {}, owner: null },
  { id: "processes/delivery", type: "process", name: "Delivery", fields: {}, owner: null },
  { id: "processes/delivery/phases/specify", type: "phase", name: "Specify", fields: { "executed-by": ["Backend Engineer"] }, owner: "processes/delivery" },
  { id: "processes/delivery/phases/build", type: "phase", name: "Build", fields: { "executed-by": ["Backend Engineer", "Reviewer"] }, owner: "processes/delivery" },
  { id: "processes/delivery/tracks/code", type: "track", name: "Code", fields: {}, owner: "processes/delivery" },
  { id: "processes/support", type: "process", name: "Support", fields: {}, owner: null },
  { id: "processes/support/phases/answer", type: "phase", name: "Answer", fields: { "executed-by": "Reviewer" }, owner: "processes/support" },
];
const governing = governingOf({ entities });
const t = (process, phase, track) => ({ process: process ? [process] : [], phase: phase ? [phase] : [], track: track ? [track] : [] });

test("a seat's address is its role in lower case, hyphenated, at the domain", () => {
  assert.equal(seatAddress("Backend Engineer", "beacon.example"), "backend-engineer@beacon.example");
  assert.equal(seatAddress("  Quality   Lead ", "x.io"), "quality-lead@x.io");
});

test("the domain is the url's host, lower-cased, without www", () => {
  assert.equal(domainOf("https://www.Beacon.example/about"), "beacon.example");
  assert.equal(domainOf("https://blust.ch"), "blust.ch");
  assert.equal(domainOf("not a url"), null);
  assert.equal(governing.domain, "beacon.example");
});

test("an identity with no url has no seats, and every author but the owner is outside", () => {
  const none = governingOf({ entities: [{ id: "identity", type: "identity", name: "X", fields: { email: "o@x.io" }, owner: null }] });
  assert.equal(none.domain, null);
  assert.equal(judgeCommit(none, { email: "implementer@x.io", trailers: t() }).kind, "outside");
  assert.equal(judgeCommit(none, { email: "o@x.io", trailers: t() }).kind, "owner");
});

test("a seat the phase lists passes, whatever the address's case", () => {
  const j = judgeCommit(governing, { email: "Backend-Engineer@BEACON.example", trailers: t("Delivery", "Build", "Code") });
  assert.deepEqual([j.kind, j.seat, j.failures], ["seat", "Backend Engineer", []]);
});

test("the owner passes without trailers, and so does any other domain", () => {
  assert.equal(judgeCommit(governing, { email: "hello@beacon.example", trailers: t() }).kind, "owner");
  const bot = judgeCommit(governing, { email: "49699333+dependabot[bot]@users.noreply.github.com", trailers: t() });
  assert.deepEqual([bot.kind, bot.failures], ["outside", []]);
});

test("a seat the phase does not list is refused, naming who does", () => {
  const j = judgeCommit(governing, { email: "reviewer@beacon.example", trailers: t("Delivery", "Specify", "Code") });
  assert.deepEqual(j.failures, ["Reviewer does not execute Specify in Delivery; its executed-by is Backend Engineer"]);
});

test("an address at the domain that is no role is refused", () => {
  assert.deepEqual(judgeCommit(governing, { email: "intern@beacon.example", trailers: t("Delivery", "Build", "Code") }).failures,
    ["intern@beacon.example is at beacon.example and names no role of Beacon Systems"]);
});

test("missing trailers are refused, and the refusal says where git reads them", () => {
  const j = judgeCommit(governing, { email: "reviewer@beacon.example", trailers: t() });
  assert.equal(j.failures.length, 2);
  for (const f of j.failures) assert.match(f, /last paragraph/);
});

test("an unknown process, phase or track is refused by name", () => {
  assert.deepEqual(judgeCommit(governing, { email: "reviewer@beacon.example", trailers: t("Shipping", "Build", "Code") }).failures, ["Process: Shipping is no process of Beacon Systems"]);
  assert.deepEqual(judgeCommit(governing, { email: "reviewer@beacon.example", trailers: t("Delivery", "Deploy", "Code") }).failures, ["Phase: Deploy is no phase of Delivery"]);
  assert.deepEqual(judgeCommit(governing, { email: "reviewer@beacon.example", trailers: t("Delivery", "Build", "Ops") }).failures, ["Track: Ops is no track of Delivery"]);
});

test("a track is required where the process has tracks and refused where it has none", () => {
  assert.deepEqual(judgeCommit(governing, { email: "reviewer@beacon.example", trailers: t("Delivery", "Build") }).failures, ["it has no Track trailer, and Delivery runs on Code"]);
  assert.deepEqual(judgeCommit(governing, { email: "reviewer@beacon.example", trailers: t("Support", "Answer", "Code") }).failures, ["Track: Code is given, and Support has no tracks"]);
  assert.deepEqual(judgeCommit(governing, { email: "reviewer@beacon.example", trailers: t("Support", "Answer") }).failures, []);
});

test("a trailer given twice is refused", () => {
  const j = judgeCommit(governing, { email: "reviewer@beacon.example", trailers: { process: ["Delivery"], phase: ["Build", "Specify"], track: ["Code"] } });
  assert.deepEqual(j.failures, ["it names a Phase twice: Build, Specify"]);
});

test("the tally counts seats by where they worked, and the rest by kind", () => {
  const seat = (phase) => ({ kind: "seat", seat: "Backend Engineer", process: "Delivery", phase, track: "Code", failures: [] });
  const judged = [
    { repo: "a/b", email: "backend-engineer@beacon.example", judgement: seat("Build") },
    { repo: "a/b", email: "backend-engineer@beacon.example", judgement: seat("Build") },
    { repo: "a/b", email: "backend-engineer@beacon.example", judgement: seat("Specify") },
    { repo: "a/b", email: "hello@beacon.example", judgement: { kind: "owner", failures: [] } },
    { repo: "a/b", email: "x@y.z", judgement: { kind: "outside", failures: [] } },
    { repo: "a/b", email: "intern@beacon.example", judgement: { kind: "seat", seat: null, failures: ["no role"] } },
  ];
  const r = tally(judged);
  assert.deepEqual(r.seats, [{ seat: "Backend Engineer", email: "backend-engineer@beacon.example", commits: 3,
    by: [{ where: "Delivery · Build · Code", commits: 2 }, { where: "Delivery · Specify · Code", commits: 1 }] }]);
  assert.deepEqual([r.owner, r.outside, r.refused], [1, 1, 1]);
});

// Ruling: in the report alone, a commit whose author's name equals the identity's own name is the
// owner's, case-insensitively and trimmed — a commit made before the rule, under the person's own
// name and whatever address that day, which judgeCommit itself never sees this leniency, so a
// hook or CI would still refuse it were it made now.
test("the tally counts a commit by the identity's own name as the owner's, whatever kind judgeCommit gave it", () => {
  const outside = { kind: "outside", failures: [] };
  const refused = { kind: "seat", seat: null, failures: ["no role"] };
  const judged = [
    { email: "robert@personal.example", name: "Beacon Systems", ownerName: "Beacon Systems", judgement: outside },
    { email: "intern@beacon.example", name: "  beacon SYSTEMS  ", ownerName: "Beacon Systems", judgement: refused },
    { email: "x@y.z", name: "Someone Else", ownerName: "Beacon Systems", judgement: outside },
    { email: "y@y.z", name: undefined, ownerName: "Beacon Systems", judgement: outside },
  ];
  const r = tally(judged);
  assert.deepEqual([r.owner, r.outside, r.refused], [2, 2, 0]);
  assert.deepEqual(r.seats, []);
});

test("the rendered report says its scope, its start and what it did not read", () => {
  const text = renderReport({ scope: "family", since: null, read: ["a/b"], unread: [{ repo: "a/c", path: "/nowhere/c" }], ...tally([]) });
  assert.match(text, /across the family, 1 of 2 members read, since the first commit/);
  assert.match(text, /not read, no clone at \/nowhere\/c: a\/c/);
  assert.match(text, /no commit is authored by a seat yet/);
  assert.match(text, /counted as the owner's/);
  const other = renderReport({ scope: "family", since: null, read: [], unread: [{ repo: "a/d", path: "/here/d", reason: "no instance of its organization on this disk" }], ...tally([]) });
  assert.match(other, /not read, no instance of its organization on this disk: a\/d/);
  assert.match(renderReport({ scope: "repository", since: "2026-10-01", read: ["a/b"], unread: [], ...tally([]) }), /in a\/b, since 2026-10-01/);
});
