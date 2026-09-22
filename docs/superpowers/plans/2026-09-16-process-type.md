# Process Type Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `process` and `phase` types to CompanyGraph core, release them as 0.25.0, and write the `Delivery` process and its three new seats into the reference instance.

**Architecture:** Two types in `core/`: `process` is a folder entity owning a collection of phases, exactly as `profile` owns `experiences`. A phase carries its seats and its gate in frontmatter as typed references, so the parser needs no change and R3/R4 check them for free. One process with two tracks rather than one process per kind of work — `Code` and `Prose` in the reference instance, and `Code` and `Docs` in this repository's example, which is a different fictional company. Work lands in two repositories in a fixed order: `companygraph/meta-model` merges and tags 0.25.0 first, then `robertblust/mental-model` re-pins and adds its process.

**Tech Stack:** Node ≥ 20, no dependencies. Markdown with YAML frontmatter. `node:test` for the suites. The checks are plain assertions in `lib/checks.mjs` and `verify/check.mjs`.

**Spec:** [`docs/superpowers/specs/2026-09-16-process-design.md`](../specs/2026-09-16-process-design.md) — read it before Task 1. The plan argues from it and does not restate its reasoning.

## Global Constraints

- **Prose is en-US.** No British spellings. `conventions/conventions-check` holds the whole repository to a stem list; run it before every commit.
- **The em dash is spaced** — like this — everywhere in prose.
- **Wrap prose at 100 columns.** Table rows are exempt; they cannot wrap.
- **Table separator cells are plain dashes**, `| --- |`, never `:---` or `---:` (R9).
- **Schema files follow R9's fixed order:** `# <Type> Schema`, `>` tagline, `**Owner:**` if owned, `## File Location`, `## Frontmatter`, `## Sections`, `## Purpose`, `## Writing rules`.
- **The type vocabulary is closed** (R9): `string`, `number`, `date`, `array`, `enum`, `ref → <type>`, `ref? → <type>`, `array of ref → <type>`, `qualifier → <type>`. A reference names one entity, so its target is singular.
- **Every mechanical check names a rule `core/CONVENTIONS.md` defines.** A check citing an undefined rule fails the `rules are written down` meta-check. Do not invent a rule number.
- **A commit message is the git register of `conventions/WRITING.md`.** Subject a plain sentence under seventy characters, no type prefix, no trailing period, saying what is now true that was not before. Body one to three short paragraphs, cause before mechanism, no headers and no bullets. **It ends with one line beginning `Verified:` naming what ran and passed**, then the trailers. The trailer is:
  `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`
- **Write the `Verified:` line from the commands you actually ran**, never from this plan's prediction of them. Every commit in both repositories' history carries one; a commit without it is the defect this constraint exists to stop.
- **Do not merge anything.** Open the pull request and stop. Merging is the Owner's word, and a branch delete is never chained after a merge.
- **A pull request description is prose, in the register the repository already uses.** Read the last two merged PRs before writing one. No `##` headings and no bullet lists: paragraphs that open with the gap, say what changed, say what it costs downstream, and — where a release is involved — one line reading `Release notes to write at tagging: …`. It closes with a single `Verified:` sentence naming the commands that were run, then the `🤖 Generated with [Claude Code](https://claude.com/claude-code)` line. A bold run-in opening a paragraph, such as `**What changed.**`, is optional and somewhat more common in `companygraph/meta-model` than in `robertblust/mental-model`; of the last four merged in each, meta-model #82 and mental-model #120 use one and the rest do not. The release-notes line is usual rather than universal — meta-model #81 and #80 carry it, #82 does not. The bodies below follow all of this; do not restructure them.
- **Versions:** core `0.24.0` → `0.25.0` in four places — `package.json`, `core/manifest.json`, the README's Status paragraph, and the `v0.25.0` ref on lines 6 and 37 of `.github/workflows/instance-check.yml`. That last one is the reusable workflow an instance calls: left at the previous tag, the workflow published at `v0.25.0` runs the older checker, which refuses any instance pinned to 0.25.0.

## Repository Map

| Repo | Path | Branch |
| --- | --- | --- |
| `companygraph/meta-model` | `~/git/companygraph/meta-model` | `process-type` (exists, holds the spec commit) |
| `robertblust/mental-model` | `~/git/robertblust/mental-model` | `delivery-process` (create in Task 5) |

## File Structure

**Part A — `companygraph/meta-model`**

| File | Responsibility |
| --- | --- |
| Create `core/process-schema.md` | The process type: tracks, the phase list, what the process never does |
| Create `core/phase-schema.md` | The phase type: the seats and the gate, all in frontmatter |
| Modify `lib/checks.mjs` | Two `TYPES` entries; one new check under R9 |
| Modify `verify/instance-checks.test.mjs` | Fixture tests for the new check |
| Create `example/model/processes/delivery/delivery.md` | The example process |
| Create `example/model/processes/delivery/phases/{specify,build,release}.md` | Its three phases |
| Modify `README.md` | Type list in two places, Status paragraph, version |
| Modify `package.json`, `core/manifest.json`, `.github/workflows/instance-check.yml` | 0.25.0, in all three — the workflow's ref is what an instance checks itself against |

**Part B — `robertblust/mental-model`**

| File | Responsibility |
| --- | --- |
| Modify `meta/core/*`, `.companygraph/manifest.json`, `.github/workflows/companygraph.yml`, `AGENTS.md` | The 0.25.0 re-pin, four places |
| Create `model/roles/{specifier,planner,controller}.md` | The three new seats |
| Modify `model/roles/implementer.md` | "the controller" becomes the seat by name |
| Modify `model/profiles/ai-agent/ai-agent.md` | Four roles become seven |
| Create `model/processes/README.md` | The folder's one-paragraph note, as `roles/README.md` has |
| Create `model/processes/delivery/delivery.md` | The process |
| Create `model/processes/delivery/phases/{shape,spec,plan,implement,integrate}.md` | Its five phases |

---

# Part A — companygraph/meta-model

### Task 1: The two schemas

**Files:**

- Create: `core/process-schema.md`
- Create: `core/phase-schema.md`
- Modify: `lib/checks.mjs:18-45` (the `TYPES` array)

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces: the type names `process` and `phase` in `TYPES`, with `process` declared `{ type: "process", folder: "processes/<process>", owns: ["phase"] }` and `phase` declared `{ type: "phase", folder: "processes/<process>/phases", owner: "process" }`. Task 2 adds a check beside them; Task 3 writes example entities into those folders.

**Context you need:** `TYPES` drives the `schemas exist` and `schema fixed shape` checks in `verify/check.mjs`, so adding the entries makes `npm run verify` fail until the schema files exist and match R9. It does **not** force `example/` to carry the type — that was tested; a type with no entities anywhere is green. Read `core/role-schema.md` for the house voice and `core/experience-schema.md` for how an owned type declares its owner.

- [ ] **Step 1: Add the two TYPES entries, which is this task's failing test**

In `lib/checks.mjs`, insert both entries immediately after the `role` line and before the `profile` line:

```js
  { type: "role", folder: "roles" },
  // R5, R6: a process owns its phases and cannot be read without them, so it is a folder,
  // as a profile is. R10 puts the owner declaration on `phase`, the owned side.
  { type: "process", folder: "processes/<process>", owns: ["phase"] },
  // No `filename` form: a phase derives by R12's default, the slug of its H1. Order is the
  // process's `## Phases` list and the `gate-to` chain, never a number on a file.
  { type: "phase", folder: "processes/<process>/phases", owner: "process" },
  { type: "profile", folder: "profiles/<profile>", owns: ["experience"] },
