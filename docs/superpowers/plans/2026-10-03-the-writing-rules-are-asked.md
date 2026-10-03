# The writing rules are asked — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `companygraph judge` turns every writing rule of an instance's vendored schemas into a yes-or-no question about each page, and every bullet of a grouped section into a choice among the entities its headings name, asks TypeSafe's Jev after the person running it says yes, and prints an advisory report that the validate skill reads first.

**Architecture:** A pure module, `lib/questions.mjs`, exported as `companygraph-meta-model/questions`, derives the questions from a parsed instance and its vendored schemas and turns answers into report lines; it opens no socket and names no judge. `bin/judges/typesafe.mjs` is the only file that names a judge: it maps a request to Jev's wire shape, sends it, and maps the answers back. `bin/companygraph.mjs` gains `judge`, which reads the instance through a new `instanceAt` in `lib/history.mjs`, prints what it would send, asks, sends, and prints the report. A fault planter and a measuring script under `tools/` measure calibration by hand, never in CI.

**Tech Stack:** Node 22 ESM with no runtime dependencies (global `fetch`), `node --test`, JSDoc-typed `lib/` and `bin/` with committed declarations under `types/`.

**Spec:** `docs/superpowers/specs/2026-09-26-the-writing-rules-are-asked-design.md` (merged at `981e6ec`, with the owner's three decisions of October 3, 2026).

## Global Constraints

- The questions come from the schemas the instance vendored (`<units>/core/`, and `<units>/<pack>/` for each pack), never from this package's `core/`.
- A rule's question carries the rule's sentence verbatim, its wrapped lines joined with one space. The state is `{ purpose, entity }`: the schema's `## Purpose` and the page's file whole.
- One request per page. Question ids are `r1`…`rn` for rules in schema order, then `g1`…`gm` for grouped bullets in page order.
- A grouped section is found through `constraintsOf`: a reference whose `via` is `<Section>.<Name>` where `<Section>` is one of that type's `lists`. Its options are the instance's entities of the reference's target type, by name, each with its tagline as `summary` and every `##` section of its own that holds no table, by heading.
- The judge is `jev-1.13.0` at `https://api.typesafe.ai/v1/systemone`, pinned, because a measured band belongs to one model. The key is read from `TYPESAFE_API_KEY` and never printed. `COMPANYGRAPH_TYPESAFE_URL` overrides the URL for the tests only, as `COMPANYGRAPH_REMOTES` does for `pins`.
- `judge` with no key prints the questions and sends nothing. With a key it names the service, the model and every file it would send, and sends only on a typed `y`. There is no flag that skips the question.
- `judge` runs in no workflow. The measuring script runs in no workflow either.
- The report gates nothing: `judge` exits 0 whenever it ran, and 1 only when it could not run (no instance, the key refused). No line prints `✓` or reads as a pass. It ends with `not asked:`.
- `BAND` in `lib/questions.mjs` stays `null` in this plan. While it is `null`, the report flags nothing, and lists each page's three lowest rule verdicts and every bullet whose pick differs from its heading, each marked `?` (the owner's decision of October 3, 2026).
- No version bump, no tag and no release notes in this plan: the release is the owner's.
- American English (R14). Code comments follow the surrounding files: prose paragraphs saying why, no bullet lists.
- Commits and PR bodies are prose in the git register: a subject under seventy characters with no type prefix, one to three paragraphs, then `Verified: …` naming what ran, then the trailers. Commits are authored `Implementer <implementer@companygraph.io>` with `Process: Delivery`, `Phase: Implement`, `Track: Code` and the `Co-Authored-By` line naming the model that wrote the commit. After each commit, `git log -1 --format='[%s]'` shows the subject alone.
- Before any `node`, `npm` or `gh`: `export PATH="/opt/homebrew/bin:$PATH"`. Run `npm ci` once in the worktree before the first test.
- `tsconfig.json` checks `lib/` and `bin/` under `strict` and `exactOptionalPropertyTypes`. After any change there, `npm run typecheck` passes and `npm run build` rewrites `types/`, and the rewritten files are committed in the same commit; `npm run build:check` passes before each commit.
- No numbers that move in any prose: no count of rules, entities or types in README or comments.

## Review Focus

- A page larger than Jev reads in one request (32k tokens for state plus the longest question): a person expects it named under `not asked`, not a 422 that loses the run. Task 2 tests it with `STATE_BUDGET`.
- A rate limit (`429`) or an overload (`529`) halfway through a run of a few hundred pages: a person expects a retry with backoff, honoring `retry-after`, and a page that still fails named under `not asked` with the run going on. Task 5 tests the retry, Task 6 the run going on.
- A key that is wrong: a person expects one clear sentence and no report, not a few hundred identical failures, and never the key echoed back. Task 5 tests that the error never carries the key, Task 6 that the run stops with exit 1.
- `judge` with a key in a non-interactive shell, a CI step or a pipe with nothing on it: a person expects nothing sent, since nobody said yes. Task 6 tests end of input as a no.
- An instance that defines no achievement kinds and writes its entries flat, or a bullet written before any `###` heading: a person expects rule questions only, or a choice reported as standing under no heading, never a crash. Task 2 tests the first, Tasks 1 and 3 the second.

---

### Task 1: The rules, the purpose and the bullets, read from text

**Files:**

- Create: `lib/questions.mjs`
- Create: `verify/questions.test.mjs`
- Modify: `package.json` (an `exports` entry and a `test:judge` script)
- Modify: `.github/workflows/ci.yml` (a step in each of the two jobs)
- Modify: `types/` (rebuilt)

**Interfaces:**

- Produces: `writingRulesOf(schemaText: string): string[]`, `purposeOf(schemaText: string): string`, `bulletsOf(sectionText: string): { heading: string | null; bullet: string }[]`, all exported from `lib/questions.mjs`.

- [ ] **Step 1: Write the failing tests**

Create `verify/questions.test.mjs`:

```js
// The writing rules, asked: what lib/questions.mjs reads out of a schema and a page, the
// questions it derives from an instance, and the report it makes of the answers. Nothing here
// reaches a judge; the module opens no socket, so its whole behavior is tested on files.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { writingRulesOf, purposeOf, bulletsOf } from "../lib/questions.mjs";

const schema = (n) => fs.readFileSync(new URL(`../core/${n}-schema.md`, import.meta.url), "utf8");

test("a writing rule is one bullet, its wrapped lines joined with one space", () => {
  const rules = writingRulesOf(schema("experience"));
  const bullets = schema("experience").split("## Writing rules")[1].split("\n").filter((l) => /^- \S/.test(l)).length;
  assert.equal(rules.length, bullets);
  assert.ok(rules.includes("Every entry in `skills:` is one the body shows. A skill listed and not evidenced belongs in the profile's table or nowhere; here it is a claim with nothing under it."));
  assert.ok(rules.every((r) => !r.includes("\n") && !r.includes("  ")));
});

test("a schema without writing rules gives none, and one without a purpose gives an empty one", () => {
  const bare = "# Thing Schema\n\n> A thing.\n\n## Frontmatter\n\n| Field | Required | Type | Description |\n| --- | --- | --- | --- |\n";
  assert.deepEqual(writingRulesOf(bare), []);
  assert.equal(purposeOf(bare), "");
  assert.match(purposeOf(schema("experience")), /^An experience is one dated period/);
});

test("a bullet carries the heading it stands under, or none when it stands before every heading", () => {
  const text = "- Before any heading.\n\n### Delivery\n\n- Split one service into two, so the second\n  team stopped waiting.\n- Another.\n\n### Results\n\n- Measured.";
  assert.deepEqual(bulletsOf(text), [
    { heading: null, bullet: "Before any heading." },
    { heading: "Delivery", bullet: "Split one service into two, so the second team stopped waiting." },
    { heading: "Delivery", bullet: "Another." },
    { heading: "Results", bullet: "Measured." },
  ]);
});
```

In `package.json`, add to `scripts`:

```json
"test:judge": "node --test verify/questions.test.mjs"
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm run test:judge`

Expected: FAIL, `Cannot find module '…/lib/questions.mjs'`.

- [ ] **Step 3: Write the module**

Create `lib/questions.mjs`:

```js
// The writing rules, asked. Every schema in core ends in `## Writing rules`, one sentence each,
// written so that an agent reading a page can check it, and nothing mechanical reaches them: the
// agent pass of R0 reads them, in prose that differs from run to run. This module turns each rule
// into a yes-or-no question about one page, and each bullet of a grouped section into a choice
// among the entities its headings name, and turns the answers into a report. It opens no socket
// and names no judge; `bin/judges/` does both, so a second judge is a second file there and the
// questions do not change.
import { sectionsOf } from "./checks.mjs";

// A rule is a bullet of `## Writing rules`, and a bullet wraps: its continuation lines are
// indented, and they are joined back with one space so the question is the rule's own sentence.
/**
 * @param {string} schemaText
 * @returns {string[]}
 */
export function writingRulesOf(schemaText) {
  const body = sectionsOf(schemaText).get("Writing rules");
  if (body === undefined) return [];
  /** @type {string[]} */
  const rules = [];
  for (const line of body.split("\n")) {
    if (/^[-*]\s+\S/.test(line)) rules.push(line.replace(/^[-*]\s+/, "").trim());
    else if (/^\s+\S/.test(line) && rules.length) rules[rules.length - 1] += ` ${line.trim()}`;
  }
  return rules;
}

// The purpose is what the rules serve, so a judge that reads a rule without it reads less than
// the agent does.
/**
 * @param {string} schemaText
 * @returns {string}
 */
export const purposeOf = (schemaText) => (sectionsOf(schemaText).get("Purpose") ?? "").trim();

// A grouped section's bullets, each with the `###` heading it stands under, or null for one
// written before any heading.
/**
 * @param {string} sectionText
 * @returns {{ heading: string | null; bullet: string }[]}
 */
export function bulletsOf(sectionText) {
  /** @type {{ heading: string | null; bullet: string }[]} */
  const out = [];
  /** @type {string | null} */
  let heading = null;
  for (const line of sectionText.split("\n")) {
    if (line.startsWith("### ")) heading = line.slice(4).trim();
    else if (/^[-*]\s+\S/.test(line)) out.push({ heading, bullet: line.replace(/^[-*]\s+/, "").trim() });
    else if (/^\s+\S/.test(line) && out.length) /** @type {{ bullet: string }} */ (out[out.length - 1]).bullet += ` ${line.trim()}`;
  }
  return out;
}
```

In `package.json`, add to `exports`, after `./localization`:

```json
"./questions": { "types": "./types/lib/questions.d.mts", "default": "./lib/questions.mjs" }
```

In `.github/workflows/ci.yml`, after the step `A model's languages, read` in the `verify` job, and after the step of the same name in the `windows` job, add:

```yaml
      - name: The writing rules are asked, and nothing is sent
        run: npm run test:judge
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm run test:judge`

Expected: PASS, 3 tests.

- [ ] **Step 5: Types, the suite, commit**

Run: `npm run typecheck && npm run build && npm run build:check && npm run verify`

Expected: all pass; `git status` shows `types/lib/questions.d.mts` new.

```bash
git add lib/questions.mjs verify/questions.test.mjs package.json .github/workflows/ci.yml types/
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
The writing rules, a purpose and a section's bullets are read from text

The judge asks each writing rule as its own sentence, so a rule has to be read back whole from a schema whose bullets wrap. The new lib/questions.mjs reads the rules, the purpose they serve and a grouped section's bullets with the heading each stands under, and is exported as companygraph-meta-model/questions.

Verified: npm run test:judge, typecheck, build:check and verify pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: <the model that wrote this commit>
EOF
git log -1 --format='[%s]'
```

---

### Task 2: The questions an instance is asked

**Files:**

- Modify: `lib/questions.mjs`
- Modify: `verify/questions.test.mjs`
- Modify: `types/` (rebuilt)

**Interfaces:**

- Consumes: `writingRulesOf`, `purposeOf`, `bulletsOf` (Task 1); `constraintsOf` from `lib/instance.mjs`; an `InstanceGraph` from `parseInstance`.
- Produces, exported from `lib/questions.mjs`:
  - `STATE_BUDGET: number` (characters; 100000).
  - `questionsOf({ graph, files, schemas }: { graph: InstanceGraph; files: InstanceFiles; schemas: Files }): Questions`.
  - Types: `RuleQuestion = { id: string; kind: "rule"; rule: string }`; `GroupQuestion = { id: string; kind: "group"; section: string; heading: string | null; bullet: string; options: Record<string, Record<string, string>> }`; `Question = RuleQuestion | GroupQuestion`; `Request = { path: string; type: string; name: string; state: { purpose: string; entity: string }; questions: Question[] }`; `NotAsked = { path: string; why: string }`; `Questions = { asked: Request[]; notAsked: NotAsked[] }`.
  - `path` is the entity's path as the parser gives it, relative to the instance's `model/`.

- [ ] **Step 1: Write the failing tests**

Append to `verify/questions.test.mjs`, and add `questionsOf, STATE_BUDGET` to its import from `../lib/questions.mjs`, and `import { parseInstance } from "../lib/instance.mjs";` beside it:

```js
// The example instance, read as `judge` reads one: its pages keyed relative to `model/`, and
// the schemas keyed as parseSchemas reads them.
const exampleFiles = () => {
  const files = new Map();
  const walk = (rel) => {
    for (const entry of fs.readdirSync(new URL(`../example/model/${rel}`, import.meta.url), { withFileTypes: true })) {
      const child = `${rel}${entry.name}`;
      if (entry.isDirectory()) walk(`${child}/`);
      else if (child.endsWith(".md")) files.set(child, fs.readFileSync(new URL(`../example/model/${child}`, import.meta.url), "utf8"));
    }
  };
  walk("");
  return files;
};
const coreSchemas = () => new Map(fs.readdirSync(new URL("../core/", import.meta.url))
  .filter((f) => f.endsWith("-schema.md") || f === "manifest.json")
  .map((f) => [f, fs.readFileSync(new URL(`../core/${f}`, import.meta.url), "utf8")]));
const example = () => {
  const files = exampleFiles(), schemas = coreSchemas();
  return { graph: parseInstance(files, { schemas }), files, schemas };
};
const BEACON = "profiles/mira-halvorsen/experiences/2022-beacon-systems.md";

test("every page is asked every writing rule of its schema, verbatim, with the purpose and the page whole", () => {
  const { asked } = questionsOf(example());
  const page = asked.find((r) => r.path === BEACON);
  const rules = writingRulesOf(schema("experience"));
  assert.deepEqual(page.questions.filter((q) => q.kind === "rule"), rules.map((rule, i) => ({ id: `r${i + 1}`, kind: "rule", rule })));
  assert.equal(page.state.entity, exampleFiles().get(BEACON));
  assert.equal(page.state.purpose, purposeOf(schema("experience")));
  assert.equal(page.type, "experience");
  assert.equal(page.name, "Splitting the billing domain");
});

test("a grouped bullet is a choice among the instance's kinds, each described by its own page", () => {
  const { asked } = questionsOf(example());
  const groups = asked.find((r) => r.path === BEACON).questions.filter((q) => q.kind === "group");
  assert.deepEqual(groups.map((q) => [q.id, q.section, q.heading]), [["g1", "Achievements", "Delivery"], ["g2", "Achievements", "Results"]]);
  assert.match(groups[0].bullet, /^Split one service that three teams edited into two that one team each owns, so the second team/);
  assert.deepEqual(Object.keys(groups[0].options).sort(), ["Decisions", "Delivery", "Results", "Sharing"]);
  assert.match(groups[0].options.Delivery.summary, /^Something built, changed or taken apart/);
  assert.match(groups[0].options.Delivery["What it means"], /^An achievement whose claim is the work done/);
});

test("a table's column is no grouped section, so a profile is asked its rules and nothing else", () => {
  const { asked } = questionsOf(example());
  const profile = asked.find((r) => r.type === "profile");
  assert.ok(profile.questions.length > 0);
  assert.ok(profile.questions.every((q) => q.kind === "rule"));
});

test("an instance with no entities of a grouped heading's type asks no choice for that section", () => {
  const { graph, files, schemas } = example();
  const kindless = { ...graph, entities: graph.entities.filter((e) => e.type !== "achievement-kind") };
  const page = questionsOf({ graph: kindless, files, schemas }).asked.find((r) => r.path === BEACON);
  assert.ok(page.questions.every((q) => q.kind === "rule"));
});

test("a page longer than the judge reads in one request is not asked, and is named", () => {
  const { graph, files, schemas } = example();
  files.set(BEACON, `${files.get(BEACON)}\n${"x".repeat(STATE_BUDGET)}\n`);
  const { asked, notAsked } = questionsOf({ graph, files, schemas });
  assert.ok(!asked.some((r) => r.path === BEACON));
  assert.deepEqual(notAsked.find((n) => n.path === BEACON), { path: BEACON, why: "longer than the judge reads in one request" });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm run test:judge`

