# Requirement and use-case realization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An instance that takes the requirements pack can define its own realization levels for requirements and use cases, and a requirement or use case can name the level it has reached, say in `## Realization` what is realized and what is missing, and list in `## Evidence` the rows that satisfy or verify it. One check holds each page to what its level asks for. The example defines levels, and its one requirement names one.

**Architecture:** Two new types go in `PACKS.requirements`, each a flat folder of level pages in the shape of core's decision status, plus `rank` and `evidence`. The requirement and use-case schemas each gain an optional `realization` field and two optional sections. One new declared key on a type's row, `evidenced`, drives one new check in `instanceChecks` that reads the field, the level's field, the section and the column from the row and names no type. The grammar already holds everything a single page says: R4 for the reference, R8 for the two enums, and the existing rank check for `rank`.

**Tech Stack:** Node ES modules with no dependencies, `node --test`, TypeScript only for the JSDoc declarations in `types/`, git.

**Spec:** `docs/superpowers/specs/2026-10-27-requirement-and-use-case-realization-design.md`

This plan covers meta-model only. The instance the type comes from moves its scale into its model, and its design repository reads the scale from there, in a plan of their own written once this release is tagged, since both pin the released schemas.

## Global Constraints

- Two new types, exactly: `requirement-realization` at `requirement-realizations` and `use-case-realization` at `use-case-realizations`. Neither is owned, and neither owns anything.
- Level fields, exactly, in this order, on both types: `id` (Yes, string), `source` (Yes, `ref → source`), `source-id` (No, string), `rank` (Yes, number), `evidence` (Yes, enum: `none`, `satisfies`, `verifies`, in that order).
- Level sections, exactly, on both types: `# [Label]` (Yes), `> [Summary]` (Yes), `## What it means` (Yes), `## References` (No, Table: `What` Yes string, `URL` Yes string).
- On `requirement`, after `follows`: `realization` (No, `ref → requirement-realization`). On `use-case`, after `includes`: `realization` (No, `ref → use-case-realization`).
- New sections on `requirement`, between `## Applies to` and `## References`: `## Realization` (No), then `## Evidence` (No, Table). On `use-case`, the same two between `## Success guarantees` and `## References`.
- `## Evidence` columns, exactly, on both: `What` (Yes, string), `Shows` (Yes, enum: `satisfies` or `verifies`), `URL` (Yes, string).
- Every enum's tokens are written in its Description as R8 reads them: backticked, comma-separated, the last after `or`, then a period.
- Every writing rule opens with a declared section, field or column in backticks, "The H1", the tagline or "The page", which is what `verify` holds.
- `PACKS.requirements` ends this plan as exactly these four rows:

  ```js
  { type: "use-case", folder: "use-cases", labels: [{ section: "Main success scenario", column: "Step" }, { section: "Extensions", column: "Step" }], acyclic: "includes", descends: { field: "includes", by: "level" }, branches: { section: "Extensions", column: "Step", from: { section: "Main success scenario", column: "Step" } }, evidenced: { field: "realization", by: "evidence", section: "Evidence", column: "Shows", says: "Realization" } },
  { type: "requirement", folder: "requirements", evidenced: { field: "realization", by: "evidence", section: "Evidence", column: "Shows", says: "Realization" } },
  { type: "requirement-realization", folder: "requirement-realizations" },
  { type: "use-case-realization", folder: "use-case-realizations" },
  ```