```

- [ ] **Step 2: Run verify to see it fail**

Run: `cd ~/git/companygraph/meta-model && npm run verify` Expected: FAIL, exactly two problems:

```
✗ 2 problems

  core/process-schema.md is missing
  core/phase-schema.md is missing
```

If you see any other failure, stop and report it — the entries are wrong.

- [ ] **Step 3: Write `core/process-schema.md`**

```markdown
# Process Schema

> Required structure for process files.

## File Location

`model/processes/<process>/<process>.md`

A process owns its phases and cannot be read without them, so it is a folder rather than a
file, as a profile is. The folder is named for the process and holds its own file under that
same name, plus the `phases/` collection the phases nest in.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `owner` | Yes | ref → role | The seat accountable for the process as a whole, the H1 of a file in `roles/` |
| `supported-by` | No | array of ref → role | The seats that keep the process working without being accountable for it |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Process]` | Yes | The canonical name of the process. Phases and readers reference it by this exact string. |
| `> [Purpose]` | Yes | Single-line statement of what the process is for |
| `## Tracks` | Yes | Table. The kinds of thing this process makes; its columns are declared below. |
| `## Phases` | Yes | An ordered list, one entry per phase, in the order the work passes through them, each linking the phase's file |
| `## What it never does` | Yes | A list, one sentence each, of what the process refuses in every phase |
| `## References` | No | Table. The rulebooks the process is run by; its columns are declared below. |

`## Tracks` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Track` | Yes | string | The kind of thing this track makes |
| `Produces` | Yes | string | What one pass down this track leaves behind |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a rulebook, a checklist, a mandate |
| `URL` | Yes | string | Where it is |

## Purpose

A process is the path work takes through the company's seats — one folder, the phases in the
order they are passed through, and the gate between each pair — and it answers "what happens
next, who does it, and what has to be true before it moves on?" for someone doing the work or
waiting on it. It is not a seat, which says what one role takes and produces whenever it acts,
and it is not a record of work that happened, which is an experience.

## Writing rules

- Person-neutral, as a role is: a process names seats and never who holds them.
- Named for the work rather than for the tool that carries it: `Delivery`, not `The board`.
- A track is named for what it makes, not for who makes it.
- Each line under `## What it never does` is a sentence an agent can hold a change against.
  "Never merges without the Owner" can fail; "works carefully" cannot.
- `## Phases` lists every phase in the folder and nothing else, in the order the work passes
  through them. It is the authority on that order, and each phase's `gate-to` agrees with it.
- A process with one track says so and names it; a track table is not omitted because there
  happens to be only one kind of work today.
```

- [ ] **Step 4: Write `core/phase-schema.md`**

```markdown
# Phase Schema

> Required structure for phase files.

**Owner:** process

## File Location

`model/processes/<process>/phases/*.md`

A phase is owned by a process and cannot exist without it, so it nests inside the process's
folder rather than sitting at the root with a `process:` field pointing back. The filename is
R12's default, the slug of the H1. It carries no position prefix: the order is the owning
process's `## Phases` list and the `gate-to` chain, and a third copy on the filename would have
to be renamed through the whole folder whenever a phase was inserted.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `owner` | Yes | ref → role | The seat accountable for the phase's outcome, the H1 of a file in `roles/` |
| `executed-by` | Yes | array of ref → role | The seats that do the phase's work |
| `supported-by` | No | array of ref → role | The seats consulted in the phase, producing nothing it is graded on |
| `gate-approvers` | Yes | array of ref → role | The seats that approve passage out of the phase. At least one; a phase nobody approves is an activity inside another phase. |
| `escalation-authority` | Yes | ref → role | The seat that decides when the gate's criteria cannot be met |
| `gate-to` | No | ref → phase | The phase this gate leads to. Absent on the last phase, and only there. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Phase]` | Yes | The canonical name of the phase. The owning process's `## Phases` list and the previous phase's `gate-to` reference it by this exact string. |
| `> [Goal]` | Yes | Single-line statement of what the phase is for |
| `## What it takes` | Yes | What enters the phase, and what it refuses to start without |
| `## Activities` | Yes | A numbered list of what is done; where the work differs by track, one `### [Track]` heading per track, each with its own numbered list |
| `## What it produces` | Yes | Table. What leaves the phase; its columns are declared below. |
| `## What it never does` | Yes | A list, one sentence each, of what the phase refuses |
| `## Gate` | Yes | The criteria that must be satisfied to leave the phase, as a list, and what happens when they cannot be |

`## What it produces` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Deliverable` | Yes | string | The thing that leaves the phase |
| `Description` | Yes | string | What it is, and what makes it finished |

## Purpose

A phase is one step of a process and the gate at its end — what enters, what is done, what
leaves, and what must be true for it to leave. It answers "am I done, and who says so?" for
whoever is in it. The gate is the part the model enforces: the document a phase produces scales
with the size of the change and may be a conversation rather than a file, and the approval at
its end does not scale at all.

## Writing rules

- A gate criterion is a sentence that can fail: "the checks pass on the branch" can, "quality
  is good" cannot.
- A `### [Track]` heading under `## Activities` names a track the owning process declares, spelled
  as that track's `Track` cell spells it.
- A phase whose activities are the same for every track carries no track headings at all.
- `gate-to` names the next phase and the owning process's `## Phases` list says the same thing;
  where the two disagree the model is wrong, not the reader.
- The last phase has no `gate-to`, and its gate is the one that releases the work.
- A phase's name is unique across every phase in the instance, not merely within its process,
  because R2 scopes a name to its type rather than to its owner. Two processes cannot each call
  a phase `Review`; name a phase for what it does in the process it belongs to. A phase and a
  role may share a name, since a reference carries the type it resolves under.
- `executed-by` names the seats that do the work, never the seat that approves it; a seat that
  only signs belongs in `gate-approvers`.
```

- [ ] **Step 5: Run verify to see it pass**

Run: `cd ~/git/companygraph/meta-model && npm run verify` Expected: PASS, `✓ 15 checks passed`.

If `schema fixed shape` fails, the cause is almost always one of: a section in the wrong order, a `Table.` section with no column table (or the reverse), a column table whose caption line does not read exactly `` `## Tracks` is a table with these columns: ``, or a type outside the closed vocabulary.

- [ ] **Step 6: Run the rest of the suite and the prose check**

Run:

```bash
cd ~/git/companygraph/meta-model
npm run test:instance && npm run test:instance-checks && npm run test:rules
sh conventions/conventions-check
```

Expected: all suites pass; the prose check prints `✓ every Markdown file follows WRITING.md`.

- [ ] **Step 7: Commit**

```bash
cd ~/git/companygraph/meta-model
git add core/process-schema.md core/phase-schema.md lib/checks.mjs
git commit -F - <<'EOF'
Two types say when a seat acts

role-schema.md has said since it shipped that a role "is not a process, which
says when the seat acts", and nothing said it. A process is a folder owning its
phases, as a profile owns its experiences; a phase carries its seats and its
gate in frontmatter, so every one of them is a typed reference R3 and R4 already
check and the parser needs no change.

The order lives in the process's `## Phases` list and the `gate-to` chain, and
nowhere else — no position prefix on the filename, which would have to be
renamed through the folder whenever a phase was inserted.