Expected: FAIL, `questionsOf` is not exported.

- [ ] **Step 3: Write `questionsOf`**

In `lib/questions.mjs`, add `import { constraintsOf } from "./instance.mjs";` below the existing import, and the type imports and typedefs below the imports:

```js
/** @import { Files, InstanceFiles, InstanceGraph, Entity } from "./instance.mjs" */

/**
 * @typedef {{ id: string; kind: "rule"; rule: string }} RuleQuestion
 * @typedef {{ id: string; kind: "group"; section: string; heading: string | null; bullet: string; options: Record<string, Record<string, string>> }} GroupQuestion
 * @typedef {RuleQuestion | GroupQuestion} Question
 * @typedef {{ path: string; type: string; name: string; state: { purpose: string; entity: string }; questions: Question[] }} Request
 * @typedef {{ path: string; why: string }} NotAsked
 * @typedef {{ asked: Request[]; notAsked: NotAsked[] }} Questions
 */
```

Then append:

```js
// Jev reads 32k tokens of state and longest question in one request. Counted in characters, at
// a conservative four to a token, a page past this is named rather than sent to be refused.
export const STATE_BUDGET = 100_000;

// The grouped sections of each type, read through constraintsOf as any consumer of the
// vocabulary reads them: a reference drawn by a section's heading is named `<Section>.<Name>`,
// and the section is one of the type's lists, which a table's section never is.
/**
 * @param {Files} schemas
 * @returns {Map<string, { section: string; target: string }[]>}
 */
function groupedOf(schemas) {
  /** @type {Map<string, { section: string; target: string }[]>} */
  const out = new Map();
  for (const [type, c] of Object.entries(constraintsOf(schemas))) {
    const lists = new Set(c.lists.map((l) => l.section));
    /** @type {{ section: string; target: string }[]} */
    const groups = [];
    for (const r of c.references) {
      const dot = r.via.indexOf(".");
      if (dot < 0 || !r.target || !lists.has(r.via.slice(0, dot))) continue;
      groups.push({ section: r.via.slice(0, dot), target: r.target });
    }
    out.set(type, groups);
  }
  return out;
}

// The options of a choice: the instance's entities of the target type by name, each described
// by its tagline and by every section of its own that holds no table — for an achievement kind,
// `## What it means`, which says what the kind covers and what it does not.
/**
 * @param {Entity[]} entities
 * @param {string} target
 * @returns {Record<string, Record<string, string>>}
 */
function optionsOf(entities, target) {
  /** @type {Record<string, Record<string, string>>} */
  const out = {};
  for (const e of entities) {
    if (e.type !== target || Object.hasOwn(out, e.name)) continue;
    /** @type {Record<string, string>} */
    const described = { summary: e.tagline };
    for (const s of e.sections) if (!s.tables.length && s.text.trim()) described[s.heading] = s.text.trim();
    out[e.name] = described;
  }
  return out;
}

// The questions an instance is asked, one request per page: every writing rule of the page's
// schema, then every bullet of each grouped section as a choice. The schemas are the instance's
// vendored ones, so a newer tooling never asks a rule the instance has not adopted.
/**
 * @param {{ graph: InstanceGraph; files: InstanceFiles; schemas: Files }} instance
 * @returns {Questions}
 */
