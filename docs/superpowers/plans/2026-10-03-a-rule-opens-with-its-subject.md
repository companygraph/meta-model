# A writing rule opens with its subject — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every writing rule in `core/` and `packs/` opens with its subject, `verify` holds that, and `companygraph judge` asks a rule only of a page that has its subject, fields included.

**Architecture:** Task 1 applies the spec's appendix to the schemas with a one-off script that is not committed, edits CONVENTIONS' paragraph on writing rules, and moves the tests and planted faults that cite rules by number or opening. Task 2 adds `openingOf` to `lib/questions.mjs` and a check in `verify/check.mjs` that refuses a core or pack rule with no subject at its opening. Task 3 makes the judge read fields as subjects through `openingOf`, so a rule about a field is left out of a page without the field.

**Tech Stack:** Node 22 ESM, no runtime dependencies, `node --test`, JSDoc-typed `lib/` with committed declarations under `types/`.

**Spec:** `docs/superpowers/specs/2026-10-03-a-rule-opens-with-its-subject-design.md` (companygraph/meta-model#254), in the same pull request as this plan.

**Tried:** Task 1's script was run once on a scratch copy of `4879b8e`: it applied 179 changes (125 reworded, 40 dropped, one moved, 13 to Purpose) with 14 Purpose sentences and one new phase rule; `npm run verify`, the Markdown form and every suite but `test:judge` passed, and the seven judge failures were the ones Task 1 Step 4 fixes. A prototype of Task 2's check refused nine unchanged rules until it accepted a short lead-in before a backticked subject and a `field: value` opening, which Task 2 encodes.

## Global Constraints

- A subject is one of: a section, a frontmatter field or a column of a section's table that the rule's own schema declares, written in backticks; "The H1"; "The tagline", or the tagline's label from the sections table's `` `> [Label]` `` row where the label does not begin with "What"; "The page".
- A short lead-in may come before a backticked subject: `Each`, `Every`, `A`, `An` or `One`, followed by at most four more words, ending at the backtick ("Every row of `## Bears on`", "One row per place in `## Also at`", "Each line under `## What it never does`"). A backticked `name: value` names the field `name`.
- `verify` holds `core/` and every pack under `packs/`. Instances are not held: a rule of an instance's own schema that opens with no subject is asked of every page.
- The judge asks a rule only of a page that has its subject. A field is present when the page's frontmatter carries it with a value other than the empty string or an empty list. "The H1", the tagline and "The page" are always present.
- The appendix is applied exactly; a rule the appendix leaves unchanged is not touched.
- Core's version does not move in this plan; the release does that.
- No version bump, no tag and no release notes: the release is the owner's.
- American English (R14). Code comments follow the surrounding file: prose paragraphs saying why, no bullet lists. No numbers that move in prose.
- Commits and PR bodies are prose in the git register: a subject under seventy characters with no type prefix, one to three paragraphs, then `Verified: …` naming what ran, then the trailers. Commits are authored `Implementer <implementer@companygraph.io>` with `Process: Delivery`, `Phase: Implement`, `Track: Code` and the `Co-Authored-By` line naming the model that wrote the commit.
- Before any `node`, `npm` or `gh`: `export PATH="/opt/homebrew/bin:$PATH"`. Run `npm ci` once in the worktree before the first test.
- After any change in `lib/`, `npm run typecheck` passes and `npm run build` rewrites `types/`; the rewritten files are committed in the same commit, and `npm run build:check` passes before each commit.

## Review Focus

- A rule whose subject field holds an empty list, `skills: []`: a person expects it treated as absent, so the rule is left out. Task 3 tests it.
- A schema whose tagline label is a phrase, `` `> [What it gives]` ``: a person expects only "The tagline" to count, never "The what it gives". Task 2 tests it.
- A rule of an instance's own schema that opens with no subject at all: a person expects it asked of every page, never refused or skipped. Task 3 tests it.
- A lead-in long enough to hide a subject, "A rule that names a phase and then `## Gate` …": a person expects it refused, since the subject is no longer the opening. Task 2 tests it.
- A dropped rule whose appendix row names the check that holds it, where that check does not exist: a person expects the drop held back until the check is confirmed. Task 1 Step 3 confirms each.

---

### Task 1: The rules, as the appendix says

**Files:**

- Modify: every `core/*-schema.md` and `packs/software/*-schema.md` the appendix changes (38 files)
- Modify: `core/CONVENTIONS.md` (the paragraph that opens "`## Purpose` and `## Writing rules` come last")
- Modify: `tools/judge-faults.mjs` (three fault openings)
- Test: `verify/questions.test.mjs`, `verify/judge.test.mjs`

**Interfaces:**

- Consumes: the spec's appendix.
- Produces: the rewritten rules every later task reads; experience's Ending rule and References `What` rule and concept's `As` rule at new numbers, which the tests look up by opening rather than by number.

- [ ] **Step 1: Write the applier outside the repository**

Save this as `apply-appendix.mjs` in your scratchpad directory, not in the repository. It reads the appendix, replaces each changed rule, drops the dropped ones, appends each Purpose sentence to its schema's Purpose paragraph and adds the one moved rule to `phase-schema.md`, keeping each file's own wrapping: rules that wrap do so at 96 columns with a two-space continuation, and rules written one to a line stay one to a line.

```js
// Applies the spec's appendix to core/ and packs/: one-off, run from the repository root.
import fs from "node:fs";
const spec = fs.readFileSync("docs/superpowers/specs/2026-10-03-a-rule-opens-with-its-subject-design.md", "utf8");
const appendix = spec.slice(spec.indexOf("## Appendix: every rule"));
const WIDTH = 96;
let wrapped = true;
const wrap = (text, first, rest) => {
  if (!wrapped) return [first + text.split(/\s+/).filter(Boolean).join(" ")];
  const out = []; let line = first;
  for (const w of text.split(/\s+/).filter(Boolean)) {
    if (line.length > rest.length && (line + " " + w).length > WIDTH) { out.push(line); line = rest + w; }
    else line += (line === first || line === rest ? "" : " ") + w;
  }
  out.push(line); return out;
};
const unq = (s) => s.replace(/\\\|/g, "|").trim();
const sections = [...appendix.matchAll(/^### (\S+) \((core|software)\)\n([\s\S]*?)(?=^### |\Z)/gm)];
const report = [];
for (const [, type, where, body] of sections) {
  const path = where === "core" ? `core/${type}-schema.md` : `packs/software/${type}-schema.md`;
  let text = fs.readFileSync(path, "utf8");
  const lines = text.split("\n");
  const start = lines.indexOf("## Writing rules");
  let end = lines.findIndex((l, i) => i > start && /^## /.test(l)); if (end < 0) end = lines.length;
  const bullets = [];
  for (let i = start + 1; i < end; i++) {
    if (/^[-*]\s+\S/.test(lines[i])) bullets.push({ from: i, to: i + 1 });
    else if (/^\s+\S/.test(lines[i]) && bullets.length) bullets[bullets.length - 1].to = i + 1;
  }
  wrapped = lines.slice(start + 1, end).some((l) => /^\s+\S/.test(l));
  const rows = body.split("\n").filter((l) => /^\| (r\d+|new) \|/.test(l)).map((l) => {
    const cells = l.slice(1, -1).split(/(?<!\\)\|/).map((c) => c.trim());
    return { id: cells[0], becomes: unq(cells.slice(3).join("|")) };
  });
  const purpose = [];
  const out = new Map();
  const extra = [];
  for (const r of rows) {
    if (r.id === "new") { extra.push(r.becomes.replace(/^Moved here from [^:]+: /, "")); continue; }
    const k = Number(r.id.slice(1)) - 1;
    if (!bullets[k]) { report.push(`${path} ${r.id}: no such bullet`); continue; }
    const b = r.becomes;
    if (/^unchanged/.test(b)) continue;
    if (/^Dropped:/.test(b) || /^Moved to /.test(b)) { out.set(k, []); continue; }
    const p = b.match(/^→ Purpose; check owed: "(.*)"$/);
    if (p) { out.set(k, []); purpose.push(p[1]); continue; }
    const also = b.match(/^(.*?) Also → Purpose; check owed: "(.*)"$/);
    if (also) { out.set(k, wrap(also[1], "- ", "  ")); purpose.push(also[2]); continue; }
    out.set(k, wrap(b, "- ", "  "));
  }
  const newRules = [];
  bullets.forEach((b, k) => {
    if (out.has(k)) newRules.push(...out.get(k)); else newRules.push(...lines.slice(b.from, b.to));
  });
  for (const e of extra) newRules.push(...wrap(e, "- ", "  "));
  const before = lines.slice(0, bullets[0]?.from ?? start + 1);
  const after = lines.slice(bullets.length ? bullets[bullets.length - 1].to : start + 1);
  let next = [...before, ...newRules, ...after];
  if (purpose.length) {
    const ps = next.indexOf("## Purpose");
    let a = ps + 2, z = a; while (z < next.length && next[z] !== "") z++;
    wrapped = z - a > 1;
    const para = next.slice(a, z).join(" ") + " " + purpose.join(" ");
    next = [...next.slice(0, a), ...wrap(para, "", ""), ...next.slice(z)];
  }
  fs.writeFileSync(path, next.join("\n"));
  report.push(`${path}: ${out.size} changed, ${purpose.length} to Purpose, ${extra.length} added`);
}
console.log(report.join("\n"));
```

- [ ] **Step 2: Apply it and read the totals**

Run from the worktree root: `node <scratchpad>/apply-appendix.mjs | awk '{c+=$2; p+=$4; a+=$7} /no such/ {print} END{print "changed",c,"purpose",p,"added",a}'`, then `sh conventions/conventions-format fix`. Expected: `changed 179 purpose 14 added 1`, no "no such bullet" line, and the form fix reports the files it rewrote. Then `git diff --stat` shows 38 schema files.

- [ ] **Step 3: Confirm every check a dropped rule leans on exists**

For each appendix row that says "Dropped: held by …", find the check it names in `lib/checks.mjs` or `bin/check-instance.mjs` by its failure message (`grep -n` for the words it quotes). If a named check does not exist, restore that one rule from `git show HEAD:<schema>`, and record it in the PR body and the ledger as `Ruling: <type> rN kept — the check the appendix names does not exist — cost if wrong: one rule the judge still asks`.

- [ ] **Step 4: Move the tests and faults off old numbers and openings**

In `tools/judge-faults.mjs`, change three fault openings to the rules' new ones:

- `rule: "A list of tools or a stack is not an achievement",` → `rule: "`## Achievements` holds no list of tools or stack",`
- `rule: "Where an instance defines achievement kinds",` → `rule: "`## Achievements`, where an instance defines achievement kinds",`
- `rule: "A period still running has no `end`",` → `rule: "The tagline of a period still running says so",`

In `verify/questions.test.mjs`, after `const NORTHWIND = …`, add a lookup and use it wherever a test names experience r14, experience r12 or concept r4:

```js
// A rule's number moves when a rule before it leaves, so the tests find a rule by its opening.
const idOf = (type, opening) => {
  const i = writingRulesOf(schema(type)).findIndex((r) => r.startsWith(opening));
  assert.ok(i >= 0, `no ${type} rule opens "${opening}"`);
  return `r${i + 1}`;
};
const ENDING = idOf("experience", "`## Ending`");
const WHAT = idOf("experience", "`What`");
const AS = idOf("concept", "`As`");
```

Replace `"r14"` with `ENDING`, `"r12"` with `WHAT`, `"r4"` with `AS` in the four tests from "a page is asked every writing rule whose subject it has" through "a table without the optional column its rule is about leaves the rule unasked"; replace `writingRulesOf(schema("experience"))[13]` with `writingRulesOf(schema("experience"))[Number(ENDING.slice(1)) - 1]`; and in "a rule's subject is the section or table column its opening names, never a field" replace `of("experience", 14)` with `of("experience", Number(ENDING.slice(1)))` and `of("concept", 4)` with `of("concept", Number(AS.slice(1)))`. Move the `idOf` block above that test if it sits before `NORTHWIND`, so it is defined before use. In the same test, `of("concept", 6)` named a rule that is now dropped: replace it with `assert.equal(subjectOf("A rule that opens with no name.", subjectsOf(schema("concept"))), null, "a rule with no opening name is asked as now");`.

In `verify/judge.test.mjs`, the CLI test's line `` /^ {2}concept r4: not asked of 1 without an `As` column$/m `` becomes `` /^ {2}concept r3: not asked of 1 without an `As` column$/m ``, since concept r3 left and `As` is now r3.

- [ ] **Step 5: Run the judge suite and the rest**

Run: `npm run test:judge` Expected: PASS. If a test still names a rule by an old number or opening, move it the same way.

Run: `npm run verify && for t in instance instance-checks instance-files form rules cli plan seats pins ids localization untar fetch-core obsidian; do npm run test:$t || exit 1; done` Expected: every run passes.

- [ ] **Step 6: Say it in CONVENTIONS**

In `core/CONVENTIONS.md`, in the paragraph that opens "`## Purpose` and `## Writing rules` come last", after the sentence ending "whether a field is required is the table's business, not theirs.", add:

```
A rule opens with its subject, the thing on the page it is about: a section, a frontmatter field or a column its schema declares, in backticks and after at most a short lead-in such as "Each line of"; "The H1"; "The tagline", or the tagline's label from the sections table; or "The page", for the whole file. A rule about whether a field is there opens with what is always there instead, since presence is the table's. A sentence that cannot be checked on one page, that no page can break or that predicts how two readers would agree is not a writing rule: a check holds it, or the schema's Purpose says it once.
```

Run `sh conventions/conventions-format && sh conventions/conventions-check`. Expected: both pass.

- [ ] **Step 7: Commit**

```bash
git add core packs tools/judge-faults.mjs verify/questions.test.mjs verify/judge.test.mjs
git commit --author='Implementer <implementer@companygraph.io>' -F- <<'EOF'
Every writing rule opens with its subject

The appendix of the #254 spec is applied to core and the software pack: 125 rules are reworded to open with what they are about, 40 that a check holds, that no page can break or that predicted agreement are dropped, one moves to the phase schema and 13 keep their norm as a sentence in their schema's Purpose. CONVENTIONS says so in its paragraph on writing rules. The judge's tests and planted faults now find a rule by its opening, since numbers moved.

Verified: npm run verify and every test:* script pass; sh conventions/conventions-format and conventions-check pass; each check a dropped rule names was found in lib/checks.mjs or bin/check-instance.mjs.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: <the model that wrote this commit>
EOF
git log -1 --format='[%s]'
```

### Task 2: `verify` holds the opening

**Files:**

- Modify: `lib/questions.mjs` (`Subjects` gains `label`; new export `openingOf`)
- Modify: `verify/check.mjs` (in the per-schema loop, beside the "is not a list" check)
- Modify: `types/lib/questions.d.mts` (rewritten by `npm run build`)
- Test: `verify/questions.test.mjs`

**Interfaces:**

- Consumes: `subjectsOf` from `lib/questions.mjs`; `sectionsOf`, `tableOf` from `lib/checks.mjs`.
- Produces:
  - `Subjects` becomes `{ sections: Set<string>; columns: Map<string, string[]>; fields: Set<string>; label: string | null }`, where `label` is the tagline's label from the sections table's `` `> [Label]` `` row, or null.
  - `export function openingOf(rule: string, subjects: Subjects): Opening | null`, where `Opening` is `{ kind: "section" | "field" | "column" | "fixed"; name: string }`. `kind: "fixed"` covers "The H1", "The tagline", the tagline's label and "The page", with `name` the words matched.

- [ ] **Step 1: Write the failing tests**

Add `openingOf` to the import from `../lib/questions.mjs`, and add after the test "no writing rule in core or a pack opens with a name that is both a field and a column":

```js
test("a rule opens with a declared subject, a fixed word, or a short lead-in to one", () => {
  const text = "# Thing Schema\n\n> A thing.\n\n## Frontmatter\n\n| Field | Required | Type | Description |\n| --- | --- | --- | --- |\n| `direction` | Yes | enum | Its direction. |\n\n## Sections\n\n| Section | Required | Description |\n| --- | --- | --- |\n| `# [Thing]` | Yes | Its name. |\n| `> [Statement]` | Yes | One line. |\n| `## Notes` | No | Table. |\n\n`## Notes` is a table with these columns:\n\n| Column | Required | Type | Description |\n| --- | --- | --- | --- |\n| `Line` | Yes | string | A line. |\n";
  const s = subjectsOf(text);
  assert.equal(s.label, "Statement");
  assert.deepEqual(openingOf("`## Notes` are short.", s), { kind: "section", name: "Notes" });
  assert.deepEqual(openingOf("Every row of `## Notes` is short.", s), { kind: "section", name: "Notes" });
  assert.deepEqual(openingOf("Each `Line` is a sentence.", s), { kind: "column", name: "Line" });
  assert.deepEqual(openingOf("`direction: target` is written only where …", s), { kind: "field", name: "direction" });
  assert.deepEqual(openingOf("The H1 names the thing.", s), { kind: "fixed", name: "The H1" });
  assert.deepEqual(openingOf("The statement says where.", s), { kind: "fixed", name: "The statement" });
  assert.deepEqual(openingOf("The page writes names and prose in American English (R14).", s), { kind: "fixed", name: "The page" });
  assert.equal(openingOf("A rule that names a phase and then `## Notes` is long.", s), null, "a lead-in longer than a few words hides the subject");
  assert.equal(openingOf("`## Missing` is short.", s), null, "a section the schema does not declare");
  assert.equal(openingOf("Names and prose are American English (R14).", s), null);
});