Verified: `npm run verify`, the three test suites and `conventions/conventions-check` pass.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 2: A required list field carries at least one item

**Files:**

- Modify: `lib/checks.mjs` (add a check to the array returned by `instanceChecks`)
- Test: `verify/instance-checks.test.mjs`

**Interfaces:**

- Consumes: `TYPES` from Task 1, and the existing helpers in `instanceChecks` — `fieldsOf(type)`, `walkMd(EX, cb)`, `typeOfFile(path)`, `frontmatterOf(text)`, `fail(msg)`.
- Produces: nothing later tasks import. Task 3's example must satisfy it.

**Why this check and not the gate chain.** `gate-approvers` is declared required, and the existing `required frontmatter fields are present` check reads only whether the key is there — so `gate-approvers:` followed by nothing passes today. This closes that, generally: it holds every required list field on every type, and it cites R9, which is what lets it exist. The gate chain gets no mechanical check; that `gate-to` agrees with `## Phases` is a writing rule and belongs to the agent pass, and inventing a rule number to license it would be the schema leaking into the conventions.

- [ ] **Step 1: Write the failing tests**

Append to `verify/instance-checks.test.mjs`:

```js
test("a required list field with no items fails, and one with an item passes", () => {
  const PHASE_SCHEMA = schema("phase", [
    "| `gate-approvers` | Yes | array of ref → role | Who approves. |",
  ]);
  const ROLE_SCHEMA = schema("role", []);
  const files = new Map([
    ["core/phase-schema.md", PHASE_SCHEMA],
    ["core/role-schema.md", ROLE_SCHEMA],
    ["model/roles/owner.md", "# Owner\n"],
    ["model/phases/empty.md", "---\ngate-approvers:\n---\n\n# Empty\n"],
    ["model/phases/filled.md", "---\ngate-approvers:\n  - Owner\n---\n\n# Filled\n"],
  ]);
  const failures = checkInstance(files);
  assert.ok(
    failures.some((f) => f.includes("model/phases/empty.md") && f.includes("gate-approvers")),
    `expected a failure for the empty list, got:\n${failures.join("\n")}`,
  );
  assert.ok(
    !failures.some((f) => f.includes("model/phases/filled.md") && f.includes("carries no items")),
    `expected no empty-list failure for the filled list, got:\n${failures.join("\n")}`,
  );
});

test("an optional list field with no items is not held to the rule", () => {
  const ROLE_SCHEMA = schema("role", [
    "| `requires` | No | array of ref → skill | The skills the seat needs. |",
  ]);
  const files = new Map([
    ["core/role-schema.md", ROLE_SCHEMA],
    ["model/roles/owner.md", "---\nrequires:\n---\n\n# Owner\n"],
  ]);
  const failures = checkInstance(files);
  assert.ok(
    !failures.some((f) => f.includes("carries no items")),
    `expected no failure for an optional empty list, got:\n${failures.join("\n")}`,
  );
});
```

Note: the fixture's `schema()` helper writes the File Location as `` `<type>s/` ``, so the fixture's entities sit in `model/phases/` and `model/roles/`. That is the fixture's own shape and is deliberate — these two tests are about list emptiness and nothing else.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd ~/git/companygraph/meta-model && npm run test:instance-checks` Expected: FAIL on the first test with "expected a failure for the empty list". The second test passes already, and stays as a guard.

- [ ] **Step 3: Write the check**

In `lib/checks.mjs`, insert this object into the array returned by `instanceChecks`, immediately after the `required frontmatter fields are present` check:

```js
  {
    // R9: `## Frontmatter` says whether a field may be absent, and a list field that is
    // present but empty is absent in every sense that matters — nothing resolves, no edge is
    // drawn, and the page reads as though it answered a question it did not. The check above
    // reads the key and stops, which is the gap this closes. Only required fields are held: an
    // optional list written empty is a author's way of saying "none yet", and R9 gives it to
    // them by letting the field be absent in the first place.
    name: "required list fields carry at least one item",
    rule: "R9",
    run() {
      const listsOf = new Map(
        TYPES.map((t) => [
          t.type,
          fieldsOf(t.type)
            .filter(({ required, declared }) => required && /^array\b/.test(declared))
            .map(({ field }) => field),
        ]),
      );
      walkMd(EX, (child, text) => {
        const fields = listsOf.get(typeOfFile(child)) ?? [];
        if (!fields.length) return;
        const fmText = frontmatterOf(text);
        for (const field of fields) {
          const name = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          // The field's own line, then every line up to the next top-level key. An item is a
          // block sequence entry, which "list fields are block sequences" has already made
          // the only legal form — so counting `-` lines here needs no second opinion on shape.
          const m = fmText.match(new RegExp(`^${name}:(.*)$([\\s\\S]*?)(?=^\\S|$(?![\\s\\S]))`, "m"));
          if (!m) continue;
          const inline = m[1].trim();
          const items = (m[2] ?? "").split("\n").filter((l) => /^\s+-\s+\S/.test(l));
          if (!inline && !items.length)
            fail(`${child}: \`${field}\` carries no items, and ${typeOfFile(child)}-schema.md requires it (R9)`);
        }
      });
    },
  },
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd ~/git/companygraph/meta-model && npm run test:instance-checks` Expected: PASS, both new tests green.

- [ ] **Step 5: Run the whole suite**

Run:

```bash
cd ~/git/companygraph/meta-model
npm run verify && npm run test:instance && npm run test:instance-checks && npm run test:rules
```

Expected: all green. `npm run verify` says `✓ 16 checks passed` — `verify/check.mjs` spreads the array `instanceChecks` returns into its own `CHECKS` list and prints that list's length, so adding a check increments the count by one.

- [ ] **Step 6: Commit**

```bash
cd ~/git/companygraph/meta-model
git add lib/checks.mjs verify/instance-checks.test.mjs
git commit -F - <<'EOF'
A required list field that carries nothing is not present

`gate-approvers:` followed by nothing passed, because the required-fields check
reads the key and stops. A list field that is present but empty resolves
nothing and draws no edge, so it is absent in every sense that matters, and R9
already says whether a field may be absent.

General, not process-specific: it holds every required list field on every type.
Optional lists are left alone, since R9 lets those be absent outright.

Verified: `npm run test:instance-checks` red on the new case before the check, green after; the rest of the suite and `conventions/conventions-check` pass.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 3: The example gains a process

**Files:**

- Create: `example/model/processes/delivery/delivery.md`
- Create: `example/model/processes/delivery/phases/specify.md`
- Create: `example/model/processes/delivery/phases/build.md`
- Create: `example/model/processes/delivery/phases/release.md`

**Interfaces:**

- Consumes: the two schemas from Task 1 and the check from Task 2.
- Produces: the first entities of both new types, which the `references resolve`, `the instance is held to what the schemas declare` and `filenames derive` checks now read.

**Context you need:** the example is Beacon Systems, a fictional company. Its existing roles are `Backend Engineer` and `Reviewer` (`example/model/roles/`), and its one source is whatever `example/model/sources/` holds — read it and use its H1 verbatim for every `source:` field, or the references will not resolve. Three phases, not five: the example exists to show the type worked, not to propose a way of working.

- [ ] **Step 1: Read the example's source and roles**

Run:

```bash
cd ~/git/companygraph/meta-model
grep -h '^# ' example/model/sources/*.md example/model/roles/*.md
```

Expected: `Local`, `Google Workspace`, `Reviewer`, `Backend Engineer`. The files below use `Local` as the source and those two role names verbatim. If any of these four strings has changed since this plan was written, the files below must change with it or the references will not resolve.

- [ ] **Step 2: Write the process file**

`example/model/processes/delivery/delivery.md`:

```markdown
---
source: Local
owner: Backend Engineer
supported-by:
  - Reviewer
---

# Delivery

> How a change to the platform is specified, built and released.

## Tracks

| Track | Produces |
| --- | --- |
| Code | A merged change to the platform |
| Docs | A published page on the customer site |

## Phases

1. [Specify](phases/specify.md)
2. [Build](phases/build.md)
3. [Release](phases/release.md)

## What it never does

- Never begins a phase whose predecessor's gate has not been approved.
- Never releases a change that no reviewer has read.
- Never counts a check nobody ran as a check that passed.

## References

| What | URL |
| --- | --- |
| Engineering handbook | https://example.com/handbook |
```

- [ ] **Step 3: Write the three phase files**

`example/model/processes/delivery/phases/specify.md`:

```markdown
---
source: Local
owner: Backend Engineer
executed-by:
  - Backend Engineer
supported-by:
  - Reviewer
gate-approvers:
  - Reviewer
escalation-authority: Reviewer
gate-to: Build
---

# Specify

> Write down what the change must do, before anyone writes how it does it.

## What it takes

A request from the platform's users, and the part of the system it will touch, read rather than
remembered.

## Activities

1. State the request as one sentence.
2. Name the approaches worth considering, and recommend one.
3. Write down what the change must do, and what it is explicitly not doing.

## What it produces

| Deliverable | Description |
| --- | --- |
| Specification | What the change must do, the approach chosen, and what was left out |

## What it never does

- Never writes the change it specifies.
- Never leaves a question unasked because an assumption would be convenient.

## Gate

To leave Specify, all of these hold:

- The request is stated as one sentence.
- The approach is chosen and the rejected ones are named.
- What the change will not do is written down.

Where they cannot be met, the Reviewer decides whether the request is reshaped or dropped.
```

`example/model/processes/delivery/phases/build.md`:

```markdown
---
source: Local
owner: Backend Engineer
executed-by:
  - Backend Engineer
  - Reviewer
gate-approvers:
  - Reviewer
escalation-authority: Reviewer
gate-to: Release
---

# Build

> Make the change and have it read, one track at a time.

## What it takes

An approved specification, and a branch off the platform's main line.

## Activities

### Code

1. Write the failing test, then the change that passes it.
2. Hand the diff to the Reviewer with the specification beside it.
3. Resolve every finding, or record why it stands.

### Docs

1. Draft the page from the specification.
2. Have the Reviewer read it against what the change actually does.

## What it produces

| Deliverable | Description |
| --- | --- |
| Reviewed change | Commits on a branch, with the suite passing and every finding resolved |
| Draft page | The customer-facing description of what changed, unpublished |

## What it never does

- Never changes a test's expectation to make it pass.
- Never publishes the page before the change is released.

## Gate

To leave Build, all of these hold:

- The suite passes on the branch.
- Every review finding is resolved or recorded with a reason.
- The branch does what the specification said, and nothing else.

Where they cannot be met, the Reviewer decides whether the branch is reworked or abandoned.
```

`example/model/processes/delivery/phases/release.md`:

```markdown
---
source: Local
owner: Reviewer
executed-by:
  - Reviewer
supported-by:
  - Backend Engineer
gate-approvers:
  - Reviewer
escalation-authority: Reviewer
---

# Release

> Put the change in front of the platform's users, and the page with it.

## What it takes

A branch that left Build, and the draft page written beside it.

## Activities

1. Merge the branch and tag the release.
2. Publish the page.
3. Watch the platform until the change has been exercised by real traffic.

## What it produces

| Deliverable | Description |
| --- | --- |
| Released change | Merged, tagged, and running for users |
| Published page | The page describing the change, live on the customer site |

## What it never does

- Never releases and publishes in the opposite order.
- Never leaves a release untagged.

## Gate

Release is the last phase. The work is done when all of these hold:

- The change is merged and tagged.
- The page is live.
- The change has been exercised in production without incident.

Where they cannot be met, the Reviewer decides whether the release is rolled back.
```

- [ ] **Step 4: Run verify to see the example accepted**

Run: `cd ~/git/companygraph/meta-model && npm run verify` Expected: PASS, `✓ 15 checks passed`.

Likely failures and what they mean: `references resolve` naming a `source`, an `owner` or a `gate-approvers` means one of the four names from Step 1 is misspelled. `filenames derive` means a filename is not the slug of its H1. `the container holds what the types imply` means the folder is not `example/model/processes/<name>/<name>.md` plus `phases/`. `required list fields carry at least one item` means an `executed-by` or `gate-approvers` was written with no entries under it.

- [ ] **Step 5: Run the whole suite and the prose check**

Run:

```bash
cd ~/git/companygraph/meta-model
npm run verify && npm run test:instance && npm run test:instance-checks && npm run test:rules
sh conventions/conventions-check
```

Expected: all green.

- [ ] **Step 6: Commit**

```bash
cd ~/git/companygraph/meta-model
git add example/model/processes
git commit -F - <<'EOF'
Beacon Systems writes down how it ships

Three phases rather than five: the example is here to show the type worked, not
to propose a way of working. Between them they exercise every part of it — the
track table and a phase whose activities split by track, a phase whose
activities do not, the gate chain and the last phase that ends it, and the seat
fields resolving to the two roles the company already had.

Verified: `npm run verify`, the three test suites and `conventions/conventions-check` pass.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 4: Release 0.25.0

**Files:**

- Modify: `package.json:3`
- Modify: `core/manifest.json:1`
- Modify: `README.md` — the `## What is here` type list (around line 22), the `## Status` paragraph (around line 78)
- Modify: `.github/workflows/instance-check.yml:6` and `:37` — the `v0.24.0` ref becomes `v0.25.0`

**Interfaces:**

- Consumes: everything from Tasks 1–3.
- Produces: the tag `v0.25.0`, which Part B pins to.

**Context you need:** `verify/check.mjs` asserts `core/manifest.json` is never ahead of `package.json`, and that a `v*` tag on HEAD matches `package.json`. The README says "thirteen types" in two places and lists them by name; both move to fifteen. The Status paragraph also names the release number and the tag count — read the current sentence and increment the tag ordinal by one.

- [ ] **Step 1: Bump both version files**

```bash
cd ~/git/companygraph/meta-model
sed -i '' 's/"version": "0.24.0"/"version": "0.25.0"/' package.json
sed -i '' 's/"version": "0.24.0"/"version": "0.25.0"/' core/manifest.json
git diff --stat package.json core/manifest.json
```

Expected: one line changed in each. Do **not** touch `"shape": 2` — the shape is unchanged; nothing about how a unit is laid out has moved.

- [ ] **Step 2: Update the README's type list**

In `## What is here`, the `*-schema.md` gloss becomes:

```
  *-schema.md      one per type: identity, vision, profile, experience,
                   experience-kind, skill, proficiency-level, value, source,
                   surface, strategic-objective, strategy, role, process, phase
```

