# A control names what covers its gap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A control can name, in the optional field `compensated-by`, the controls that hold a gap it is known to leave; R4 resolves the names, an instance check holds each named control to sharing a risk or a rule with the page, and the example carries one such edge.

**Architecture:** The field is one row of `core/control-schema.md`, which the grammar reads, so declaring it is all R4 and R16 need. The cross-page norm is a new check driven by a new `TypeEntry` property, `compensated`, set on the control's row of `TYPES`, so the check's code names no type, as the rule's `binds` does. The example gains one control and one edge.

**Tech Stack:** Node ES modules with no dependencies, `node --test`, TypeScript only for the JSDoc declarations in `types/`, git.

**Spec:** `docs/superpowers/specs/2026-10-17-a-control-names-what-covers-its-gap-design.md`

This plan covers meta-model only. The release, and each instance taking the field, follow in work of their own.

## Global Constraints

- Work in the worktree `/Users/rob/git/companygraph/meta-model-a-control-names-what-covers-its-gap`, branch `a-control-names-what-covers-its-gap`. Before any `node`, `npm` or `gh` command: `export PATH="/opt/homebrew/bin:$PATH"`.
- The field's schema row, exactly, placed directly after the `performed-by` row of `core/control-schema.md`:

  ```text
  | `compensated-by` | No | array of ref → control | The controls that hold a gap this one is known to leave, each the H1 of a file in `controls/`. Absent where no other control holds one. |
  ```

- The field cites no standard: no COSO, NIST, PCAOB or PCI in its description.
- The control's row of `TYPES` in `lib/checks.mjs` becomes exactly:

  ```js
  { type: "control", folder: "controls", compensated: { field: "compensated-by", shares: ["mitigates", "enforces"] } },
  ```

- The new check is named `a control holds the gap of another toward what that one is for`, cites `R16`, names no type in its code, and fails once per page and distinct name with exactly this message, the backticked names coming from the row:

  ```text
  <path>: `compensated-by` names "<name>", which shares no entry of `mitigates` or `enforces` with this control; a control holds the gap of another only toward what that one is for (R16)
  ```

  The spec's draft wording names "risk" and "rule"; the check reads them from the row and does not name types, so the message says "entry" instead.
- A name in `compensated-by` that resolves to no control is R4's finding, and the new check skips it. A page naming itself passes the check. Two controls naming each other pass.
- The example's new control is named exactly `An unapproved merge is read before the next release`, at `example/model/controls/an-unapproved-merge-is-read-before-the-next-release.md`. Its H1 carries no word that stems to "review".
- Every new page's id is a fresh UUID version 7 from `node bin/companygraph.mjs id`. No id is copied.
- No version bump, no release notes, no change to an instance, to mcp-server or to the spec. The release is the owner's.
- `lib/` carries its types as JSDoc and `types/` holds the declarations built from it. The task that changes `TypeEntry` runs `npm run typecheck`, then `npm run build`, and commits `types/` with it; `npm run build:check` confirms.
- Every commit is authored `--author "Implementer <implementer@companygraph.io>"`, its message in the git register of `conventions/WRITING.md`: a plain subject with no prefix and no period, one to three short paragraphs, cause before mechanism, a `Verified:` line naming the commands actually run, then a blank line and the trailers `Process: Delivery`, `Phase: Implement`, `Track: Code` and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, with no blank line between them.

## Review Focus

- A page that names one control twice in `compensated-by`, sharing nothing with it: one finding, not two. Pinned in Task 2.
- A page with `compensated-by` but no `mitigates` and no `enforces` of its own: each named control fails, since there is nothing to share. Pinned in Task 2.
- A name in `compensated-by` that names no entity at all: R4 fails it once, and the new check says nothing. Pinned in Task 2.
- A name in `compensated-by` that is a rule's H1: R4 fails it as the wrong type, and the new check says nothing. Pinned in Tasks 1 and 2.
- A covering control that shares only the risk, or only the rule: it passes. Pinned in Task 2.

---

### Task 1: The field in the control schema

**Files:**

- Modify: `core/control-schema.md` (the Frontmatter table, `## Purpose`, `## Writing rules`)
- Test: `verify/rule-risk-control.test.mjs`