- The check names no type in its code. It reads everything from the type's row and cites R16.
- No core schema changes, and core's `TYPES` is not edited. R20 holds: the new schemas name `source` and each other's pack types only.
- Each schema id and each new example page id is a fresh UUID version 7 from `node bin/companygraph.mjs id`. No id is copied.
- Test fixtures and example content name no real company, product or person. Fixtures extend the restaurant tree already in `verify/requirements.test.mjs`. The example is the fictional company it already describes, and no page or commit names it.
- No version bump in this plan. The release, its number and its notes are the owner's. The spec calls it minor.
- Commits: the spec and this plan as `Planner <planner@companygraph.io>`, every task as `Implementer <implementer@companygraph.io>`, unless the owner names another author before execution. Each message is in the git register, ends with a `Verified:` line naming the commands actually run, then the trailers `Process: Delivery`, `Phase: Implement` (`Phase: Plan` for the plan commit), `Track: Code` and the `Co-Authored-By` line.
- Before the first commit in the worktree, run `sh conventions/conventions-sync sync` so the commit-msg hook is active, then check `git config user.email`.
- A task that changes `TypeEntry` runs `npm run typecheck`, then `npm run build`, and commits `types/` with it. `npm run build:check` confirms.
- Before any `node`, `npm` or `gh` command: `export PATH="/opt/homebrew/bin:$PATH"`.
- Work in the worktree `../meta-model-requirement-status` on the branch `requirement-status`, which carries the spec and this plan.
- Every Markdown file written or edited passes `sh conventions/conventions-format` and `sh conventions/conventions-check` before it is committed.

## Review Focus

- A `realization` that names no level is R4's alone. The evidence check doesn't judge the page, so there's one finding, not two. Pinned in Task 2.
- A level whose `evidence` is missing or off its tokens is the required-field check's or R8's, and pages at that level are not judged against it. Pinned in Task 2.
- A row whose `Shows` is off its tokens (`tests`) is R8's. The page waits on that finding, so it doesn't also fail for having no verifying row. Pinned in Task 2.
- An `## Evidence` table whose header isn't the schema's is not read as evidence. The section is present, so the "sections need a level" half still sees it. Pinned in Task 2.
- An instance that takes the pack and defines no levels, with pages that name no `realization` and carry neither section, passes exactly as before. The existing fixture tree and the example prove it. Pinned in Tasks 1 and 3.

---

### Task 0: The spec and the plan are on the branch

**Files:**

- Add: `docs/superpowers/specs/2026-10-27-requirement-and-use-case-realization-design.md`
- Add: `docs/superpowers/plans/2026-10-27-requirement-and-use-case-realization.md`

- [ ] **Step 1:** Run `sh conventions/conventions-sync sync`, `sh conventions/conventions-format` and `sh conventions/conventions-check`. Expected: all exit 0.
- [ ] **Step 2:** Commit the spec as `Specifier <specifier@companygraph.io>` (`Phase: Spec`), then the plan as `Planner <planner@companygraph.io>` (`Phase: Plan`), each with `Process: Delivery` and `Track: Code`.

### Task 1: The pack ships two level schemas, and the requirement and use case can name a level

**Files:**

- Create: `packs/requirements/requirement-realization-schema.md`
- Create: `packs/requirements/use-case-realization-schema.md`
- Modify: `packs/requirements/requirement-schema.md`, `packs/requirements/use-case-schema.md`, `packs/requirements/README.md`
- Modify: `lib/checks.mjs` (`PACKS.requirements`: add the two level rows, plain, as in Global Constraints; `evidenced` comes in Task 2)
- Modify: `README.md` (the `requirements` sentence in the packs paragraph)
- Test: `verify/requirements.test.mjs`, `verify/cli.test.mjs`

**Interfaces:**

- Produces: the four schemas as the Global Constraints say. In the fixture tree in `verify/requirements.test.mjs`: three requirement levels, `Verified` (rank 30, `evidence: verifies`), `Built` (rank 20, `evidence: satisfies`) and `Not started` (rank 10, `evidence: none`), and two use-case levels, `Runs end to end` (rank 20, `evidence: verifies`) and `Not started` (rank 10, `evidence: none`), under `model/requirement-realizations/` and `model/use-case-realizations/`. A helper `level({ h1, rank, evidence })` writes one. `requirement()` and `useCase()` take optional `realization`, `realized` (the `## Realization` text) and `evidence` (rows `[What, Shows, URL]`).