and the line below it, `a fictional company, described in those thirteen types`, becomes `described in those fifteen types`.

- [ ] **Step 3: Update the Status paragraph**

Rewrite the first two sentences of `## Status` so they read (keeping the rest of the paragraph as it is):

```markdown
Past its first release and in use by a real instance, with the tooling and some of the remaining
core types still ahead. The current release is 0.25.0, the twenty-ninth tag, and at that release
core holds fifteen types, one schema each: identity, vision, profile, experience,
experience-kind, skill, proficiency-level, value, source, surface, strategic-objective,
strategy, role, process and phase.
```

Check the tag ordinal rather than trusting this plan: `git tag --list 'v*' | wc -l`, and the new one is that plus one.

- [ ] **Step 4: Run everything**

```bash
cd ~/git/companygraph/meta-model
npm run verify && npm run test:instance && npm run test:instance-checks && npm run test:rules
sh conventions/conventions-check
```

Expected: all green.

- [ ] **Step 5: Commit and push the branch**

```bash
cd ~/git/companygraph/meta-model
git add package.json core/manifest.json README.md
git commit -F - <<'EOF'
Core 0.25.0: fifteen types, and two of them say when a seat acts

Additive and breaking nothing — an instance with no processes/ folder is every
instance today, and is unchanged. The README's type list and status move with
it.

Verified: `npm run verify`, the three test suites and `conventions/conventions-check` pass.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
git push -u origin process-type
```

- [ ] **Step 6: Open the pull request and stop**

```bash
cd ~/git/companygraph/meta-model
gh pr create --title "Core 0.25.0: the process and phase types" --body "$(cat <<'EOF'
`role-schema.md` has said since it shipped that a role "is not a process, which says when the seat acts", and nothing said it. A role names what a seat takes and produces but never what hands it that input or what receives that output, so the model held the company's people and its work and not the path between them. This opens that with two types: `process`, a folder owning its phases as a profile owns its experiences, and `phase`, which carries its seats and its gate in frontmatter.

**What changed.** `process-schema.md` declares the tracks a process runs and the order its phases are passed through; `phase-schema.md` declares `owner`, `executed-by`, `supported-by`, `gate-approvers`, `escalation-authority` and `gate-to`, every one of them a reference, so R3 and R4 hold them and the parser needs no change at all. One process with tracks rather than one per kind of work, because software and prose run the same steps and differ only in who executes and what is produced. The multi-person instance's involvement matrix is dropped rather than ported: its columns would be the instance's own phase names, so no schema could declare them and no column check could ever run on it — the four levels it encodes are those frontmatter fields, and a renderer pivots them back into a matrix. The gate chain gets no mechanical check, because `gate-to` agreeing with `## Phases` is a writing rule, and every check here names a rule `CONVENTIONS.md` defines. Core and the package go to 0.25.0.

**Two checks move with it.** A required field declared as a list must carry at least one item: `gate-approvers:` followed by nothing passed, because the check above it reads the key and stops. It cites R9 and holds every type, not only the two new ones. And `list fields are block sequences` now walks the whole instance rather than `profiles/` alone. `strategy` and `role` already carried array fields outside `profiles/` and were never held to it; `phase` is what made someone look.

**What it costs downstream.** Nothing breaks: this is additive, and an instance with no `processes/` folder is every instance today. `.github/workflows/instance-check.yml` moves to `v0.25.0` with the release, as every release before it moved it — left behind, the published workflow would run the 0.24.0 checker against an instance pinned to 0.25.0 and refuse it. The reference instance takes this next, with the `Delivery` process the design writes out and the three seats it names.

Release notes to write at tagging: the two new types and what they are for, that nothing breaks, and the three places an instance moves its pin.

Verified: `npm run verify`, `npm run test:instance`, `npm run test:instance-checks`, `npm run test:rules` and `sh conventions/conventions-check` all pass.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr view --json number,url
```

**Stop here.** Merging, tagging and the GitHub release are the Owner's. Report the PR number and wait. Part B cannot start until `v0.25.0` exists.

---

# Part B — robertblust/mental-model

**Precondition:** `v0.25.0` is tagged and released on `companygraph/meta-model`. `bin/check-instance.mjs` refuses to run when its own release does not match the instance's pin, so nothing in Part B can be verified before the tag exists.

### Task 5: Re-pin to core 0.25.0

**Files:**

- Modify: `meta/core/` — every file, re-vendored whole from the tag
- Modify: `.companygraph/manifest.json` — `tooling`, `core.version`, `core.source`, and the `files` hash map, which gains two entries
- Modify: `.github/workflows/companygraph.yml:8` — `instance-check.yml@v0.25.0`
- Modify: `AGENTS.md:27` — the vendored-core version sentence

**Interfaces:**

- Consumes: the tag `v0.25.0`.
- Produces: an instance whose vendored core knows the two new types, which Tasks 6 and 7 write entities against.

**Context you need:** four pin points, and the manifest's hash map is the one that is easy to get wrong — it needs a line per file in `meta/core/`, and 0.25.0 adds two schema files, so the map grows from sixteen entries to eighteen. The last re-pin is `3c8cca5`; read it for the shape.

- [ ] **Step 1: Branch and re-vendor core whole**

```bash
cd ~/git/robertblust/mental-model
git checkout main && git pull && git checkout -b delivery-process
rm -rf meta/core
mkdir -p meta/core
cd ~/git/companygraph/meta-model && git fetch --tags && git archive v0.25.0 core | tar -x -C ~/git/robertblust/mental-model/meta --strip-components=0
cd ~/git/robertblust/mental-model && ls meta/core
```

Expected: eighteen files — sixteen `*-schema.md` (including the two new ones), `CONVENTIONS.md`, `LICENSE` and `manifest.json`.

- [ ] **Step 2: Recompute the manifest's hashes**

```bash
cd ~/git/robertblust/mental-model
for f in $(ls meta/core | sort); do
  printf '    "meta/core/%s": "sha256:%s",\n' "$f" "$(shasum -a 256 "meta/core/$f" | cut -d' ' -f1)"
done
```

Paste the output into `.companygraph/manifest.json` as the `files` object, removing the trailing comma on the last line. In the same file set `"tooling": "0.25.0"`, `"core": { "version": "0.25.0", ... "source": "fetched:v0.25.0" }`. Leave `"shape": 2`, `"units"` and `"packs"` alone.

- [ ] **Step 3: Move the workflow pin**

```bash
cd ~/git/robertblust/mental-model
sed -i '' 's|instance-check.yml@v0.24.0|instance-check.yml@v0.25.0|' .github/workflows/companygraph.yml
grep -n 'instance-check' .github/workflows/companygraph.yml
```

Expected: one line, naming `@v0.25.0`.

- [ ] **Step 4: Update the AGENTS.md version sentence**

The sentence at `AGENTS.md:27` reads "`meta/core/` is core 0.24.0, vendored and never edited here". Change `0.24.0` to `0.25.0`. Leave the rest of the paragraph alone; the seat count in the paragraph above is Task 6's.

- [ ] **Step 5: Run the checker at the new release**

```bash
cd ~/git/companygraph/meta-model && git checkout v0.25.0
node bin/check-instance.mjs ~/git/robertblust/mental-model
cd ~/git/robertblust/mental-model && sh conventions/conventions-check
```

Expected: `✓ model/ against meta/core/ at core 0.25.0: the mechanical checks pass`, and the prose check green. A refusal naming the two pins means step 2 missed one of `tooling` or `core.version`.

- [ ] **Step 6: Commit**

```bash
cd ~/git/robertblust/mental-model
git add meta/core .companygraph/manifest.json .github/workflows/companygraph.yml AGENTS.md
git commit -F - <<'EOF'
Core 0.25.0, whose types can say when a seat acts