test("a tagline label that is a phrase gives no fixed word of its own", () => {
  const text = "# Thing Schema\n\n> A thing.\n\n## Frontmatter\n\n| Field | Required | Type | Description |\n| --- | --- | --- | --- |\n| `id` | Yes | string | Its id. |\n\n## Sections\n\n| Section | Required | Description |\n| --- | --- | --- |\n| `> [What it gives]` | Yes | One line. |\n";
  const s = subjectsOf(text);
  assert.equal(openingOf("The what it gives says it.", s), null);
  assert.deepEqual(openingOf("The tagline says it.", s), { kind: "fixed", name: "The tagline" });
});

test("every writing rule in core and the packs opens with its subject", () => {
  const dirs = [new URL("../core/", import.meta.url), ...fs.readdirSync(new URL("../packs/", import.meta.url), { withFileTypes: true })
    .filter((d) => d.isDirectory()).map((d) => new URL(`../packs/${d.name}/`, import.meta.url))];
  for (const dir of dirs)
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith("-schema.md"))) {
      const text = fs.readFileSync(new URL(f, dir), "utf8"), s = subjectsOf(text);
      writingRulesOf(text).forEach((rule, i) => assert.ok(openingOf(rule, s), `${f} r${i + 1}: "${rule.slice(0, 70)}"`));
    }
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test verify/questions.test.mjs` Expected: FAIL on the import of `openingOf`.

- [ ] **Step 3: Read the label and the opening**

In `lib/questions.mjs`, add `label: string | null` to the `Subjects` typedef, add the `Opening` typedef, and in `subjectsOf` read the label from the uncaptioned sections table: in the `else if (!b.grouped)` loop, also match `` /^`>\s*\[(.+)\]`$/ `` on `r[0]` and keep the first match as `label` (declare `/** @type {string | null} */ let label = null;` and return `{ sections, columns, fields, label }`).

Add after `subjectOf`:

```js
// How a rule opens, read against its schema: a section, field or column the schema declares, in
// backticks and after at most a short lead-in ("Every row of", "Each line under"), or a fixed word
// for what every page has: the H1, the tagline by that word or by its label, and the page. A
// backticked `name: value` names the field. A rule that opens with none of these has said nothing a
// reader or a tool can find first, which CONVENTIONS asks of every writing rule in core.
/**
 * @param {string} rule
 * @param {Subjects} subjects
 * @returns {Opening | null}
 */