**Interfaces:**

- Consumes: nothing from another task.
- Produces: the declared field `compensated-by` (`array of ref → control`), and in the test file the helpers `COVER`, `COVER_FM`, `cover(fm)`, `compensated(...names)` and the `more` option of `tree`, which Task 2 uses.

- [ ] **Step 1: Give the test tree room for a second control**

In `verify/rule-risk-control.test.mjs`, change the `tree` signature and the end of its `Map` so extra entries can be appended. Replace

```js
const tree = ({ rule = RULE_FM, ruleSections, risk = RISK_FM, control = CONTROL_FM, controlSections } = {}) => new Map([
```

with

```js
const tree = ({ rule = RULE_FM, ruleSections, risk = RISK_FM, control = CONTROL_FM, controlSections, more = [] } = {}) => new Map([
```

and replace the last entry's closing

```js
    controlSections ?? [["How it is carried out", ["Prose."]], appliesTo([["process", "Delivery", ""]])])],
]);
```

with

```js
    controlSections ?? [["How it is carried out", ["Prose."]], appliesTo([["process", "Delivery", ""]])])],
  ...more,
]);
```

Then add, directly after the `failuresOf` definition:

```js
// A second control, the one that holds the first one's gap: it mitigates the same risk and
// enforces the same rule, unless a test hands it other fields.
const COVER = "An unapproved merge is read before the next release";
const COVER_FM = ["source: Local", "kind: detective", "mode: manual", "performed-by: Reviewer",
  "mitigates:", "  - An unreviewed change reaches customers", "enforces:", "  - A change is reviewed before it ships"];
const cover = (fm = COVER_FM) => ["model/controls/an-unapproved-merge-is-read-before-the-next-release.md",
  page(fm, COVER, "The merges no second person approved are read before they ship.", [["How it is carried out", ["Prose."]]])];
const compensated = (...names) => [...CONTROL_FM, "compensated-by:", ...names.map((n) => `  - ${n}`)];
```

- [ ] **Step 2: Write the failing tests**

Append to `verify/rule-risk-control.test.mjs`:

```js
test("a control naming another control in compensated-by passes", () => {
  assert.deepEqual(failuresOf({ control: compensated(COVER), more: [cover()] }), []);
});

test("a compensated-by naming a rule fails as a reference to the wrong type", () => {
  assert.equal(failuresOf({ control: compensated("A change is reviewed before it ships") }, "`compensated-by`", "type rule").length, 1);
});

test("a control naming itself in compensated-by passes the mechanical checks; the writing rule refuses it", () => {
  assert.deepEqual(failuresOf({ control: compensated("Main requires a review") }), []);
});

test("two controls naming each other in compensated-by pass, since each may hold the other's gap", () => {
  const back = cover([...COVER_FM, "compensated-by:", "  - Main requires a review"]);
  assert.deepEqual(failuresOf({ control: compensated(COVER), more: [back] }), []);
});
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `node --test verify/rule-risk-control.test.mjs`

Expected: the four new tests FAIL. Three fail on a finding reading ``frontmatter field `compensated-by` is not declared by the control schema``; the wrong-type test fails because the only finding naming the field is that one, which does not say "type rule". Every test that was there before still passes.

- [ ] **Step 4: Declare the field**

In `core/control-schema.md`, directly after the row

```text
| `performed-by` | No | ref → seat | The seat that carries it out, for a manual control, the H1 of a file in `seats/` |
```

add the row

```text
| `compensated-by` | No | array of ref → control | The controls that hold a gap this one is known to leave, each the H1 of a file in `controls/`. Absent where no other control holds one. |
```

- [ ] **Step 5: Add the Purpose sentence**

In `## Purpose`, after the first sentence, which ends `(ISO 31000: a measure that maintains or modifies risk; COSO's control activities).`, insert one space and this sentence:

```text
Where another control holds a gap this one is known to leave, the page says what it lets through and names that control in `compensated-by`.
```

The paragraph stays one line.

- [ ] **Step 6: Add the two writing rules**

In `## Writing rules`, directly before the last bullet, `- The page writes names and prose in American English (R14).`, insert:

```text
- `compensated-by` names a control only where `## How it is carried out` says which gap of this control the named control is to hold, and that sentence does not repeat the name the field holds.
- `compensated-by` never names the control itself.
```

- [ ] **Step 7: Run the tests to see them pass**

Run: `node --test verify/rule-risk-control.test.mjs`

Expected: every test passes, the four new ones included.

- [ ] **Step 8: Hold the schema to its shape and the rules to how they open**

Run: `npm run verify && npm run test:instance-checks && npm run test:judge && sh conventions/conventions-format`

Expected: each exits 0. Check each exit code on its own (`echo $?` after the command) rather than through a pipe.

- [ ] **Step 9: Commit**

```bash
git add core/control-schema.md verify/rule-risk-control.test.mjs
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
A control can name the controls that hold its gap

Instances name the control that covers another's gap inside a sentence, where nothing resolves it. The control schema now declares compensated-by, an optional list of controls, with a Purpose sentence and two writing rules: the prose says which gap each named control holds without repeating its name, and a control never names itself.

Verified: node --test verify/rule-risk-control.test.mjs, npm run verify, npm run test:instance-checks, npm run test:judge and conventions-format pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

---

### Task 2: The check that a covering control shares a risk or a rule

**Files:**

- Modify: `lib/checks.mjs` (the `TypeEntry` JSDoc near line 74, the control's row of `TYPES` near line 166, and a new entry in the checks list directly after the check named `a rule binds more than one, or a control enforces it`)
- Modify: `types/lib/checks.d.mts` (written by `npm run build`, never by hand)
- Test: `verify/rule-risk-control.test.mjs`

**Interfaces:**

- Consumes: from Task 1, the declared field `compensated-by` and the test helpers `COVER`, `COVER_FM`, `cover(fm)`, `compensated(...names)` and `tree`'s `more` option.
- Produces: `TypeEntry.compensated`, typed `{ field: string, shares: string[] }`, and the check named `a control holds the gap of another toward what that one is for`.

- [ ] **Step 1: Write the failing tests**

Append to `verify/rule-risk-control.test.mjs`:

```js
const NOTHING_SHARED = "model/controls/main-requires-a-review.md: `compensated-by` names \"An unapproved merge is read before the next release\", which shares no entry of `mitigates` or `enforces` with this control; a control holds the gap of another only toward what that one is for (R16)";
const BARE_COVER_FM = ["source: Local", "kind: detective", "mode: manual", "performed-by: Reviewer"];

test("a covering control that shares only the rule passes", () => {
  const fm = [...BARE_COVER_FM, "enforces:", "  - A change is reviewed before it ships"];
  assert.deepEqual(failuresOf({ control: compensated(COVER), more: [cover(fm)] }), []);
});

test("a covering control that shares only the risk passes", () => {
  const fm = [...BARE_COVER_FM, "mitigates:", "  - An unreviewed change reaches customers"];
  assert.deepEqual(failuresOf({ control: compensated(COVER), more: [cover(fm)] }), []);
});

test("a covering control that shares neither a risk nor a rule fails once, naming both fields", () => {
  assert.deepEqual(failuresOf({ control: compensated(COVER), more: [cover(BARE_COVER_FM)] }), [NOTHING_SHARED]);
});

test("a covering control named twice and sharing nothing fails once", () => {
  assert.equal(failuresOf({ control: compensated(COVER, COVER), more: [cover(BARE_COVER_FM)] }, "shares no entry").length, 1);
});

test("a control with neither mitigates nor enforces of its own shares nothing with what it names", () => {
  const control = [...BARE_COVER_FM, "compensated-by:", `  - ${COVER}`];
  assert.equal(failuresOf({ control, more: [cover()] }, "shares no entry").length, 1);
});

test("a compensated-by name that resolves to nothing is R4's alone", () => {
  const failures = failuresOf({ control: compensated("A merge nobody wrote down") });
  assert.equal(failures.filter((f) => f.includes("\"A merge nobody wrote down\"")).length, 1);
  assert.equal(failures.filter((f) => f.includes("shares no entry")).length, 0);
});

test("a compensated-by naming a rule is R4's alone", () => {
  assert.equal(failuresOf({ control: compensated("A change is reviewed before it ships") }, "shares no entry").length, 0);
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test verify/rule-risk-control.test.mjs`

Expected: "a covering control that shares neither a risk nor a rule fails once, naming both fields", "a covering control named twice and sharing nothing fails once" and "a control with neither mitigates nor enforces of its own shares nothing with what it names" FAIL, since no check reports anything yet. The other four new tests pass already and must keep passing. Every test from Task 1 and before still passes.

- [ ] **Step 3: Declare the property in the JSDoc**

In `lib/checks.mjs`, in the `TypeEntry` typedef, directly after the line beginning ` * @property {{ section: string, by: string, field: string }} [binds]`, add:

```js
 * @property {{ field: string, shares: string[] }} [compensated] A list field naming entities of the page's own type, each of which shares at least one value with the page in one of the list fields `shares`: a control holds another's gap only toward a risk or a rule both answer to. A name that resolves to nothing is R4's and is not read.
```

- [ ] **Step 4: Set it on the control's row**

In `TYPES`, replace

```js
  { type: "control", folder: "controls" },
```

with

```js
  // A control holds the gap of another only toward what that one is for: a risk both mitigate
  // or a rule both enforce.
  { type: "control", folder: "controls", compensated: { field: "compensated-by", shares: ["mitigates", "enforces"] } },
```

- [ ] **Step 5: Write the check**

In the checks list of `lib/checks.mjs`, directly after the closing `},` of the check named `a rule binds more than one, or a control enforces it`, insert:

```js
  {
    // A control holds the gap of another only toward what that one is for, so each entity a page
    // names in the declared field shares at least one value with the page in one of the declared
    // list fields: a risk both mitigate or a rule both enforce. A name that resolves to no page of
    // the type is R4's and is not read here; a page naming itself shares everything and passes,
    // and the writing rule refuses it. A name written twice is one name. The field and what is
    // shared are stated on the type's row, so no type is named here.
    name: "a control holds the gap of another toward what that one is for",
    rule: "R16",
    run() {
      for (const t of TYPES) {
        if (!t.compensated) continue;
        const { field, shares } = t.compensated;
        const pages = pagesOf(t.type);
        // What each page of the type answers to, by its H1, one set per shared field.
        /** @type {Map<string, Map<string, Set<string>>>} */
        const answers = new Map();
        for (const { text, name } of pages) {
          if (!name) continue;
          const fm = frontmatterOf(text);
          answers.set(name, new Map(shares.map((s) => [s, new Set(fieldValues(fm, s))])));
        }
        for (const { path, text, name } of pages) {
          const own = name ? answers.get(name) : undefined;
          for (const named of new Set(fieldValues(frontmatterOf(text), field))) {
            const other = answers.get(named);
            if (!other) continue;
            if (shares.some((s) => [...(other.get(s) ?? [])].some((v) => own?.get(s)?.has(v)))) continue;
            fail(`${path}: \`${field}\` names "${named}", which shares no entry of ${shares.map((s) => `\`${s}\``).join(" or ")} with this ${t.type}; a ${t.type} holds the gap of another only toward what that one is for (R16)`);
          }
        }
      }
    },
  },
```