Re-vendored meta/core whole from the tag, recomputed the manifest's hashes —
eighteen now, two more schemas than before — moved the workflow pin with it and
updated AGENTS.md's version line. No page under model/ changes here; the
process this release makes writable comes next.

Verified: the instance checker at v0.25.0 and `conventions/conventions-check` pass.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 6: The three seats

**Files:**

- Create: `model/roles/specifier.md`
- Create: `model/roles/planner.md`
- Create: `model/roles/controller.md`
- Modify: `model/roles/implementer.md` — two occurrences of "the controller"
- Modify: `model/profiles/ai-agent/ai-agent.md` — the `roles` list, the tagline and the Summary
- Modify: `AGENTS.md` — "four of the five seats" becomes "seven of the eight seats"

**Interfaces:**

- Consumes: the re-pinned core from Task 5.
- Produces: the role names `Specifier`, `Planner` and `Controller`, which Task 7's phase frontmatter references by these exact strings.

**Context you need:** read `model/roles/owner.md` and `model/roles/implementer.md` first — they are the register these three must match. All seven skills these seats require already exist in `model/skills/`; their H1s are `Requirements engineering`, `Spec-driven development`, `Technical writing`, `Software process engineering`, `Agile delivery`, `Agentic AI development` and `Context engineering`. Write them exactly as spelled there or the references will not resolve.

- [ ] **Step 1: Write `model/roles/specifier.md`**

```markdown
---
source: Local
requires:
  - Requirements engineering
  - Spec-driven development
  - Technical writing
---

# Specifier

> The seat that turns a shaped request into a specification nobody has to guess at, and builds nothing.

## What it takes

A request already classified, the model it must not contradict, and the code or the pages it
will touch, read rather than remembered. Where the request is ambiguous the seat asks before
writing.

## What it produces

A specification that is the whole of the requirements: the gap it closes, the approaches
considered with the one chosen and why, the decisions taken, and what is explicitly not being
done. Where a decision is the Owner's, the seat names the options and parks the question.

## What it never does

- Never writes the change it specifies.
- Never decides scope; it names the options and the Owner chooses.
- Never leaves a question unasked because an assumption would be convenient.
- Never states a fact the model does not hold.

## References

| What | URL |
| --- | --- |
| Working rules | https://github.com/robertblust/conventions/blob/main/conventions/WORKING.md |
| Rulebook | https://github.com/obra/superpowers/blob/main/skills/brainstorming/SKILL.md |
```

- [ ] **Step 2: Write `model/roles/planner.md`**

```markdown
---
source: Local
requires:
  - Spec-driven development
  - Software process engineering
  - Agile delivery
---

# Planner

> The seat that cuts an approved specification into task briefs, each whole on its own, and writes none of them.

## What it takes

A specification the Owner has approved, and the repository the work lands in, including the
rules that bind it.

## What it produces

An ordered set of task briefs. Each is the whole of its own requirements, names the interfaces
the briefs around it produce and consume, and states how its holder can tell it is done. The
order is the order they can be worked in, not the order they were thought of.

## What it never does

- Never re-opens a decision the specification took.
- Never writes a brief that depends on a conversation its holder did not have.
- Never writes the change.
- Never plans a task whose completion cannot be checked.

## References

| What | URL |
| --- | --- |
| Working rules | https://github.com/robertblust/conventions/blob/main/conventions/WORKING.md |
| Rulebook | https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md |
```

- [ ] **Step 3: Write `model/roles/controller.md`**

```markdown
---
source: Local
requires:
  - Agentic AI development
  - Context engineering
  - Software process engineering
---

# Controller

> The seat that runs a plan one brief at a time, reads every report as a claim, and writes nothing itself.

## What it takes

An approved plan, the repository's own agent file, and a place to keep each task's brief, report
and findings.

## What it produces

One dispatched brief at a time; a decision after each report — fix, accept, or park for the
Owner; review ordered on the diff rather than on the report; and a branch whose tasks are done
in the plan's order, each committed as it lands.

## What it never does

- Never writes the change or the test itself.
- Never dispatches the next task while the last one's findings are open.
- Never accepts a claim that a check passed without the check's output.
- Never merges, tags or edits a pull request.

## References

| What | URL |
| --- | --- |
| Working rules | https://github.com/robertblust/conventions/blob/main/conventions/WORKING.md |
| Rulebook | https://github.com/obra/superpowers/blob/main/skills/subagent-driven-development/SKILL.md |
```

- [ ] **Step 4: Point implementer.md at the seat**

In `model/roles/implementer.md`, two edits and nothing else:

- `a short status the controller acts on` → `a short status the Controller acts on`
- `review comes from the controller after the report` → `review comes from the Controller after the report`

- [ ] **Step 5: Update the AI Agent profile**

In `model/profiles/ai-agent/ai-agent.md`, the `roles` list becomes seven, in the order the work meets them:

```yaml
roles:
  - Specifier
  - Planner
  - Controller
  - Implementer
  - Reviewer
  - Writer
  - Translator
```

The tagline becomes:

```markdown
> Specifies, plans, runs, implements, reviews, drafts and translates across the family, under a rulebook for each, and decides nothing.
```

and the Summary:

```markdown
## Summary

Seven seats, one session: the specification a request is shaped into, the plan it is cut into,
the dispatch of one brief at a time, the commit a brief specifies, the findings on a diff, the
English of every page and the Swiss German of every reviewed element. Whichever model runs it,
the rulebooks are the same and the Owner's word ends every question it parks.
```

- [ ] **Step 6: Update the AGENTS.md seat count**

`AGENTS.md` says "the agent that holds four of the five seats in `model/roles/`". It becomes "the agent that holds seven of the eight seats in `model/roles/`".

- [ ] **Step 7: Run the checker and the prose check**

```bash
cd ~/git/companygraph/meta-model && git checkout v0.25.0
node bin/check-instance.mjs ~/git/robertblust/mental-model
cd ~/git/robertblust/mental-model && sh conventions/conventions-check
ls model/roles | wc -l   # expect 9: eight roles plus README.md
```

Expected: both green. A `references resolve` failure naming a skill means a skill H1 was mistyped — check it against `grep -h '^# ' model/skills/*.md`.

- [ ] **Step 8: Commit**