- [ ] **Step 1: Write the failing tests** in `verify/requirements.test.mjs`. Add the two new schemas and the level pages to `tree()`. `Booking confirmed within two seconds` names `realization: Verified` with `## Realization` and one row `["Timing test of the booking confirmation", "verifies", "https://example.org/booking/blob/0a1b2c3/test/confirm.test.js"]`. `Book a table` names `realization: Runs end to end` with a `verifies` row.
  - `test("a requirement and a use case realized to a level pass")`: `assert.deepEqual(failures(tree()), [])`.
  - `test("a realization naming no level fails once, by R4")`: change `realization: Verified` to `realization: Shipped`, then exactly one failure, matching `/\(R4\)/`.
  - `test("a Shows off its tokens fails once, by R8")`: change `| verifies |` to `| tests |` on the requirement, then exactly one failure, matching `/\(R8\)/`.
  - `test("an evidence level off its tokens fails once, by R8")`: change `evidence: verifies` to `evidence: tested` on `Verified`, then exactly one failure, matching `/\(R8\)/`.
  - `test("two levels sharing a rank fail")`: set `Built` to rank 30, then `only(f, "share a rank")` has length 1 (read the existing rank check's message for the exact words).
  - `test("a page that names no realization and carries neither section passes")`: drop `realization`, `## Realization` and `## Evidence` from both pages, then `[]`.
  - In `verify/cli.test.mjs`, `init --pack requirements`: assert all four schemas under `meta/requirements/`, and the folders `model/requirement-realizations` and `model/use-case-realizations`.
- [ ] **Step 2: Run** `node --test verify/requirements.test.mjs verify/cli.test.mjs`. Expected: FAIL. The schemas are missing and the types are unknown.
- [ ] **Step 3: Write the two level schemas.** Copy `core/decision-status-schema.md` for the shape. Write each File Location paragraph from the spec's "The two types". The `rank` Description is the spec's sentence. The `evidence` Description is: "`none`, `satisfies` or `verifies`. What a requirement at this level must show in its `## Evidence`: nothing; at least one row, of either kind; or at least one row whose `Shows` is `verifies` (SysML's satisfy and verify)." It reads "use case" on the second schema. Purpose: a level answers "how far is this realized, and what shows it?" for whoever relies on the product meeting it. It isn't a status, and how far the specification answers the requirement is derived from the decisions and questions that name it. Writing rules, each opening as `verify` asks:
  - "`## What it means` says what a page at this level has realized, what moves a page into the level and out of it, and what a reader may rely on while it is there."
  - "`evidence` is the least a page at this level must show, and a level above another asks at least what the one below asks."
  - "The H1 names how far the page is realized, `Built`, `Verified`, and never a verdict on the work."
  - "The page writes names and prose in American English (R14)."
- [ ] **Step 4: Edit the requirement and use-case schemas.** Add the field row, the two Sections rows, and the `## Evidence` column caption and table, as the Global Constraints say. `## Realization` Description: "What is realized and what is missing, measured against `## Fit criterion`". For a use case: "against its scenario, extensions and guarantees". `## Evidence` Description: "Table. What satisfies or verifies the realization, each at the commit it was seen at; its columns are declared below." `Shows` Description: "`satisfies` or `verifies`. The row builds the requirement, or it observes what the fit criterion observes (SysML)." `URL`: "Where it is, a permalink at the commit it was seen at". The requirement's `## References` Description drops "the test that proves it". Writing rules on the requirement:
  - Replace the status rule with: "The page holds no priority, status, release or date, since each moves, and a References row says where they are kept. `realization` is the one value on the page that moves, and `## Evidence` is what shows it."
  - Add: "`## Realization` and `## Evidence` stand only on a page that names a `realization`."
  - Add: "`URL`, in `## Evidence`, is a permalink at a commit, never a branch."
  - Add: "`## Evidence` holds the test that verifies the requirement, and `## References` holds the documents it was drawn from."
  - Add the first three of these to the use case too.
- [ ] **Step 5: Add the two plain rows to `PACKS.requirements`**, with one comment line in the style of the rows above: a level owns nothing, and every page realized to it names it.
- [ ] **Step 6: Edit `packs/requirements/README.md`.** Add two rows to the type table. Add a paragraph on realization: how far a build realizes a requirement or use case, held to its evidence. Add the sources ArchiMate 3 realization, SysML 1.7 clause 16, OpenUP requirement attributes and NASA TRL definitions, with the URLs the spec gives. Add the three departures from the spec. In "Left for later", replace "SysML's derive, satisfy and verify" with "SysML's derive". Also add the two types to the `requirements` sentence in the root `README.md`.
- [ ] **Step 7: Run** `node --test verify/requirements.test.mjs verify/cli.test.mjs`, `npm run verify`, `sh conventions/conventions-format` and `sh conventions/conventions-check`. Expected: all pass.
- [ ] **Step 8: Commit** with the subject "A requirement and a use case can name how far they are realized".

### Task 2: A page shows what its level asks for

**Files:**

- Modify: `lib/checks.mjs` (`TypeEntry` JSDoc, `PACKS.requirements` rows for `use-case` and `requirement`, and one new entry in the checks array, placed after `branches`)
- Modify: `types/` (built)
- Test: `verify/requirements.test.mjs`

**Interfaces:**

- Consumes: the fixture tree and helpers from Task 1. Uses the existing `refTargetOf`, `pagesOf`, `frontmatterOf`, `fmScalar`, `entityNamed`, `fieldsOf`, `enumTokensOf`, `sectionsOf`, `schemaTableOf` and `fail` inside `instanceChecks`.
- Produces: `@property {{ field: string, by: string, section: string, column: string, says: string }} [evidenced]` on `TypeEntry`. A page that names in `field` an entity carrying `by: satisfies` has at least one `section` row. With `by: verifies`, it has at least one row whose `column` is `verifies`. A page naming `field` has the section `says`, and a page with `says` or `section` names `field`. A `field` naming nothing is R4's. A `by` that is missing or off its tokens is the required-field check's or R8's. A `column` cell off its tokens is R8's. In each of those cases the page is not judged.

- [ ] **Step 1: Write the failing tests.** Each asserts exactly one failure and its whole message.
  - `test("a page at a satisfies level with no evidence row fails once")`: set the requirement to `realization: Built` and drop `## Evidence`, then `/^model\/requirements\/booking-confirmed-within-two-seconds\.md: `realization` names "Built", whose `evidence` is `satisfies`, and ## Evidence has no row; a page shows what its level asks \(R16\)$/`.
  - `test("a page at a verifies level whose rows only satisfy fails once")`: on the requirement, change `| verifies |` to `| satisfies |`, then `/: `realization` names "Verified", whose `evidence` is `verifies`, and no ## Evidence row's `Shows` is `verifies`; a page shows what its level asks \(R16\)$/`.
  - `test("a page that names a realization and says nothing of it fails once")`: drop `## Realization`, then `/: names a `realization` and has no ## Realization; a realized page says what is realized and what is missing \(R16\)$/`.
  - `test("evidence on a page that names no realization fails once")`: drop the `realization` line only, then `/: has ## Evidence and names no `realization`; the sections belong to a realization \(R16\)$/`. A second case with `## Realization` only gives the same message with `## Realization`.
  - `test("a satisfies level is met by a verifying row, and a none level may list rows")`: the requirement at `Built` with its `verifies` row passes. At `Not started` with the same row and `## Realization`, it passes too.
  - `test("a use case is held as a requirement is")`: `Book a table` at `Runs end to end` with only a `satisfies` row fails once, with the `verifies` message naming `model/use-cases/book-a-table.md`.
  - `test("a fault another check owns is not judged again")`: assert three cases, each of exactly one failure. `realization: Shipped` gives `(R4)`. `Shows` `tests` at a `verifies` level gives `(R8)`. `evidence` removed from `Verified` gives the required-field check's message (read its form in `lib/checks.mjs`).
  - `test("an Evidence table with other columns is not read as evidence")`: rename the header `Shows` to `Kind`, then the failures include the section's own column finding, and none matches `/no ## Evidence row/`.
- [ ] **Step 2: Run** `node --test verify/requirements.test.mjs`. Expected: the new tests FAIL, with no check and no `evidenced` key.
- [ ] **Step 3: Add `evidenced` to the JSDoc and to the two `PACKS` rows**, exactly as in the Global Constraints, with a one-line comment above each row's addition: a realized page shows what its level asks, and says what is realized.
- [ ] **Step 4: Implement the check** `name: "a realized page shows what its level asks"`, `rule: "R16"`, in the comment style of the `beside` entry: why, what another check owns, and "Stated on the type's row; no type is named." Resolve the level type with `refTargetOf(t.type, field)` and its tokens with `enumTokensOf` on the level schema's `by` field. Count rows only from `schemaTableOf(t.type, section, text)`. Detect a section's presence with `sectionsOf(text).has(...)`. The four messages are the ones the tests pin.
- [ ] **Step 5: Run** `node --test verify/requirements.test.mjs`, `npm run test:instance-checks`, `npm run typecheck`, `npm run build` and `npm run build:check`. Expected: all pass.
- [ ] **Step 6: Commit** `lib/checks.mjs`, `types/` and the test with the subject "A realized page shows what its level asks for".

### Task 3: The example realizes its requirement

**Files:**

- Create: `example/model/requirement-realizations/README.md`, `verified.md`, `built.md`, `not-started.md`
- Modify: `example/model/requirements/a-copy-is-the-invoice-as-issued.md`
- Modify: `example/model/README.md` (the type list sentence and the tree)

**Interfaces:**

- Consumes: the schemas from Task 1 and the check from Task 2.

- [ ] **Step 1: Write the three levels**, each with a fresh id, `source: Local`, ranks 30, 20 and 10, and `evidence` set to `verifies`, `satisfies` and `none`. Each `## What it means` is written to the writing rules from Task 1. The folder README follows `example/model/requirements/README.md`, against `meta/requirements/requirement-realization-schema.md`.
- [ ] **Step 2: Realize the requirement.** Set `realization: Built`. `## Realization` says that a downloaded copy is rendered from the stored issued invoice, and that no test yet downloads a copy again after a credit note. Add one `## Evidence` row: `| Invoice rendering from the stored issue | satisfies | https://example.org/billing-service/blob/3f2a9c1/src/invoices/render.ts |`.
- [ ] **Step 3: Update `example/model/README.md`.** Add `requirement-realization` and `use-case-realization` to the sentence that lists the `requirements` pack's types, and add the `requirement-realizations/` line to the tree. `use-case-realization` stays unused in the example, as core allows.
- [ ] **Step 4: Run** `npm run verify`, `npm run test:instance-checks`, `sh conventions/conventions-format` and `sh conventions/conventions-check`. Expected: all pass.
- [ ] **Step 5: Commit** with the subject "The example's requirement names how far it is built".

### Task 4: Everything runs, and the pull request is open

- [ ] **Step 1: Run** every `test:*` script in `package.json`, then `npm run verify` and `npm run build:check`, each checked by its own exit code, never through a pipe.
- [ ] **Step 2: Leak search.** For every name `LOCAL.md` lists under the realization section, run `git grep -i` across the branch's diff against `origin/main` and the commit messages. Expected: no hit.
- [ ] **Step 3: Push** and open the pull request in the git register. The body is the commit bodies reread, with links to the spec and the plan. Report the checks, and stop. The owner merges and releases.