export function openingOf(rule, subjects) {
  const lead = rule.match(/^(?:(?:Each|Every|An?|One)(?: [^`\s]+){0,4} )?`([^`]+)`/);
  if (lead?.[1]) {
    const name = lead[1].trim();
    const heading = name.match(/^##\s+(.+)$/)?.[1]?.trim();
    if (heading) return subjects.sections.has(heading) ? { kind: "section", name: heading } : null;
    const field = name.replace(/:.*$/, "").trim();
    if (subjects.fields.has(field)) return { kind: "field", name: field };
    if (subjects.columns.has(name)) return { kind: "column", name };
    return null;
  }
  const fixed = rule.match(/^The (H1|tagline|page)\b/);
  if (fixed) return { kind: "fixed", name: `The ${fixed[1]}` };
  const label = subjects.label;
  if (label && !/^what\b/i.test(label) && rule.startsWith(`The ${label.toLowerCase()}`))
    return { kind: "fixed", name: `The ${label.toLowerCase()}` };
  return null;
}
```

In `verify/check.mjs`, import `subjectsOf, writingRulesOf, openingOf` from `../lib/questions.mjs` if not already imported, and after the `"## Writing rules" is not a list` check add:

```js
        // CONVENTIONS asks each rule to open with its subject, so a reader and the judge can tell
        // at once whether a page has anything for it to judge. Core and the packs are held to it;
        // an instance's own schema is not, and the judge asks such a rule of every page.
        const subjects = subjectsOf(text);
        writingRulesOf(text).forEach((rule, i) => {
          if (!openingOf(rule, subjects))
            fail(`${path}: writing rule r${i + 1} opens with no subject — a declared section, field or column in backticks, "The H1", the tagline or "The page": "${rule.slice(0, 60)}…"`);
        });
```

Use the variable that holds the schema's text in that loop (read the loop's opening lines for its name; it is the text `sectionsOf` was called on). If `verify/check.mjs` does not loop over `packs/*/`, add the packs' schemas to the same loop the way it reads `core/`.

- [ ] **Step 4: Run the tests and `verify`**

Run: `node --test verify/questions.test.mjs && npm run verify` Expected: PASS, and verify's count of checks passed is unchanged or one higher. If verify refuses a rule, the appendix left a rule without its subject: report it, do not reword it here.

- [ ] **Step 5: Typecheck, build, commit**

```bash
npm run typecheck && npm run build && npm run build:check
git add lib/questions.mjs types/lib/questions.d.mts verify/check.mjs verify/questions.test.mjs
git commit --author='Implementer <implementer@companygraph.io>' -F- <<'EOF'
verify holds that a writing rule opens with its subject

openingOf reads how a rule opens against its schema: a declared section, field or column in backticks, after at most a short lead-in, or the H1, the tagline by either name, or the page. verify refuses a rule in core or a pack that opens with none of them; an instance's own schema is not held to it.

Verified: node --test verify/questions.test.mjs passes, every core and pack rule among them; npm run verify passes; npm run typecheck and build:check pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: <the model that wrote this commit>
EOF
git log -1 --format='[%s]'
```

### Task 3: The judge reads fields too

**Files:**

- Modify: `lib/questions.mjs` (`Subject` gains `field`; `subjectOf` reads through `openingOf`; `hasSubject`; `without`)
- Modify: `types/lib/questions.d.mts` (rewritten by `npm run build`)
- Modify: `README.md` (the `judge [<folder>]` paragraph)
- Modify: `docs/superpowers/specs/2026-09-26-the-writing-rules-are-asked-design.md` (the field sentence in The questions)
- Test: `verify/questions.test.mjs`

**Interfaces:**

- Consumes: `openingOf`, `Opening`, `Subjects` from Task 2.
- Produces: `Subject` becomes `{ sections: string[]; column: string | null; field: string | null }`; `subjectOf` returns a `Subject` for a section, column or field opening and null for a fixed word or no opening.

- [ ] **Step 1: Write the failing tests**

In `verify/questions.test.mjs`, rename the test "a rule's subject is the section or table column its opening names, never a field" to "a rule's subject is the section, column or field its opening names", and replace its body's field assertion with:

```js
  assert.equal(of("experience", 1), null, "experience r1 opens with The H1, which every page has");
```

In "a column declared in two sections' tables stands for both", replace the `name` assertion with:

```js
  assert.deepEqual(subjectOf("`name` is the thing's own.", subjects), { sections: [], column: null, field: "name" }, "a name that is a field as well as a column is read as the field");
```

and change the expected `What` subject to `{ sections: ["Sources", "References"], column: "What", field: null }`. Change every other expected `Subject` literal in the file to carry `field: null`. Then add:

```js
const KPI_LIKE = "# Thing Schema\n\n> A thing.\n\n## Frontmatter\n\n| Field | Required | Type | Description |\n| --- | --- | --- | --- |\n| `id` | Yes | string | Its id. |\n| `read-with` | No | array of ref → thing | Another. |\n\n## Sections\n\n| Section | Required | Description |\n| --- | --- | --- |\n| `# [Thing]` | Yes | Its name. |\n| `> [Definition]` | Yes | One line. |\n\n## Writing rules\n\n- `read-with` names a thing that moves against this one.\n- The definition says what it counts.\n- Kept in mind whatever happens.\n";
const kpiLike = (fields) => {
  const entity = (path, f) => ({ path, type: "thing", name: path, id: path, owner: null, tagline: "", sections: [], fields: f });
  const graph = { entities: [entity("things/a.md", fields)] };
  return questionsOf({ graph, files: new Map([["things/a.md", "# A\n"]]), schemas: new Map([["thing-schema.md", KPI_LIKE]]) });
};

test("a rule about a field is asked only of a page that carries the field", () => {
  const without = kpiLike({ id: "x" });
  assert.deepEqual(without.asked[0].questions.map((q) => q.id), ["r2", "r3"]);
  assert.equal(without.skipped[0].without, "without `read-with`");
  const empty = kpiLike({ id: "x", "read-with": [] });
  assert.deepEqual(empty.asked[0].questions.map((q) => q.id), ["r2", "r3"], "an empty list is no value");
  const withIt = kpiLike({ id: "x", "read-with": ["Other"] });
  assert.deepEqual(withIt.asked[0].questions.map((q) => q.id), ["r1", "r2", "r3"]);
});

test("a rule with no subject at its opening, as an instance's own schema may have, is asked of every page", () => {
  const { asked } = kpiLike({ id: "x" });
  assert.ok(asked[0].questions.some((q) => q.id === "r3" && q.rule === "Kept in mind whatever happens."));
});
```

If the example's `Entity` objects carry their frontmatter under another property than `fields`, read `lib/instance.mjs`'s `Entity` typedef and use that name here and in Step 3.

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test verify/questions.test.mjs` Expected: FAIL: the field rule is still asked of a page without the field, and the `Subject` literals lack `field`.

- [ ] **Step 3: Read fields as subjects**

In `lib/questions.mjs`, change the `Subject` typedef to `{ sections: string[]; column: string | null; field: string | null }`. Replace the body of `subjectOf` with:

```js
  const o = openingOf(rule, subjects);
  if (!o || o.kind === "fixed") return null;
  if (o.kind === "section") return { sections: [o.name], column: null, field: null };
  if (o.kind === "field") return { sections: [], column: null, field: o.name };
  return { sections: subjects.columns.get(o.name) ?? [], column: o.name, field: null };
```

and rewrite the comment above `subjectsOf`/`subjectOf` to say that a field now counts, because no core rule opens with a field whose presence it governs (CONVENTIONS), while a rule of an instance's own schema that opens with no subject is asked of every page.

Change `hasSubject` so a field subject reads the frontmatter:

```js
const hasSubject = (e, s) => {
  if (s.field !== null) {
    const v = e.fields[s.field];
    return v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);
  }
  return e.sections.some((x) => s.sections.includes(x.heading) && (s.column === null || x.tables.some((t) => t.columns.some((c) => c.replace(/`/g, "").trim() === s.column))));
};
```

and `without` so a field reads `without \`<field>\``:

```js
const without = (s) => (s.field !== null ? `without \`${s.field}\`` : s.column === null ? `without \`## ${s.sections[0]}\`` : `without ${an(s.column) ? "an" : "a"} \`${s.column}\` column`);
```

In `README.md`, in the `judge [<folder>]` paragraph, change "A rule that opens by naming a section, or a column of a section's table, is asked only of a page that has it" to "A rule that opens by naming a section, a field or a column of a section's table is asked only of a page that has it".

In `docs/superpowers/specs/2026-09-26-the-writing-rules-are-asked-design.md`, in The questions, replace "A name further into the sentence does not count, and a frontmatter field never does: several field rules govern whether the field is there at all, as the experience schema's first rule says when `role` is filled and when it is left absent, so an absent field is something such a rule judges." with "A name further into the sentence does not count. A frontmatter field counts too since #254, which reworded every core rule that governed whether a field is there to open with what is always there."

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm run test:judge` Expected: PASS, every test.

- [ ] **Step 5: Run the whole suite, typecheck, build, commit**

```bash
npm run verify && for t in judge instance instance-checks instance-files form rules cli plan seats pins ids localization untar fetch-core obsidian; do npm run test:$t || exit 1; done
npm run typecheck && npm run build && npm run build:check
sh conventions/conventions-format && sh conventions/conventions-check
git add lib/questions.mjs types/lib/questions.d.mts verify/questions.test.mjs README.md docs/superpowers/specs/2026-09-26-the-writing-rules-are-asked-design.md
git commit --author='Implementer <implementer@companygraph.io>' -F- <<'EOF'
The judge leaves out a rule about a field the page does not carry

subjectOf now reads a rule's subject through openingOf, so a rule that opens with a field is left out of a page whose frontmatter does not carry it, an empty list counting as none, and named under skipped as without that field. This was held back in #250 because a field rule could govern presence; since every core rule now opens with what it is about, none does. A rule of an instance's own schema that opens with no subject is still asked of every page.

Verified: npm run verify and every test:* script pass; npm run typecheck and build:check pass; sh conventions/conventions-format and conventions-check pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: <the model that wrote this commit>
EOF
git log -1 --format='[%s]'
```

- [ ] **Step 6: Run the judge without a key against the reference instance**

Run: `env -u TYPESAFE_API_KEY node bin/companygraph.mjs judge /Users/rob/git/robertblust/mental-model | tail -40` Expected: it prints questions, ends with the "left out, for want of what they are about:" block, and that block names field rules such as `kpi` and `rule` lines without `read-with`, `can-cost` or `motivated-by`. Paste the block into the PR body. The instance still vendors core 0.54.0, so its rules are the old ones; this run shows the judge reading fields, not the new wording.

### Task 4: The checks owed

**Files:** none in the repository.

- [ ] **Step 1: Open one issue listing the checks owed**

Run, from the worktree, with the "Checks owed" list from the spec's appendix as the body's list:

```bash
gh issue create -R companygraph/meta-model --title "Checks owed by rules that left the writing rules" --body "<one paragraph: #254 moved these norms into their schema's Purpose because no single page can break them, and each could be held mechanically; then the fourteen lines of the appendix's Checks owed, verbatim>"
```

Expected: an issue URL. Name it in the PR body.