```bash
cd ~/git/robertblust/mental-model
git add model/roles model/profiles/ai-agent/ai-agent.md AGENTS.md
git commit -F - <<'EOF'
Three seats that were acting without a file

implementer.md has referred twice to "the controller" since it was written, in
lowercase, as a thing the reader was assumed to know, and nothing in the model
held it. Specifier, Planner and Controller are that seat and the two either side
of it: what a request becomes before anything is built, what a specification is
cut into, and who hands out the pieces.

Each passes the role schema's test — a second holder would still be called that,
and each has a rulebook that predates this model. Every skill they require was
already in the model; none was added to fit.

The agent now holds seven of the eight seats.

Verified: the instance checker at v0.25.0 and `conventions/conventions-check` pass; every skill the three require resolves, and `model/roles/` holds eight seats.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 7: The Delivery process

**Files:**

- Create: `model/processes/README.md`
- Create: `model/processes/delivery/delivery.md`
- Create: `model/processes/delivery/phases/shape.md`
- Create: `model/processes/delivery/phases/spec.md`
- Create: `model/processes/delivery/phases/plan.md`
- Create: `model/processes/delivery/phases/implement.md`
- Create: `model/processes/delivery/phases/integrate.md`

**Interfaces:**

- Consumes: the eight role names from Task 6 and `model/roles/owner.md`'s `Owner`, plus the source `Local`.
- Produces: the instance's first process. Nothing later depends on it.

**Context you need:** `model/roles/README.md` is the model for the folder note. Every `source:` is `Local` — the instance's one source. Every gate is approved by `Owner` and every escalation is `Owner`; that is not a degenerate case to be apologized for in the prose, it is the company of one stated as a fact.

- [ ] **Step 1: Write the folder note**

`model/processes/README.md`:

```markdown
# Processes

One folder per process, written against `meta/core/process-schema.md`, with its phases in
`phases/` against `meta/core/phase-schema.md`. A process names seats, never who holds them.
```

- [ ] **Step 2: Write the process file**

`model/processes/delivery/delivery.md`:

```markdown
---
source: Local
owner: Owner
supported-by:
  - Reviewer
---

# Delivery

> How anything the company ships is shaped, specified, made and merged, in code and in prose.

## Tracks

| Track | Produces |
| --- | --- |
| Code | A merged change to a repository of the family, with its checks green |
| Prose | A published page or post in reviewed English, and the Swiss German where the place carries it |

## Phases

1. [Shape](phases/shape.md)
2. [Spec](phases/spec.md)
3. [Plan](phases/plan.md)
4. [Implement](phases/implement.md)
5. [Integrate](phases/integrate.md)

## What it never does

- Never begins a phase whose predecessor's gate the Owner has not approved.
- Never lets an agent merge, tag or sign anything.
- Never makes the German from English the Owner has not reviewed.
- Never counts a check nobody ran as a check that passed.
- Never lets a made thing outlive a disagreement with the model; the model is corrected and the
  thing rebuilt.

## References

| What | URL |
| --- | --- |
| Working rules | https://github.com/robertblust/conventions/blob/main/conventions/WORKING.md |
| Writing rules | https://github.com/robertblust/conventions/blob/main/conventions/WRITING.md |
| Rulebook | https://github.com/obra/superpowers |
```

- [ ] **Step 3: Write `phases/shape.md`**

```markdown
---
source: Local
owner: Owner
executed-by:
  - Owner
gate-approvers:
  - Owner
escalation-authority: Owner
gate-to: Spec
---

# Shape

> Decide what kind of change this is, and how much of it gets written down.

## What it takes

A request in whatever words it arrived in, and the part of the model or the repository it will
have to agree with, read rather than remembered.

## Activities

1. State the request as one sentence.
2. Classify it: a question whose output is an answer, a bounded change to something already
   here to read, or a change to how things fit together.
3. Name the track it runs on.
4. Say which phases write a document and which are satisfied in conversation.
5. Name what is explicitly not being changed.

## What it produces

| Deliverable | Description |
| --- | --- |
| Classification | Which of the three kinds of change this is, and why |
| Track | Which track the work runs on, named as the process spells it |
| Document plan | Which phases produce a file and which are answered in conversation |

## What it never does

- Never classifies by how familiar the work feels rather than by what exists to read.
- Never lets a classification skip a gate; only the document scales, never the approval.
- Never begins the work it is classifying.

## Gate

To leave Shape, all of these hold:

- The request is stated as one sentence.
- The track is named.
- The classification is stated, and the phases that will write a document are named.

Where they cannot be met, the Owner decides whether the request is reshaped or dropped.
```

- [ ] **Step 4: Write `phases/spec.md`**

```markdown
---
source: Local
owner: Specifier
executed-by:
  - Specifier
supported-by:
  - Writer
gate-approvers:
  - Owner
escalation-authority: Owner
gate-to: Plan
---

# Spec

> Write what the change must do, completely enough that nobody downstream has to guess.

## What it takes

A classified request, the model the change must not contradict, and whatever it will touch.

## Activities

### Code

1. Read the model and the code the change lands in, before proposing anything.
2. Name the approaches worth considering, with their trade-offs, and recommend one.
3. Write the specification: the gap, the decisions and their reasons, what was rejected and why,
   and what is explicitly not being done.
4. Park every question that is the Owner's, rather than answering it conveniently.

### Prose

1. Name the audience, the one point, and the facts the text may claim with where each is shown.
2. Name the file and the place it lands, and the register the place calls for.
3. Name the claims it may not make.

## What it produces

| Deliverable | Description |
| --- | --- |
| Specification | The whole of the requirements for a change to code, with what is not being done named |
| Brief | For prose: the audience, the one point, the facts it may claim and where it lands |

## What it never does

- Never writes the change it specifies.
- Never decides a question that is the Owner's; it names the options and parks it.
- Never states a fact the model does not hold.
- Never leaves a question unasked because an assumption would be convenient.

## Gate

To leave Spec, all of these hold:

- The Owner has read the specification or the brief and approved it.
- What is explicitly not being done is written down.
- Every parked question has the Owner's word on it.

Where they cannot be met, the Owner decides whether the change is reshaped, narrowed or dropped.
```

- [ ] **Step 5: Write `phases/plan.md`**

```markdown
---
source: Local
owner: Planner
executed-by:
  - Planner
supported-by:
  - Specifier
gate-approvers:
  - Owner
escalation-authority: Owner
gate-to: Implement
---

# Plan

> Cut the approved specification into pieces that can be worked one at a time.

## What it takes

A specification or brief the Owner has approved, and the repository the work lands in with the
rules that bind it.

## Activities

### Code

1. Map the files the change creates and modifies, and what each is responsible for.
2. Cut the work into task briefs, each the whole of its own requirements.
3. Name the interfaces each brief produces and consumes, so no brief depends on a conversation
   its holder did not have.
4. Order them so each can be worked, tested and committed on its own.

### Prose

1. Name the elements that change, and in what order.
2. Name which of them the translator re-runs on, and which need no German.

## What it produces

| Deliverable | Description |
| --- | --- |
| Task briefs | An ordered set, each whole on its own, each with a way to tell it is done |

## What it never does

- Never re-opens a decision the specification took.
- Never writes a brief whose holder would have to guess at an interface.
- Never writes the change.
- Never plans a task whose completion cannot be checked.

## Gate

To leave Plan, all of these hold:

- The Owner has read the plan and approved it.
- Every brief states how its holder can tell the task is done.
- The order is one the briefs can actually be worked in.

Where they cannot be met, the Owner decides whether the plan is recut or the specification
reopened.
```

- [ ] **Step 6: Write `phases/implement.md`**

```markdown
---
source: Local
owner: Controller
executed-by:
  - Controller
  - Implementer
  - Reviewer
  - Writer
  - Translator
supported-by:
  - Planner
gate-approvers:
  - Owner
escalation-authority: Owner
gate-to: Integrate
---

# Implement

> Make the thing, one piece at a time, and have every piece read before the next one starts.

## What it takes

An approved plan, a branch, and for each task the brief that is the whole of its requirements.

## Activities

### Code