export function questionsOf({ graph, files, schemas }) {
  /** @type {Map<string, string>} */
  const schemaOf = new Map();
  for (const [key, text] of schemas)
    if (key.endsWith("-schema.md")) schemaOf.set(key.slice(key.lastIndexOf("/") + 1).replace(/-schema\.md$/, ""), text);
  const grouped = groupedOf(schemas);
  /** @type {Request[]} */
  const asked = [];
  /** @type {NotAsked[]} */
  const notAsked = [];
  for (const e of [...graph.entities].sort((a, b) => (a.path < b.path ? -1 : 1))) {
    const schema = schemaOf.get(e.type) ?? "";
    const text = files.get(e.path);
    /** @type {Question[]} */
    const questions = writingRulesOf(schema).map((rule, i) => ({ id: `r${i + 1}`, kind: /** @type {const} */ ("rule"), rule }));
    let g = 0;
    for (const { section, target } of grouped.get(e.type) ?? []) {
      const s = e.sections.find((x) => x.heading === section);
      const options = optionsOf(graph.entities, target);
      // An instance with none of the target's entities writes the section flat, as the
      // experience schema allows, and a flat list has no heading to set a pick against.
      if (!s || !Object.keys(options).length) continue;
      for (const { heading, bullet } of bulletsOf(s.text))
        questions.push({ id: `g${++g}`, kind: "group", section, heading, bullet, options });
    }
    if (typeof text !== "string" || !questions.length) {
      notAsked.push({ path: e.path, why: "its schema has no writing rules and nothing grouped" });
      continue;
    }
    const state = { purpose: purposeOf(schema), entity: text };
    const longest = Math.max(...questions.map((q) => JSON.stringify(q).length));
    if (state.purpose.length + text.length + longest > STATE_BUDGET) {
      notAsked.push({ path: e.path, why: "longer than the judge reads in one request" });
      continue;
    }
    asked.push({ path: e.path, type: e.type, name: e.name, state, questions });
  }
  return { asked, notAsked };
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm run test:judge`

Expected: PASS, 8 tests.

- [ ] **Step 5: Types, the suite, commit**

Run: `npm run typecheck && npm run build && npm run build:check && npm run verify`

Expected: all pass.

```bash
git add lib/questions.mjs verify/questions.test.mjs types/
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
An instance's pages are each asked their schema's writing rules

questionsOf turns a parsed instance and its vendored schemas into one request per page: every writing rule of the page's schema as a yes-or-no question, and every bullet of a grouped section as a choice among the entities its headings name, read through constraintsOf. A page longer than the judge reads in one request is named rather than sent.

Verified: npm run test:judge, typecheck, build:check and verify pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: <the model that wrote this commit>
EOF
git log -1 --format='[%s]'
```

---

### Task 3: The report

**Files:**

- Modify: `lib/questions.mjs`
- Modify: `verify/questions.test.mjs`
- Modify: `types/` (rebuilt)

**Interfaces:**

- Consumes: `Questions`, `Request`, `Question` (Task 2).
- Produces, exported from `lib/questions.mjs`:
  - Types: `RuleAnswer = { p: number }` (the probability the page keeps the rule); `GroupAnswer = { pick: string; probabilities: Record<string, number> }`; `Answers = Record<string, RuleAnswer | GroupAnswer>` keyed by question id; `Failed = { error: string }`; `Band = { low: number; high: number }`.
  - `BAND: Band | null` (null).
  - `LOWEST: number` (3).
  - `reportOf(questions: Questions, answers: Map<string, Answers | Failed>, options?: { band?: Band | null }): string[]`, keyed by `Request.path`.

- [ ] **Step 1: Write the failing tests**

Append to `verify/questions.test.mjs`, and add `reportOf, BAND, LOWEST` to its import:

```js
// A small asked set, by hand, so each line of the report is pinned to the answer that made it.
const rule = (id, text) => ({ id, kind: "rule", rule: text });
const asked = {
  asked: [
    { path: "a.md", type: "experience", name: "A", state: { purpose: "", entity: "" },
      questions: [rule("r1", "One."), rule("r2", "Two."), rule("r3", "Three."), rule("r4", "Four."),
        { id: "g1", kind: "group", section: "Achievements", heading: "Delivery", bullet: "Split a service.", options: { Delivery: {}, Results: {} } },
        { id: "g2", kind: "group", section: "Achievements", heading: null, bullet: "Before any heading.", options: { Delivery: {}, Results: {} } }] },
    { path: "b.md", type: "experience", name: "B", state: { purpose: "", entity: "" }, questions: [rule("r1", "One."), rule("r2", "Two.")] },
    { path: "c.md", type: "experience", name: "C", state: { purpose: "", entity: "" }, questions: [rule("r1", "One.")] },
  ],
  notAsked: [{ path: "big.md", why: "longer than the judge reads in one request" }],
};
const answers = new Map([
  ["a.md", { r1: { p: 0.9 }, r2: { p: 0.2 }, r3: { p: 0.5 }, r4: { p: 0.45 },
             g1: { pick: "Results", probabilities: { Results: 0.8, Delivery: 0.2 } },
             g2: { pick: "Delivery", probabilities: { Delivery: 0.6, Results: 0.4 } } }],
  ["b.md", { r1: { p: 0.55 }, r2: { p: 0.95 } }],
  ["c.md", { error: "TypeSafe answered 500" }],
]);

test("unmeasured, the report flags nothing and lists each page's lowest verdicts, marked", () => {
  assert.equal(BAND, null);
  const lines = reportOf(asked, answers);
  assert.match(lines[0], /^judge: advisory/);
  assert.ok(lines.some((l) => /probabilities unmeasured/.test(l)));
  const a = lines.slice(lines.indexOf("model/a.md") + 1, lines.indexOf("model/b.md"));
  assert.deepEqual(a.filter((l) => /\br\d\b/.test(l)).map((l) => l.trim().split(/\s+/).slice(0, 3)),
    [["?", "0.20", "r2"], ["?", "0.45", "r4"], ["?", "0.50", "r3"]]);
  assert.equal(LOWEST, 3);
  assert.ok(a.some((l) => /\? 0\.80 {2}g1 {2}"Split a service\." stands under ### Delivery; the judge picks Results/.test(l)));
  assert.ok(a.some((l) => /g2 {2}"Before any heading\." stands under no heading; the judge picks Delivery/.test(l)));
  assert.ok(!lines.some((l) => l.includes("!")), "nothing is flagged unmeasured");
});

test("measured, a verdict below the band is flagged and a rule near even for most pages cannot be judged", () => {
  const lines = reportOf(asked, answers, { band: { low: 0.4, high: 0.6 } });
  assert.ok(lines.some((l) => /^ {2}! 0\.20 {2}r2 {2}Two\.$/.test(l)));
  assert.ok(lines.some((l) => /^ {2}! 0\.80 {2}g1 /.test(l)), "a pick that differs from its heading, above the band, is flagged");
  assert.ok(!lines.some((l) => /^ {2}! 0\.60 {2}g2 /.test(l)), "a pick inside the band is not");
  const r1 = lines.find((l) => /^ {2}experience r1:/.test(l));
  assert.match(r1, /asked of 2, median 0\.\d\d, near even for 1$/);
  const r3 = lines.find((l) => /^ {2}experience r3:/.test(l));
  assert.match(r3, /asked of 1, median 0\.50, near even for 1 — cannot be judged as written; a finding against the schema$/);
});

test("the report never reads as a pass and ends naming what it did not ask, a failed page among them", () => {
  const lines = reportOf(asked, answers);
  assert.ok(!lines.some((l) => l.includes("✓")));
  const tail = lines.slice(lines.indexOf("not asked:"));
  assert.ok(tail.length > 1, lines.join("\n"));
  assert.deepEqual(tail.slice(1), ["  model/big.md: longer than the judge reads in one request", "  model/c.md: TypeSafe answered 500"]);
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm run test:judge`

Expected: FAIL, `reportOf` is not exported.

- [ ] **Step 3: Write `reportOf`**

Add to the typedef block in `lib/questions.mjs`:

```js
/**
 * @typedef {{ p: number }} RuleAnswer
 * @typedef {{ pick: string; probabilities: Record<string, number> }} GroupAnswer
 * @typedef {Record<string, RuleAnswer | GroupAnswer>} Answers
 * @typedef {{ error: string }} Failed
 * @typedef {{ low: number; high: number }} Band
 */
```

Then append:

```js
// The band of probability that counts as near even, read off the calibration curve the
// measuring prints (`node tools/measure-judge.mjs`) and written here and into the spec's
// Measuring section together. Never set by guess: until it is measured, it is null, and the
// report flags nothing.
export const BAND = /** @type {Band | null} */ (null);

// How many of a page's rule verdicts an unmeasured report lists, lowest first, for the agent
// pass to read first.
export const LOWEST = 3;

/** @param {number} p */
const two = (p) => p.toFixed(2);
/**
 * @param {string} s
 * @param {number} n
 */
const short = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
/** @param {number[]} xs */
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2);
  return s.length % 2 ? /** @type {number} */ (s[m]) : (/** @type {number} */ (s[m - 1]) + /** @type {number} */ (s[m])) / 2;
};

// The report, as lines. It is advisory and says so first, never prints a line that reads as a
// pass, and ends as the validate skill's report ends, naming what it did not ask. A measured
// band flags a rule verdict below it and a pick that differs from its heading above it, and names
// every rule that lands near even for most of the pages it was asked of: the judge had the same
// sentence and the same file as an agent, so that rule cannot be checked as written, and the
// answer is a rewritten rule in a release of core, never a band moved here.
/**
 * @param {Questions} questions
 * @param {Map<string, Answers | Failed>} answers
 * @param {{ band?: Band | null }} [options]
 * @returns {string[]}
 */
export function reportOf({ asked, notAsked }, answers, { band = BAND } = {}) {
  const lines = ["judge: advisory — it gates nothing and is no pass; the agent pass still reads every page against every rule"];
  if (!band) lines.push(`probabilities unmeasured: nothing is flagged; each page's ${LOWEST} lowest verdicts and every pick that differs from its heading are listed, marked ?, for the agent pass to read first`);
  /** @type {NotAsked[]} */
  const failed = [];
  /** @type {Map<string, { type: string; id: string; rule: string; ps: number[] }>} */
  const rules = new Map();
  for (const r of asked) {
    const a = answers.get(r.path);
    if (!a) continue;
    if ("error" in a && typeof a.error === "string") {
      failed.push({ path: r.path, why: a.error });
      continue;
    }
    const got = /** @type {Answers} */ (a);
    /** @type {{ p: number; line: string }[]} */
    const verdicts = [];
    /** @type {string[]} */
    const picks = [];
    for (const q of r.questions) {
      const answer = got[q.id];
      if (!answer) continue;
      if (q.kind === "rule" && "p" in answer) {
        const key = `${r.type} ${q.id}`;
        const seen = rules.get(key) ?? { type: r.type, id: q.id, rule: q.rule, ps: [] };
        seen.ps.push(answer.p);
        rules.set(key, seen);
        verdicts.push({ p: answer.p, line: `${two(answer.p)}  ${q.id}  ${short(q.rule, 100)}` });
      } else if (q.kind === "group" && "pick" in answer && answer.pick !== q.heading) {
        const p = answer.probabilities[answer.pick] ?? 0;
        if (band && p <= band.high) continue;
        const under = q.heading === null ? "no heading" : `### ${q.heading}`;
        picks.push(`  ${band ? "!" : "?"} ${two(p)}  ${q.id}  "${short(q.bullet, 60)}" stands under ${under}; the judge picks ${answer.pick}`);
      }
    }
    const listed = band
      ? verdicts.filter((v) => v.p < band.low).map((v) => `  ! ${v.line}`)
      : [...verdicts].sort((x, y) => x.p - y.p).slice(0, LOWEST).map((v) => `  ? ${v.line}`);
    if (listed.length || picks.length) lines.push("", `model/${r.path}`, ...listed, ...picks);
  }
  lines.push("", "rules:");
  const byRule = [...rules.values()].sort((a, b) => (a.type === b.type ? Number(a.id.slice(1)) - Number(b.id.slice(1)) : a.type < b.type ? -1 : 1));
  for (const { type, id, ps } of byRule) {
    let line = `  ${type} ${id}: asked of ${ps.length}, median ${two(median(ps))}`;
    if (band) {
      const near = ps.filter((p) => p >= band.low && p <= band.high).length;
      line += `, near even for ${near}`;
      if (near * 2 > ps.length) line += " — cannot be judged as written; a finding against the schema";
    }
    lines.push(line);
  }
  const unasked = [...notAsked, ...failed].sort((a, b) => (a.path < b.path ? -1 : 1));
  lines.push("", "not asked:", ...(unasked.length ? unasked.map((n) => `  model/${n.path}: ${n.why}`) : ["  none"]));
  return lines;
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm run test:judge`

Expected: PASS, 11 tests.

- [ ] **Step 5: Types, the suite, commit**

Run: `npm run typecheck && npm run build && npm run build:check && npm run verify`

Expected: all pass.

```bash
git add lib/questions.mjs verify/questions.test.mjs types/
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
The judge's answers are reported, advisory and flagging nothing yet

reportOf turns the answers into lines: per page what the rules found, per rule how often it was asked and where its answers fell, and what was not asked. Until a band is measured it flags nothing and lists each page's lowest verdicts and every pick that differs from its heading, marked as unmeasured, for the validate skill to read first; with a band it flags, and names a rule near even for most pages as one that cannot be judged as written.

Verified: npm run test:judge, typecheck, build:check and verify pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: <the model that wrote this commit>
EOF
git log -1 --format='[%s]'
```

---

### Task 4: An instance read with its files

**Files:**

- Modify: `lib/history.mjs:68-80` (`readInstance`)
- Modify: `verify/questions.test.mjs`
- Modify: `types/` (rebuilt)

**Interfaces:**

- Produces: `instanceAt(dir: string): { graph: InstanceGraph; files: InstanceFiles; schemas: Files; core: string | null }` exported from `lib/history.mjs`, where `files` are the pages keyed relative to `model/` and `core` is the manifest's `core.version`. `readInstance(dir)` keeps its signature and returns `instanceAt(dir).graph`.

- [ ] **Step 1: Write the failing test**

Append to `verify/questions.test.mjs`, with `import os from "node:os";`, `import path from "node:path";`, `import { execFileSync } from "node:child_process";`, `import { fileURLToPath } from "node:url";` and `import { instanceAt } from "../lib/history.mjs";` added to its imports:

```js
// fileURLToPath, not `.pathname`: on Windows a URL's pathname is `/C:/…`, which no process can run.
const cli = fileURLToPath(new URL("../bin/companygraph.mjs", import.meta.url));
const fresh = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "companygraph-judge-"));
  execFileSync(process.execPath, [cli, "init", root, "--name", "Acme", "--agent", "claude", "--no-hook"], { encoding: "utf8" });
  return root;
};

test("an instance is read with its pages and its vendored schemas, and questions come from those", () => {
  const root = fresh();
  const instance = instanceAt(root);
  assert.ok(instance.files.has("identity.md"));
  assert.ok(instance.schemas.has("identity-schema.md"));
  assert.equal(instance.core, JSON.parse(fs.readFileSync(path.join(root, ".companygraph", "manifest.json"), "utf8")).core.version);
  // The vendored copy is what is asked: a rule added to it is asked, and core in this package is not read.
  const vendored = path.join(root, "meta", "core", "identity-schema.md");
  fs.writeFileSync(vendored, fs.readFileSync(vendored, "utf8").replace("## Writing rules\n\n", "## Writing rules\n\n- A rule only this instance has.\n"));
  const page = questionsOf(instanceAt(root)).asked.find((r) => r.path === "identity.md");
  assert.equal(page.questions[0].rule, "A rule only this instance has.");
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npm run test:judge`

Expected: FAIL, `instanceAt` is not exported.

- [ ] **Step 3: Split `readInstance`**

In `lib/history.mjs`, replace `readInstance` with:

```js
// An instance as `judge` needs it: the parsed graph, the pages it was parsed from, keyed relative
// to `model/`, and the schemas the instance vendored, which is where its rules are read from.
/**
 * @param {string} dir
 * @returns {{ graph: InstanceGraph; files: InstanceFiles; schemas: Map<string, string>; core: string | null }}
 */
export function instanceAt(dir) {
  if (!isInstance(dir)) throw new Error(`${dir} is not an instance: it has no .companygraph/manifest.json beside a model/ folder`);
  const manifest = JSON.parse(readFileSync(join(dir, ".companygraph", "manifest.json"), "utf8"));
  const units = manifest.units ?? "meta";
  const schemas = /** @type {Map<string, string>} */ (filesUnder(join(dir, units, "core")));
  // A pack the instance took is read beside core, its schemas keyed `<pack>/<type>-schema.md`
  // as `parseSchemas` reads them (R20); without them a pack's page meets R13.
  for (const pack of manifest.packs ?? [])
    for (const [file, text] of filesUnder(join(dir, units, pack))) schemas.set(`${pack}/${file}`, /** @type {string} */ (text));
  const files = filesUnder(join(dir, "model"));
  return { graph: parseInstance(files, { schemas }), files, schemas, core: manifest.core?.version ?? null };
}

/**
 * @param {string} dir
 * @returns {InstanceGraph}
 */
export const readInstance = (dir) => instanceAt(dir).graph;
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm run test:judge && npm run test:seats`

Expected: PASS; `test:seats` is the suite that already uses `readInstance` and is unchanged.

- [ ] **Step 5: Types, the suite, commit**

Run: `npm run typecheck && npm run build && npm run build:check && npm run verify`

Expected: all pass.

```bash
git add lib/history.mjs verify/questions.test.mjs types/
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
An instance is read with the pages and schemas it was parsed from

The judge sends a page's file whole and asks the rules of the schemas the instance vendored, so it needs both beside the graph. instanceAt returns them, and readInstance is now the graph of it, unchanged for its callers.

Verified: npm run test:judge, test:seats, typecheck, build:check and verify pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: <the model that wrote this commit>
EOF
git log -1 --format='[%s]'
```

---

### Task 5: The judge, in one file

**Files:**

- Create: `bin/judges/typesafe.mjs`
- Create: `verify/judge.test.mjs`
- Modify: `package.json` (`test:judge` runs both files)
- Modify: `types/` (rebuilt)

**Interfaces:**

- Consumes: `Request`, `Answers` (Tasks 2 and 3).
- Produces, exported from `bin/judges/typesafe.mjs`:
  - `SERVICE = { name: "TypeSafe", host: "api.typesafe.ai", model: "jev-1.13.0" }`.
  - `toWire(request: Request): { model: string; state: { purpose: string; entity: string }; questions: Record<string, object> }`.
  - `fromWire(request: Request, body: unknown): Answers` (throws when an answer is missing or of the wrong type).
  - `class KeyRefused extends Error`.
  - `ask(request: Request, options: { key: string; fetch?: typeof globalThis.fetch; sleep?: (ms: number) => Promise<void>; attempts?: number }): Promise<Answers>`.

- [ ] **Step 1: Write the failing tests**

Create `verify/judge.test.mjs`:

```js
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
```

In `package.json`, change `test:judge` to:

```json
"test:judge": "node --test verify/questions.test.mjs verify/judge.test.mjs"
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm run test:judge`

Expected: FAIL, `Cannot find module '…/bin/judges/typesafe.mjs'`.

- [ ] **Step 3: Write the judge**

Create `bin/judges/typesafe.mjs`:

```js
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

// A rate limit (429) and an overload (529) are retried, after the `retry-after` the service
// sends or else a doubling wait, as TypeSafe's own clients do; anything else is the page's
// failure, and a refused key is the run's.
/**
 * @param {Request} request
 * @param {{ key: string; fetch?: typeof globalThis.fetch; sleep?: (ms: number) => Promise<void>; attempts?: number }} options
 * @returns {Promise<Answers>}
 */
export async function ask(request, { key, fetch = globalThis.fetch, sleep = (ms) => new Promise((done) => setTimeout(done, ms)), attempts = 4 }) {
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
    throw new Error(`${SERVICE.name} answered ${res.status}`);
  }
}
```

The test of Step 1 expects the second wait to be `2000`: the `529` carries no `retry-after`, so the wait is `1000 * 2 ** (2 - 1)`.

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm run test:judge`

Expected: PASS, 16 tests.

- [ ] **Step 5: Types, the suite, commit**

Run: `npm run typecheck && npm run build && npm run build:check`

Expected: all pass; `types/bin/judges/typesafe.d.mts` new. `npm run verify` runs after the `git add` below, since it reads the mode from git's index.

Every file under `bin/` is recorded `100755`, which `npm run verify` holds, so the new file is made executable before it is added:

```bash
chmod +x bin/judges/typesafe.mjs
git add bin/judges/typesafe.mjs verify/judge.test.mjs package.json types/
git update-index --chmod=+x bin/judges/typesafe.mjs
npm run verify
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
TypeSafe's Jev is the judge, named in one file

bin/judges/typesafe.mjs is the only place the tooling names a judge: it turns a request into Jev's wire shape on the pinned jev-1.13.0, its answers back into the module's, retries a rate limit as the service asks, and keeps the key out of every error. A second judge would be a second file beside it.

Verified: npm run test:judge, typecheck, build:check and verify pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: <the model that wrote this commit>
EOF
git log -1 --format='[%s]'
```

---

### Task 6: The `judge` command

**Files:**

- Modify: `bin/companygraph.mjs` (header comment, `USAGE`, a `judge` function, the dispatch)
- Modify: `verify/judge.test.mjs`
- Modify: `README.md` (the `bin/companygraph.mjs` line under "What is here", the commands paragraph under "Instantiating it", and a new paragraph after `check`'s)
- Modify: `types/` (rebuilt)

**Interfaces:**

- Consumes: `instanceAt` (Task 4), `questionsOf`, `reportOf` (Tasks 2 and 3), `SERVICE`, `toWire`, `ask`, `KeyRefused` (Task 5); `flags`, `ask`, `prompt`, `yes` already in `bin/companygraph.mjs`.
- Produces: `companygraph judge [<folder>]`, exit 0 when it ran, 1 when it could not.

- [ ] **Step 1: Write the failing tests**

Append to `verify/judge.test.mjs`, with these imports added at its top:

```js
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
```

and:

```js
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
const judge = (root, { input = "", env }) => new Promise((done, fail) => {
  const child = spawn(process.execPath, [cli, "judge", root], { env });
  let out = "", err = "";
  child.stdout.on("data", (d) => (out += d));
  child.stderr.on("data", (d) => (err += d));
  child.on("error", fail);
  child.on("close", (code) => done({ code, out, err }));
  child.stdin.end(input);
});
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
      res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify({ model: "jev-1.13.0", answers, usage: {} }));
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
  assert.match(out, /no TYPESAFE_API_KEY: nothing was sent/);
});

test("with a key, judge names the service and every file, and sends nothing without a typed yes", async () => {
  const fake = await service();
  try {
    for (const input of ["", "n\n", "no\n"]) {
      const { code, out } = await judge(fresh(), { input, env: { ...withoutKey(), TYPESAFE_API_KEY: "sk-secret", COMPANYGRAPH_TYPESAFE_URL: fake.url } });
      assert.equal(code, 0);
      assert.match(out, /to TypeSafe \(api\.typesafe\.ai, jev-1\.13\.0\)/);
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
    assert.match(out, /^ {2}model\/identity\.md: TypeSafe answered 500$/m);
  } finally {
    fake.close();
  }
});

test("judge outside an instance cannot run, and says why", async () => {
  const { code, err } = await judge(fs.mkdtempSync(path.join(os.tmpdir(), "companygraph-judge-")), { env: withoutKey() });
  assert.equal(code, 1);
  assert.match(err, /is not an instance/);
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm run test:judge`

Expected: FAIL, `judge is no command of this tooling`.

- [ ] **Step 3: Write the command**

In `bin/companygraph.mjs`, add to the header comment's command list, after the `check` line:

```js
//   companygraph judge [<folder>]
```

Add to `USAGE`, after the `check` line:

```text
  judge [<folder>]    ask a decision model whether each page keeps its schema's writing rules; advisory, and it asks before sending anything
```

Add this function after `check`:

```js
// The writing rules, asked of a judge. Advisory: it gates nothing and runs in no workflow, since
// a judge's answer can move between runs and a public repository's run cannot hold the key. It
// sends an instance's pages out of the machine, which for a private company is a decision about
// its data, so it names the service and every file, and sends only on a typed yes; nothing skips
// the question, and with no key it prints what it would ask and sends nothing.
/**
 * @param {string[]} argv
 * @returns {Promise<number>}
 */
async function judge(argv) {
  const root = resolve(flags(argv)._[0] ?? ".");
  const { instanceAt } = await import("../lib/history.mjs");
  const { questionsOf, reportOf } = await import("../lib/questions.mjs");
  const judges = await import("./judges/typesafe.mjs");
  const instance = instanceAt(root);
  const questions = questionsOf(instance);
  const count = questions.asked.reduce((n, r) => n + r.questions.length, 0);
  console.log(`judge: ${count} questions about ${questions.asked.length} pages of ${root}, from the writing rules of its vendored core ${instance.core ?? "at an unnamed version"}`);
  const key = process.env.TYPESAFE_API_KEY;
  if (!key) {
    for (const r of questions.asked) {
      console.log(`\nmodel/${r.path}`);
      for (const q of r.questions)
        console.log(`  ${q.id}  ${q.kind === "rule" ? q.rule : `"${q.bullet}": one of ${Object.keys(q.options).join(", ")}`}`);
    }
    console.log(`\nno TYPESAFE_API_KEY: nothing was sent. These are the questions a run with the key would send to ${judges.SERVICE.name}.`);
    return 0;
  }
  const size = questions.asked.reduce((n, r) => n + JSON.stringify(judges.toWire(r)).length, 0);
  console.log(`\nThis sends these files of model/, whole, with the purposes of their schemas, to ${judges.SERVICE.name} (${judges.SERVICE.host}, ${judges.SERVICE.model}), about ${Math.ceil(size / 4)} tokens in all:`);
  for (const r of questions.asked) console.log(`  model/${r.path}`);
  if (!yes(await ask(prompt("Send them?", "y/N")))) {
    console.log("Nothing was sent.");
    return 0;
  }
  /** @type {Map<string, import("../lib/questions.mjs").Answers | { error: string }>} */
  const answers = new Map();
  let refused = false;
  const queue = [...questions.asked];
  // Four at a time: well inside the service's request rate, and a few hundred pages in minutes.
  await Promise.all(Array.from({ length: 4 }, async () => {
    for (let r = queue.shift(); r && !refused; r = queue.shift()) {
      try {
        answers.set(r.path, await judges.ask(r, { key }));
      } catch (error) {
        if (error instanceof judges.KeyRefused) refused = true;
        answers.set(r.path, { error: /** @type {Error} */ (error).message });
      }
    }
  }));
  if (refused) {
    console.error(`${judges.SERVICE.name} refused the key in TYPESAFE_API_KEY; no report.`);
    return 1;
  }
  console.log("");
  for (const line of reportOf(questions, answers)) console.log(line);
  return 0;
}
```

Add to the dispatch, after the `check` line:

```js
  else if (command === "judge") process.exitCode = await judge(rest);
```

`ask` reads standard input line by line and answers `""` at end of input, so a pipe with nothing on it, or a CI step, answers no.

In `README.md`, under "What is here", change the `bin/companygraph.mjs` line's list to read `init, upgrade, check, judge, form, pins, adopt, obsidian, commits and seats`, and in the "Instantiating it" paragraph that lists the commands, add `judge` after `check` in the same way. After the paragraph that begins `` `check [<folder>]` ``, add:

```markdown
`judge [<folder>]` asks a decision model the questions nothing mechanical reaches: every writing rule of the schemas the instance vendored, as a yes-or-no question about each page, with the schema's purpose beside the page, and every bullet of a grouped section as a choice among the entities its headings name. It prints a report per page and per rule, advisory and outside every workflow, which the validate skill reads before it reads the rest; it gates nothing and never prints a line that reads as a pass. The judge is TypeSafe's Jev, named in `bin/judges/typesafe.mjs` alone, with the key in `TYPESAFE_API_KEY`. Without a key it prints the questions and sends nothing; with one it names the service and every file it would send, and sends only when the person running it answers yes, so an instance whose pages must not leave the machine does not run it. Until the calibration is measured (`node tools/measure-judge.mjs`, by hand), the report flags nothing and lists each page's lowest verdicts as unmeasured.
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm run test:judge && npm run test:cli`

Expected: PASS; `test:cli` unchanged.

- [ ] **Step 5: Types, the suite, form, commit**

Run: `npm run typecheck && npm run build && npm run build:check && npm run verify && sh conventions/conventions-format && sh conventions/conventions-check`

Expected: all pass.

```bash
git add bin/companygraph.mjs verify/judge.test.mjs README.md types/
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
companygraph judge asks the writing rules, after asking the person

The new judge command derives the questions from the instance's vendored schemas and, with no key, prints them and sends nothing. With a key it names TypeSafe, the model and every file it would send, sends only on a typed yes, four pages at a time, and prints the advisory report; a refused key stops the run with one sentence, and a page that fails is named under not asked.

Verified: npm run test:judge, test:cli, typecheck, build:check, verify, conventions-format and conventions-check pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: <the model that wrote this commit>
EOF
git log -1 --format='[%s]'
```

---

### Task 7: The faults and the measuring

**Files:**

- Create: `tools/judge-faults.mjs`
- Create: `tools/measure-judge.mjs`
- Create: `verify/judge-faults.test.mjs`
- Modify: `package.json` (`test:judge` runs all three test files)

**Interfaces:**

- Consumes: `parseInstance`; `questionsOf`, `writingRulesOf` (Tasks 1 and 2); `ask` (Task 5).
- Produces: `FAULTS: { name: string; rule: string; plant: (text: string, context: { skills: string[] }) => { text: string; moved?: { bullet: string; from: string; to: string } } | null }[]` from `tools/judge-faults.mjs`, where `rule` is the opening of the one experience writing rule the fault breaks.

The spec says `verify/` gains entities copied from `example/` with a fault planted in each. This plan plants the faults in code over the example's own entries at run time instead, so the fixtures cannot drift from the example they copy, and the test below holds each fault to the rule it names. Tell the owner in the hand-off.

- [ ] **Step 1: Write the failing tests**

Create `verify/judge-faults.test.mjs`:

```js
// The measuring asks the judge about the example's entries with one fault planted against one
// writing rule, and about the same entries without it. These tests hold the faults to that: each
// names exactly one rule of the experience schema, plants on some entry, changes it, and leaves a
// page the parser still reads, so what is measured is the rule and not a broken page.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { FAULTS } from "../tools/judge-faults.mjs";
import { writingRulesOf } from "../lib/questions.mjs";
import { parseInstance } from "../lib/instance.mjs";

const read = (rel) => fs.readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
const files = new Map();
const walk = (rel) => {
  for (const entry of fs.readdirSync(new URL(`../example/model/${rel}`, import.meta.url), { withFileTypes: true })) {
    const child = `${rel}${entry.name}`;
    if (entry.isDirectory()) walk(`${child}/`);
    else if (child.endsWith(".md")) files.set(child, read(`example/model/${child}`));
  }
};
walk("");
const schemas = new Map(fs.readdirSync(new URL("../core/", import.meta.url)).filter((f) => f.endsWith("-schema.md")).map((f) => [f, read(`core/${f}`)]));
const graph = parseInstance(files, { schemas });
const skills = graph.entities.filter((e) => e.type === "skill").map((e) => e.name);
const entries = graph.entities.filter((e) => e.type === "experience").map((e) => e.path);

test("each fault names exactly one writing rule of the experience schema", () => {
  const rules = writingRulesOf(schemas.get("experience-schema.md"));
  for (const f of FAULTS) assert.equal(rules.filter((r) => r.startsWith(f.rule)).length, 1, f.name);
});

for (const f of FAULTS) {
  test(`${f.name}: plants on some example entry, changes it, and the page still parses`, () => {
    let planted = 0;
    for (const path of entries) {
      const out = f.plant(files.get(path), { skills });
      if (!out) continue;
      planted++;
      assert.notEqual(out.text, files.get(path));
      assert.doesNotThrow(() => parseInstance(new Map([...files, [path, out.text]]), { schemas }), path);
    }
    assert.ok(planted > 0);
  });
}

test("a bullet moved to another kind says where it came from and where it went", () => {
  const move = FAULTS.find((f) => f.name.startsWith("a bullet under a kind"));
  const out = move.plant(files.get("profiles/mira-halvorsen/experiences/2022-beacon-systems.md"), { skills });
  assert.deepEqual(out.moved, { bullet: "Split one service that three teams edited into two that one team each owns, so the second team stopped waiting on the first to merge.", from: "Delivery", to: "Results" });
  assert.doesNotMatch(out.text, /### Delivery/, "a kind left with nothing has no heading");
});
```

In `package.json`, change `test:judge` to:

```json
"test:judge": "node --test verify/questions.test.mjs verify/judge.test.mjs verify/judge-faults.test.mjs"
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm run test:judge`

Expected: FAIL, `Cannot find module '…/tools/judge-faults.mjs'`.

- [ ] **Step 3: Write the faults**

Create `tools/judge-faults.mjs`:

```js
// The faults the measuring plants, each against one writing rule of the experience schema, over
// the example's own entries, so the judge is asked about a faulted page and the same page
// without the fault. Planted in code rather than copied into files, so they cannot drift from
// the example they are planted on. `rule` is the opening of the rule each one breaks;
// verify/judge-faults.test.mjs holds it to exactly one rule.

// The `## Achievements` of a page as groups of bullets, each bullet its lines, and the lines it
// spans, so a fault can rewrite the section and leave the rest of the page as it was.
/** @param {string[]} lines */
function achievementsOf(lines) {
  const start = lines.indexOf("## Achievements");
  if (start < 0) return null;
  let end = lines.findIndex((l, i) => i > start && l.startsWith("## "));
  if (end < 0) end = lines.length;
  /** @type {{ heading: string; bullets: string[][] }[]} */
  const groups = [];
  for (const line of lines.slice(start + 1, end)) {
    const last = groups[groups.length - 1];
    if (line.startsWith("### ")) groups.push({ heading: line.slice(4).trim(), bullets: [] });
    else if (/^[-*]\s/.test(line) && last) last.bullets.push([line]);
    else if (/^\s+\S/.test(line) && last?.bullets.length) last.bullets[last.bullets.length - 1]?.push(line);
  }
  return { start, end, groups };
}

/**
 * @param {string[]} lines
 * @param {{ start: number; end: number }} at
 * @param {{ heading: string; bullets: string[][] }[]} groups
 */
function withAchievements(lines, { start, end }, groups) {
  const body = groups.filter((g) => g.bullets.length).flatMap((g) => ["", `### ${g.heading}`, "", ...g.bullets.flat()]);
  const rest = lines.slice(end);
  return `${[...lines.slice(0, start + 1), ...body, ...(rest.length ? ["", ...rest] : [])].join("\n").replace(/\n*$/, "")}\n`;
}

/** @param {string[]} bullet */
const textOf = (bullet) => bullet.map((l) => l.trim()).join(" ").replace(/^[-*]\s+/, "");

export const FAULTS = [
  {
    name: "a stack listed as an achievement",
    rule: "A list of tools or a stack is not an achievement",
    /** @param {string} text */
    plant(text) {
      const lines = text.split("\n");
      const at = achievementsOf(lines);
      if (!at || !at.groups[0]) return null;
      at.groups[0].bullets.unshift(["- Java, Kafka, Kubernetes and Terraform."]);
      return { text: withAchievements(lines, at, at.groups) };
    },
  },
  {
    name: "a skill the body does not show",
    rule: "Every entry in `skills:` is one the body shows",
    /**
     * @param {string} text
     * @param {{ skills: string[] }} context
     */
    plant(text, { skills }) {
      const lines = text.split("\n");
      const fence = lines.indexOf("---", 1);
      const listed = lines.slice(0, fence).filter((l) => /^\s+-\s/.test(l)).map((l) => l.replace(/^\s+-\s+/, "").trim());
      const body = lines.slice(fence + 1).join("\n").toLowerCase();
      const skill = skills.find((s) => !listed.includes(s) && !body.includes(s.toLowerCase()));
      if (!skill) return null;
      const at = lines.indexOf("skills:");
      if (at >= 0 && at < fence) lines.splice(at + 1, 0, `  - ${skill}`);
      else lines.splice(fence, 0, "skills:", `  - ${skill}`);
      return { text: lines.join("\n") };
    },
  },
  {
    name: "a bullet under a kind it is not chiefly evidence of",
    rule: "Where an instance defines achievement kinds",
    /** @param {string} text */
    plant(text) {
      const lines = text.split("\n");
      const at = achievementsOf(lines);
      const from = at?.groups.find((g) => g.bullets.length);
      const to = at?.groups.find((g) => g !== from);
      if (!at || !from || !to) return null;
      const bullet = /** @type {string[]} */ (from.bullets.shift());
      to.bullets.push(bullet);
      return { text: withAchievements(lines, at, at.groups), moved: { bullet: textOf(bullet), from: from.heading, to: to.heading } };
    },
  },
  {
    name: "a running period whose tagline does not say so",
    rule: "A period still running has no `end`",
    /** @param {string} text */
    plant(text) {
      const lines = text.split("\n");
      const fence = lines.indexOf("---", 1);
      const end = lines.findIndex((l, i) => i < fence && l.startsWith("end:"));
      if (end >= 0) {
        lines.splice(end, 1);
        return { text: lines.join("\n") };
      }
      const tagline = lines.findIndex((l) => /^> Ongoing\.\s+\S/.test(l));
      if (tagline < 0) return null;
      lines[tagline] = /** @type {string} */ (lines[tagline]).replace(/^> Ongoing\.\s+/, "> ");
      return { text: lines.join("\n") };
    },
  },
];
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm run test:judge`

Expected: PASS, 3 + 4 + 1 tests in `judge-faults.test.mjs` beside the earlier ones.

- [ ] **Step 5: Write the measuring script**

Create `tools/measure-judge.mjs`:

```js
// Whether the judge's probabilities mean what they say, measured before the report shows any of
// them as a finding. Run by hand, with a key, never in CI:
//
//   TYPESAFE_API_KEY=… node tools/measure-judge.mjs
//
// It asks about the example's entries, each with one fault from tools/judge-faults.mjs planted
// and again without it, only the rule the fault breaks; and every grouped bullet, with the
// heading it stands under as the truth. The clean entries are taken to keep their rules, which
// the example's own validate pass holds. It prints, per tenth of probability, how many answers
// fell there and how often they were right. Where that curve is near the diagonal, the band that
// counts as near even is read off it and written into lib/questions.mjs's BAND and the spec's
// Measuring section together; how few points a tenth holds is printed beside it, so a thin curve
// reads as thin.
import fs from "node:fs";
import { parseInstance } from "../lib/instance.mjs";
import { questionsOf } from "../lib/questions.mjs";
import { ask, SERVICE } from "../bin/judges/typesafe.mjs";
import { FAULTS } from "./judge-faults.mjs";

const key = process.env.TYPESAFE_API_KEY;
if (!key) {
  console.error("TYPESAFE_API_KEY is not set; nothing was measured.");
  process.exit(1);
}
const read = (rel) => fs.readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
const files = new Map();
const walk = (rel) => {
  for (const entry of fs.readdirSync(new URL(`../example/model/${rel}`, import.meta.url), { withFileTypes: true })) {
    const child = `${rel}${entry.name}`;
    if (entry.isDirectory()) walk(`${child}/`);
    else if (child.endsWith(".md")) files.set(child, read(`example/model/${child}`));
  }
};
walk("");
const schemas = new Map(fs.readdirSync(new URL("../core/", import.meta.url)).filter((f) => f.endsWith("-schema.md")).map((f) => [f, read(`core/${f}`)]));
const graph = parseInstance(files, { schemas });
const skills = graph.entities.filter((e) => e.type === "skill").map((e) => e.name);
const entries = questionsOf({ graph, files, schemas }).asked.filter((r) => r.type === "experience");

/** Yes-or-no answers: the probability the page keeps the rule, and whether it did. */
const rules = [];
/** Choices: the probability of the pick, and whether the pick was the truth. */
const choices = [];
for (const r of entries) {
  const groups = r.questions.filter((q) => q.kind === "group");
  for (const g of groups) {
    const a = await ask({ ...r, questions: [g] }, { key });
    choices.push({ p: a[g.id].probabilities[a[g.id].pick] ?? 0, right: a[g.id].pick === g.heading });
  }
  for (const f of FAULTS) {
    const planted = f.plant(r.state.entity, { skills });
    if (!planted) continue;
    const rule = r.questions.find((q) => q.kind === "rule" && q.rule.startsWith(f.rule));
    const clean = await ask({ ...r, questions: [rule] }, { key });
    const faulted = await ask({ ...r, state: { ...r.state, entity: planted.text }, questions: [rule] }, { key });
    rules.push({ p: clean[rule.id].p, kept: true }, { p: faulted[rule.id].p, kept: false });
    if (planted.moved && groups[0]) {
      const moved = { id: "g1", kind: "group", section: "Achievements", heading: planted.moved.to, bullet: planted.moved.bullet, options: groups[0].options };
      const a = await ask({ ...r, state: { ...r.state, entity: planted.text }, questions: [moved] }, { key });
      choices.push({ p: a.g1.probabilities[a.g1.pick] ?? 0, right: a.g1.pick === planted.moved.from });
    }
  }
}

const tenths = (points, right) => {
  for (let t = 0; t < 10; t++) {
    const inside = points.filter((x) => Math.min(9, Math.floor(x.p * 10)) === t);
    const share = inside.length ? (inside.filter(right).length / inside.length).toFixed(2) : "—";
    console.log(`  ${(t / 10).toFixed(1)}–${((t + 1) / 10).toFixed(1)}  n=${String(inside.length).padStart(3)}  right ${share}`);
  }
};
console.log(`${SERVICE.name} ${SERVICE.model}, over the example's entries\n`);
console.log("rules: the probability the page keeps the rule, by tenth; right is how often it did");
tenths(rules, (x) => x.kept);
console.log("\nchoices: the probability of the pick, by tenth; right is how often the pick was the heading the bullet belongs under");
tenths(choices, (x) => x.right);
```

Run: `node --check tools/measure-judge.mjs && env -u TYPESAFE_API_KEY node tools/measure-judge.mjs; echo "exit $?"`

Expected: no syntax error; `TYPESAFE_API_KEY is not set; nothing was measured.` and `exit 1`. The script is not run with a key in this plan; that is the owner's step, as the spec's Measuring section says.

- [ ] **Step 6: The suite, form, commit**

Run: `npm run test:judge && npm run verify && sh conventions/conventions-format && sh conventions/conventions-check`

Expected: all pass.

```bash
git add tools/judge-faults.mjs tools/measure-judge.mjs verify/judge-faults.test.mjs package.json
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
The judge's calibration can be measured, by hand, over planted faults

No probability is shown as a finding until the curve says what it means. tools/judge-faults.mjs plants four faults over the example's entries, each against one experience writing rule, and the tests hold each to its rule and to a page the parser still reads; tools/measure-judge.mjs asks the judge about the faulted and clean pages and prints how often each tenth of probability was right. It runs with a key, by hand, and never in CI.

Verified: npm run test:judge, verify, conventions-format and conventions-check pass; measure-judge.mjs refuses without a key.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: <the model that wrote this commit>
EOF
git log -1 --format='[%s]'
```

---

### Task 8: The validate skill reads the report first

**Files:**

- Modify: `agents/claude/skills/companygraph-validate/SKILL.md` (step 4)

**Interfaces:**

- Consumes: the report's first line `judge: advisory …` and its `?`/`!` lines (Task 3).

- [ ] **Step 1: Add the sentence**

In `agents/claude/skills/companygraph-validate/SKILL.md`, step 4 ends with `…and this pass is the only thing that checks them.` After that sentence, in the same paragraph, add:

```markdown
   Where `companygraph judge` printed a report for this commit, read first the pages and rules
   it lists — those it flags with `!`, or, while it says its probabilities are unmeasured, the
   lowest verdicts it marks with `?` — and then every other page as before. The report is
   advisory: it never stands in for this reading, and a page it does not list is still read.
```

- [ ] **Step 2: The suites that hold the skills**

The skills are vendored into every instance with a hash per file, and the plan and CLI suites write them into instances.

Run: `npm run test:plan && npm run test:cli && npm run test:instance-files && npm run verify && sh conventions/conventions-format && sh conventions/conventions-check`

Expected: all pass. If a test compares a skill's bytes or hash to a fixture, update the fixture to the new file and say so in the commit.

- [ ] **Step 3: Commit**

```bash
git add agents/claude/skills/companygraph-validate/SKILL.md
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
The validate skill reads the judge's report before the rest

The owner decided on October 3 that the validate skill reads the judge's report from the first slice. Step 4 now reads the pages and rules the report lists first, the flagged ones once a band is measured and the lowest unmeasured verdicts until then, and every other page after, so the report orders the reading and never replaces it.

Verified: npm run test:plan, test:cli, test:instance-files, verify, conventions-format and conventions-check pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: <the model that wrote this commit>
EOF
git log -1 --format='[%s]'
```

---

## After the last task

Run the whole suite once more, as CI runs it: `npm run build:check && npm run verify && npm run test:instance && npm run test:instance-checks && npm run test:rules && npm run test:plan && npm run test:instance-files && npm run test:form && npm run test:pins && npm run test:cli && npm run test:ids && npm run test:localization && npm run test:judge && npm run test:seats && npm run test:untar && npm run test:fetch-core && npm run test:obsidian`. Then open the pull request and stop: the merge, the release and the first measured run with a key are the owner's.