- [ ] **Step 6: Run the tests to see them pass**

Run: `node --test verify/rule-risk-control.test.mjs`

Expected: every test passes.

- [ ] **Step 7: Build the declarations**

Run: `npm run typecheck && npm run build && npm run build:check`

Expected: each exits 0, and `git status --short types/` shows `types/lib/checks.d.mts` modified with the `compensated` property.

- [ ] **Step 8: Run the suites the check list touches**

Run each and check its exit code on its own: `npm run verify`, `npm run test:instance-checks`, `npm run test:rules`, `npm run test:ids`, `npm run test:cli`.

Expected: each exits 0. `test:rules` holds that the new check cites a rule `core/CONVENTIONS.md` defines.

- [ ] **Step 9: Commit**

```bash
git add lib/checks.mjs types/lib/checks.d.mts verify/rule-risk-control.test.mjs
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
A covering control shares a risk or a rule with what it covers

Whether a named control holds a gap toward what the covered control is for needs both pages, so it is a check and not a sentence. A control's row now carries compensated, and a check reads it: each control a page names in compensated-by shares a value of mitigates or enforces with the page, or the page fails once for that name. A name R4 refuses is not read again.

Verified: node --test verify/rule-risk-control.test.mjs, npm run typecheck, npm run build, npm run build:check, npm run verify, npm run test:instance-checks, npm run test:rules, npm run test:ids and npm run test:cli pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

---

### Task 3: The example carries the edge

**Files:**

- Create: `example/model/controls/an-unapproved-merge-is-read-before-the-next-release.md`
- Modify: `example/model/controls/main-requires-a-review.md`
- Modify: `example/model/README.md:46` (the folder tree)

**Interfaces:**

- Consumes: from Task 1 the field, from Task 2 the check; both hold the example through `npm run verify`.
- Produces: the example's edge `Main requires a review` → `An unapproved merge is read before the next release`, which mcp-server's tests see once it re-pins the release.

- [ ] **Step 1: Generate the id**

Run: `node bin/companygraph.mjs id`

Expected: one lowercase UUID version 7, such as `01a1....`. Use it in Step 2 in place of `<id>`.

- [ ] **Step 2: Write the new control**

Create `example/model/controls/an-unapproved-merge-is-read-before-the-next-release.md`:

```markdown
---
id: <id>
source: Local
kind: detective
mode: manual
mitigates:
  - An unreviewed change reaches customers