1. The Controller dispatches one brief.
2. The Implementer works it, test first where the brief says so, and reports what was built,
   what was run and what it doubts.
3. The Reviewer reads the diff against the brief and returns findings, each with a file, a line
   and a severity, strengths named first.
4. The Controller decides: fix, accept, or park for the Owner.
5. The task is committed before the next one is dispatched.

### Prose

1. The Writer drafts the English from the brief, on the branch, and reports which claims it
   could not trace to the brief or the repository.
2. The Owner reviews on the branch, in the diff and on the rendered page.
3. The Translator makes the Swiss German from the reviewed English only, one element at a time,
   with the glossary open, and hands back a back-translation beside each element.
4. An English edit re-runs the Translator on that element alone.

## What it produces

| Deliverable | Description |
| --- | --- |
| Reviewed commits | One per task, on the branch, with every finding resolved or parked |
| Reviewed English | For prose: the draft the Owner has read on the branch and on the page |
| Swiss German | For prose: made from the reviewed English, with its back-translation |

## What it never does

- Never changes a test's expectation to make it pass.
- Never makes the German from English the Owner has not reviewed.
- Never dispatches the next task while the last one's findings are open.
- Never claims a check that was not run.
- Never merges.

## Gate

To leave Implement, all of these hold:

- Every task's findings are resolved, or parked with the Owner's word on them.
- The repository's checks pass on the branch.
- The branch does what the specification said, and nothing else.

Where they cannot be met, the Owner decides whether the branch is reworked or abandoned.
```

- [ ] **Step 7: Write `phases/integrate.md`**

```markdown
---
source: Local
owner: Owner
executed-by:
  - Owner
supported-by:
  - Reviewer
gate-approvers:
  - Owner
escalation-authority: Owner
---

# Integrate

> Put the change where it binds, and move everything that names it.

## What it takes

A branch that left Implement with its checks green, and the specification it was made from.

## Activities

1. Review the whole branch against the specification, not task by task.
2. Open the pull request and stop.
3. The Owner reads the diff and the rendered page, and merges.
4. Where a release is due, tag it and publish it.
5. Move every pin that names the release, and delete the branch as its own step.

## What it produces

| Deliverable | Description |
| --- | --- |
| Merged change | On the default branch, with its checks green |
| Release | Where one is due: the tag, its notes, and every pin that names it moved |

## What it never does

- Never merges without the Owner; an agent opens and reports.
- Never chains a branch delete after a merge, because a failed merge would still run the delete
  and close the pull request.
- Never leaves a member pinned to a release that no longer exists.
- Never releases a change the model disagrees with.

## Gate

Integrate is the last phase. The work is done when all of these hold:

- The checks pass on the pull request.
- The Owner has merged it.
- Every pin that names the release has moved with it.

Where they cannot be met, the Owner decides whether the change is reverted or the release held.
```

- [ ] **Step 8: Run the checker and the prose check**

```bash
cd ~/git/companygraph/meta-model && git checkout v0.25.0
node bin/check-instance.mjs ~/git/robertblust/mental-model
cd ~/git/robertblust/mental-model && sh conventions/conventions-check
```

Expected: `✓ model/ against meta/core/ at core 0.25.0: the mechanical checks pass` and the prose check green.

- [ ] **Step 9: Read the agent pass by hand**

The mechanical checks do not reach `## Writing rules`. Read the five phase files against `meta/core/phase-schema.md`'s rules and confirm each, out loud, in the commit body:

- every `### [Track]` heading spells a track as `delivery.md` spells it (`Code`, `Prose`);
- `shape.md` and `integrate.md` carry no track headings, and their activities really are the same for both tracks;
- every gate criterion is a sentence that can fail;
- each `gate-to` matches the `## Phases` list, and only `integrate.md` has none;
- no two phases in the instance share a name — today Delivery is the only process, so this
  cannot yet fail, and it is checked so that the second process does not discover it.

- [ ] **Step 10: Commit**

```bash
cd ~/git/robertblust/mental-model
git add model/processes
git commit -F - <<'EOF'
Delivery: one process, two tracks, five gates

The company's most reliable rule — that the Owner approves before an agent
proceeds — had nowhere to live. It lives here, as five separate approvals
rather than a vague sense that he decides.

One process rather than one for code and one for prose, because they are the
same five steps and differ only in who executes and what is produced. Where
they genuinely part company the phase says so under a track heading: a code
review is mechanical, a prose review is the Owner reading English and the German
being back-translated, and the Translator has no counterpart on the other side.

Verified: the instance checker at v0.25.0 and the prose check pass; the writing
rules in phase-schema.md were read by hand against all five phases.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

- [ ] **Step 11: Push and open the pull request, then stop**

```bash
cd ~/git/robertblust/mental-model
git push -u origin delivery-process
gh pr create --title "Delivery: the process this company already runs, written down" --body "$(cat <<'EOF'
Core 0.25.0 added the `process` and `phase` types, and this instance is the first to hold one. The company's most reliable rule — that the Owner approves before an agent proceeds — had nowhere in the model to live, so it lived in habit. It lives here now, as five gates rather than a general sense that he decides.

`Delivery` runs on two tracks, Code and Prose, rather than splitting into one process for software and one for writing. They are the same five steps and differ only in who executes and what is produced, and the phases say so: Shape and Integrate carry no track headings at all, because classifying a request and merging a branch do not change with what is being made, while Spec, Plan and Implement split their activities where the work genuinely differs. A code review is mechanical and a prose review is the Owner reading English with the German reviewed by back-translation, and the Translator has no counterpart on the other side.

Three seats come with it. `implementer.md` has referred twice to "the controller" since it was written, in lowercase, as a thing the reader was assumed to know, and nothing in the model held it — Specifier, Planner and Controller are that seat and the two either side of it. Each passes the role schema's own test, that a second holder would still be called that, and each has a rulebook that predates this model. Every skill the three require was already in `model/skills/`; none was added to make a seat fit. The agent now holds seven of the eight seats.

The re-pin is the usual four places: `meta/core/` re-vendored whole from the tag, the manifest's hashes recomputed — eighteen now, two schemas more than before — the workflow pin moved, and AGENTS.md's version line with it.

Verified: `node bin/check-instance.mjs` at v0.25.0 and `sh conventions/conventions-check` pass, and `phase-schema.md`'s writing rules were read by hand against all five phases, because the mechanical half of R0 does not reach them.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr view --json number,url
```

**Stop here.** Report both pull request numbers. Merging is the Owner's word.

---

## Verification Summary

| What | Command | Where |
| --- | --- | --- |
| Repository shape, R9 and the example | `npm run verify` | meta-model |
| The parser | `npm run test:instance` | meta-model |
| The instance checks | `npm run test:instance-checks` | meta-model |
| Rule citations | `npm run test:rules` | meta-model |
| The instance, mechanically | `node bin/check-instance.mjs ~/git/robertblust/mental-model` from a `v0.25.0` checkout | both |
| Prose, en-US and the spaced em dash | `sh conventions/conventions-check` | both |
| Writing rules | read by hand, Task 7 Step 9 | mental-model |

## What this plan does not do

Rendering processes on blust.ch, companygraph.io or guestgraph.io; a second process for content, which this design refuses by making prose a track; the `kpi`, `rule` and `legal-document` types; and any mechanical check on whether a change actually followed the process, which is a fact about a pull request and not about the model.