enforces:
  - A change is reviewed before it ships
performed-by: Reviewer
---

# An unapproved merge is read before the next release

> Before a release goes out, every change merged without a second person's approval is read by one.

## How it is carried out

Before Release, the Reviewer lists the pull requests merged to the default branch without an approving review from someone other than their author, from the repository host's pull request reviews, and reads each against what was asked; a finding holds the release until it is settled.

## Applies to

| Type | Entity | Owner |
| --- | --- | --- |
| phase | Release | Delivery |
```

- [ ] **Step 3: Name it from the control whose gap it holds**

In `example/model/controls/main-requires-a-review.md`, add to the frontmatter, after the `enforces:` list and before the closing `---`:

```yaml
compensated-by:
  - An unapproved merge is read before the next release
```

and replace the paragraph under `## How it is carried out` with:

```text
A branch protection rule on the default branch requires one approving review before any pull request merges, and dismisses an approval when new commits are pushed after it. A repository admin can merge past the rule, and for that change the protection holds nothing until the merge is read after it lands.
```

- [ ] **Step 4: Add the file to the example's tree**

In `example/model/README.md`, replace

```text
controls/                        main-requires-a-review.md
```

with

```text
controls/                        main-requires-a-review.md,
                                 an-unapproved-merge-is-read-before-the-next-release.md
```

- [ ] **Step 5: Hold the example to every check**

Run: `npm run verify`

Expected: exit 0, with no finding on either control page. A finding naming `compensated-by` means Step 2 or 3 left the two pages without a shared risk or rule; read the finding, fix the page, and run it again.

- [ ] **Step 6: Run every suite**

Run each script in `package.json` and check each exit code on its own: `npm run build:check`, `npm run verify`, then every `test:*` script (`test:instance`, `test:instance-checks`, `test:instance-files`, `test:form`, `test:pins`, `test:ids`, `test:localization`, `test:plan`, `test:rules`, `test:cli`, `test:consumer`, `test:untar`, `test:fetch-core`, `test:obsidian`, `test:judge`, `test:seats`, `test:gate`), then `sh conventions/conventions-format` and `sh conventions/conventions-check`.

Expected: each exits 0. A suite that needs the network or a credential this machine lacks is reported as not run, with its output, never as passed.

- [ ] **Step 7: Commit**

```bash
git add example/model/controls/an-unapproved-merge-is-read-before-the-next-release.md example/model/controls/main-requires-a-review.md example/model/README.md
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
The example's review rule names what holds its admin gap

The example now shows the edge the field draws, so the checks and the MCP server's tests read it. Main requires a review says a repository admin can merge past it and names a new detective control, An unapproved merge is read before the next release, which the Reviewer carries out before Release and which answers to the same risk and rule. Its name carries no stem of review, so mcp-server's search test keeps its name tier when it re-pins.

Verified: npm run build:check, npm run verify, every test:* script, conventions-format and conventions-check pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```
