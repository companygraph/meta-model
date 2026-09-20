# A track is an entity implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `track` a core type owned by `process`, so that a process's `## Tracks` rows and a phase's `### [Track]` headings are declared references the existing checks hold.

**Architecture:** One new schema, `core/track-schema.md`, and one new row in the checks' list of types. `core/process-schema.md` declares the `Track` column `ref → track` and drops `Produces`; `core/phase-schema.md` declares `## Activities` grouped under a heading typed `ref → track`. The parser does not change, because it reads its types from each schema's `## File Location`, resolves an owned name within its owner and already draws an edge per grouped heading. One check changes: the first half of “a grouped section's bullets stand under its headings” reads numbered items too.

**Tech Stack:** Node 22+, no dependencies. `node:test` for unit tests. Markdown schemas in `core/`, a worked instance in `example/`, a hand-written verification script in `verify/check.mjs`.

**Spec:** `docs/superpowers/specs/2026-09-20-a-track-is-an-entity-design.md`

Every code block and every expected output below was run once, in a throwaway clone of this branch, before this plan was written. Where a step says a test passes on its first run, it did.

## Global Constraints

- **Scope is this repository only.** The reference instance, the Obsidian plugin, the MCP server and the sites take the release afterwards; the last section names them. Do not touch them here.
- **Branch:** `a-track-in-core`, from `main` once the specification's pull request, #111, is merged. If it is not merged when work starts, branch from `a-track-is-an-entity` instead and, before that branch is ever deleted, retarget this work's pull request to `main`: deleting a stacked pull request's base closes it.
- **Worktree:** `~/git/companygraph/meta-model-track`. The checkout at `~/git/companygraph/meta-model` is on another branch with its own work and must not be touched.
- **`export PATH=/opt/homebrew/bin:$PATH`** before any `node` or `gh` command. Both live there and are not on the default path. A push needs the credential helper named: `git -c credential.helper='!/opt/homebrew/bin/gh auth git-credential' push -u origin a-track-in-core`.
- **Never commit on the default branch.** Never chain a branch delete after a merge.
- **Prose register** for every Markdown word written here, per `conventions/WRITING.md`: paragraphs by default, cause before mechanism, en-US spelling, curly quotes, no serial comma, spaced em-dash, no adjective that sells, and no count or version of something that still moves.
- **Commit messages** follow the git register: a subject that is a sentence under seventy characters with no prefix and no trailing period, a body of one to three short paragraphs with no headers and no bullets, then one line beginning `Verified:` naming what ran and passed, then the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. A `Verified:` line names only what was run after the last edit, and its exit code was read on its own, never through a pipe.
- **A track's file carries its name and its tagline and nothing more** (spec, “What the owner decided”). No `## What it means`, no `rank`.
- **No check is written for tracks by name.** `lib/checks.mjs` reads what schemas declare; the only lines that name `track` are its row in `TYPES` and `process`'s `owns`. A phase that names a track is **not** held to naming every track of its process, and nothing here checks it.
- **Test counts below are written as changes, not totals,** because another branch may land first. Read the totals before starting, as Task 1's first step says.
- **Do not edit anything under `docs/superpowers/` other than this plan.** Older specs and plans quote the two-column Tracks table as it was on the day they were written; they are the record of that day.

---

### Task 1: `track` is a type the checks, core and the example know

A type exists in three places that must agree before the suite is green: the checks' `TYPES` list, where every folder is a literal; a schema in `core/`, which `schemas exist` and `ownership declared` read; and the example, which must carry a `tracks/` folder in every process because a process now owns one. This task adds all three and changes no existing schema, so the example's two-column `## Tracks` table stays legal until Task 2. The tests use fixture schemas, not `core/`, so they show the declared references working before core declares them.

**Files:**

- Modify: `lib/checks.mjs:31-34` (the `process` and `phase` rows of `TYPES`)
- Create: `core/track-schema.md`
- Create: `example/model/processes/delivery/tracks/code.md`
- Create: `example/model/processes/delivery/tracks/docs.md`
- Modify: `README.md:24` and `README.md:101`
- Modify: `example/model/README.md:9-12` and `:21`
- Test: `verify/instance-checks.test.mjs` (append at end of file)

**Interfaces:**

- Consumes: `schema(type, rows, { owner, grouped, sections })`, `checkInstance(files, { core })`, `test` and `assert`, all already at the top of `verify/instance-checks.test.mjs`.
- Produces: `TYPES` carries `{ type: "track", folder: "processes/<process>/tracks", owner: "process" }` and `process` owns `["phase", "track"]`. The test file gains `TRACKED_PROCESS_SCHEMA`, `TRACK_SCHEMA`, `TRACKED_PHASE_SCHEMA`, `track(name)`, `tracked(name, tracks, phases)`, `building(headings)`, `withTracks(files)` and `DELIVERY`, which Task 3's tests reuse.

- [ ] **Step 1: Create the branch and read the totals**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-track && git fetch origin && git checkout -b a-track-in-core origin/main
node --test verify/instance-checks.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)"
node --test verify/instance.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)"
```

Expected: `fail 0` twice. Note both `pass` totals. If `docs/superpowers/specs/2026-09-20-a-track-is-an-entity-design.md` is missing, #111 is not merged: branch from `origin/a-track-is-an-entity` instead, as the constraints say.

- [ ] **Step 2: Write the failing tests**

Append to the end of `verify/instance-checks.test.mjs`:

```js
// A track is an entity its process owns, so that a phase's `### [Track]` heading is a declared
// reference and not a word that happens to match a cell. Nothing below is a check written for
// tracks: the fixtures declare a second owned type, a listing of it and a grouped heading typed
// to it, and the checks that read declarations do the rest. They are pinned because a behavior
// that arrives for free is one nobody notices leaving.
const TRACKED_PROCESS_SCHEMA = [
  "# Process Schema", "", "> A process.", "",
  "## File Location", "", "`processes/<process>/<process>.md`", "",
  "## Frontmatter", "", "| Field | Required | Type | Description |", "| --- | --- | --- | --- |", "",
  "## Sections", "",
  "| Section | Required | Description |", "| --- | --- | --- |",
  "| `## Tracks` | Yes | Table. The tracks. |",
  "| `## Phases` | Yes | Table. The phases, in order. |", "",
  "`## Tracks` is a table with these columns:", "",
  "| Column | Required | Type | Description |", "| --- | --- | --- | --- |",
  "| `Track` | Yes | ref → track | The track. |", "",
  "`## Phases` is a table with these columns:", "",
  "| Column | Required | Type | Description |", "| --- | --- | --- | --- |",
  "| `Phase` | Yes | ref → phase | The phase. |", "",
].join("\n");

const TRACK_SCHEMA = schema("track", [], { owner: "process" });

const TRACKED_PHASE_SCHEMA = schema("phase", [], {
  owner: "process",
  grouped: { section: "Activities", heading: "Track", type: "ref → track" },
});

const track = (name) => `# ${name}\n\n> What one pass leaves behind.\n`;
const tracked = (name, tracks, phases = ["Build"]) =>
  `# ${name}\n\n> A process.\n\n## Tracks\n\n| Track |\n| --- |\n${tracks.map((t) => `| ${t} |`).join("\n")}\n\n` +
  `## Phases\n\n| Phase |\n| --- |\n${phases.map((p) => `| ${p} |`).join("\n")}\n`;
const building = (headings) =>
  `# Build\n\n> Make it.\n\n## Activities\n\n${headings.map((h) => `### ${h}\n\n1. Do the work.\n`).join("\n")}`;

const withTracks = (files) =>
  checkInstance(
    new Map([
      ["meta/core/process-schema.md", TRACKED_PROCESS_SCHEMA],
      ["meta/core/track-schema.md", TRACK_SCHEMA],
      ["meta/core/phase-schema.md", TRACKED_PHASE_SCHEMA],
      ...files,
    ]),
    { core: "meta/core" },
  ).failures;

const DELIVERY = [
  ["model/processes/delivery/delivery.md", tracked("Delivery", ["Code", "Docs"])],
  ["model/processes/delivery/tracks/code.md", track("Code")],
  ["model/processes/delivery/tracks/docs.md", track("Docs")],
  ["model/processes/delivery/phases/build.md", building(["Code", "Docs"])],
];

test("a phase's track headings that name tracks of its own process are not a failure", () => {
  assert.deepEqual(withTracks(DELIVERY).filter((f) => /Tracks|Activities|tracks\//.test(f)), []);
});

test("a track renamed leaves a phase's heading naming nothing, and that is a failure naming the heading", () => {
  const failures = withTracks([
    ["model/processes/delivery/delivery.md", tracked("Delivery", ["Code2", "Docs"])],
    ["model/processes/delivery/tracks/code2.md", track("Code2")],
    ["model/processes/delivery/tracks/docs.md", track("Docs")],
    ["model/processes/delivery/phases/build.md", building(["Code", "Docs"])],
  ]);
  const hit = failures.find((f) => f.startsWith("model/processes/delivery/phases/build.md: ") && f.includes("`### Code`"));
  assert.ok(hit, `no failure named the heading; got: ${failures.join(" | ") || "none"}`);
  assert.match(hit, /"## Activities"/);
  assert.match(hit, /ref → track/);
});

test("a heading naming another process's track is a failure, though the name resolves", () => {
  const failures = withTracks([
    ...DELIVERY.slice(0, 3),
    ["model/processes/delivery/phases/build.md", building(["Code", "Contract"])],
    ["model/processes/hiring/hiring.md", tracked("Hiring", ["Contract"], ["Screen"])],
    ["model/processes/hiring/tracks/contract.md", track("Contract")],
    ["model/processes/hiring/phases/screen.md", "# Screen\n\n> First.\n"],
  ]);
  const hit = failures.find((f) => f.includes("phases/build.md") && f.includes("Contract"));
  assert.ok(hit, `no failure named the foreign track; got: ${failures.join(" | ") || "none"}`);
  assert.match(hit, /R5/);
});

test("a process's table of tracks is held to its tracks folder: one left out, one that is not there, one twice", () => {
  const leftOut = withTracks([["model/processes/delivery/delivery.md", tracked("Delivery", ["Code"])], ...DELIVERY.slice(1)]);
  assert.ok(leftOut.some((f) => f.includes('"## Tracks"') && f.includes('does not list "Docs"')), leftOut.join("\n"));

  const notThere = withTracks([["model/processes/delivery/delivery.md", tracked("Delivery", ["Code", "Docs", "Video"])], ...DELIVERY.slice(1)]);
  assert.ok(notThere.some((f) => f.includes("delivery.md") && f.includes('"Video"') && f.includes("ref → track")), notThere.join("\n"));

  const twice = withTracks([["model/processes/delivery/delivery.md", tracked("Delivery", ["Code", "Docs", "Code"])], ...DELIVERY.slice(1)]);
  assert.ok(twice.some((f) => f.includes('"## Tracks"') && f.includes('lists "Code" twice')), twice.join("\n"));
});
```

- [ ] **Step 3: Run them to see them fail**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-track && node --test verify/instance-checks.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)|^✖" | sort -u
```

Expected: `fail 3`. The first, third and fourth new tests fail, because `model/processes/delivery/tracks/` is a folder of no type the checks know. The second, “a track renamed…”, **passes already, for the wrong reason**: with no `track` type nothing resolves, so every heading fails, the right ones too. The first test is what makes it mean something, which is why the two are read together.

- [ ] **Step 4: Add the type to `TYPES`**

In `lib/checks.mjs`, the `process` row gains a second owned type and a `track` row follows `phase`:

```js
  { type: "process", folder: "processes/<process>", owns: ["phase", "track"] },
  // No `filename` form: a phase derives by R12's default, the slug of its H1. Order is the
  // process's `## Phases` table and the `gate-to` chain, never a number on a file.
  { type: "phase", folder: "processes/<process>/phases", owner: "process" },
  // A track is what a phase's `### [Track]` heading names, and a name a file refers to is an
  // entity's (R3). It points at nothing and carries nothing but its name and what it produces.
  { type: "track", folder: "processes/<process>/tracks", owner: "process" },
```

Only the first and the last three lines are new or changed; the two comment lines and the `phase` row between them are shown so the place is unmistakable.

- [ ] **Step 5: Run the tests to see them pass, and the suite to see what core now owes**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-track && node --test verify/instance-checks.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)"
node verify/check.mjs | tail -4
```

Expected: `fail 0`, and `pass` four above the total noted in Step 1. The suite fails with exactly two problems: `core/track-schema.md is missing` and `example/model/processes/delivery/ is missing tracks/`.

- [ ] **Step 6: Write the schema**

Create `core/track-schema.md`:

````markdown
# Track Schema

> Required structure for track files.

**Owner:** process

## File Location

`model/processes/<process>/tracks/*.md`

A track is owned by a process and cannot exist without it, so it nests inside the process's
folder beside `phases/`. The filename is R12's default, the slug of the H1.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Track]` | Yes | The canonical name of the track. The owning process's `## Tracks` table and a phase's `### [Track]` headings reference it by this exact string. |
| `> [Produces]` | Yes | One-paragraph statement of what one pass down this track leaves behind |

## Purpose

A track is one kind of thing a process makes, and it answers “which of the things this process
makes is this step about?” for a reader of a phase whose work differs by what is being made. It
is an entity so that the answer is a reference rather than a word: a phase that heads its
activities with a track names something that exists, a track renamed is renamed in one place
with every mention held to it, and the tracks are visible in the graph as nodes. It points at
nothing. Which seats work a track and what they do on it are said by the phases.

## Writing rules

- A track is named for what it makes, not for who makes it: `Code`, not `Engineering`.
- The tagline says what is left behind when a change has run down the track, as a thing a
  reader could point at: “a merged change to the platform”, not “development work”.
- A track's name is unique within its process (R2): two processes may each have a track called
  `Code`, and a phase's heading or a process's `## Tracks` finds the one in its own process
  (R4).
- A track carries no order. Tracks run together in one pass, and the order a process lists them
  in is the order a reader meets them and nothing more.
````

- [ ] **Step 7: Give the example its two tracks**

Create `example/model/processes/delivery/tracks/code.md`:

```markdown
---
source: Local
---

# Code

> A merged change to the platform.
```

Create `example/model/processes/delivery/tracks/docs.md`:

```markdown
---
source: Local
---

# Docs

> A published page on the customer site.
```

The taglines are the two `Produces` cells of `example/model/processes/delivery/delivery.md`, each with a period. The table itself is left alone until Task 2.

- [ ] **Step 8: Name the type where the repository lists its types**

`README.md` line 24, inside the tree, reads `process, phase` after its indent and becomes `process, phase, track`. `README.md` line 101 reads `surface, strategic-objective, strategy, role, process and phase. The reference instance,` and becomes `surface, strategic-objective, strategy, role, process, phase and track. The reference instance,`.

In `example/model/README.md` the paragraph that lists the types becomes, rewrapped so no line passes a hundred characters:

```markdown
It uses every core type — `identity`, `vision`, `profile`, `experience`, `experience-kind`,
`achievement-kind`, `skill`, `proficiency-level`, `value`, `source`, `surface`,
`strategic-objective`, `strategy`, `role`, `process`, `phase`, `track` — and declares no packs.
That is what core ships, not a claim that these types describe a company.
```

and the tree gains one line under `phases/`:

```text
  phases/                        specify.md, build.md, release.md
  tracks/                        code.md, docs.md
```

- [ ] **Step 9: Verify**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-track && node verify/check.mjs > /dev/null; echo "verify $?"
node --test verify/ > /dev/null 2>&1; echo "tests $?"
sh conventions/conventions-format > /dev/null; echo "format $?"
sh conventions/conventions-check > /dev/null; echo "prose $?"
```

Expected: four zeros.

- [ ] **Step 10: Commit**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-track && git add lib/checks.mjs core/track-schema.md example/model/processes/delivery/tracks README.md example/model/README.md verify/instance-checks.test.mjs && git commit -F - <<'MSG'
A track is a type a process owns

A phase's track heading names something another file spells, and a name a
file refers to is an entity's. So a track gets a schema, a row in the
checks' list of types beside the phase, and a folder in the example. It
carries its name and what it produces and points at nothing.

No check is written for it. The tests declare a listing column and a
grouped heading typed to it in fixture schemas, and the checks that read
declarations hold a renamed track, a track of another process and a table
that disagrees with its folder. Core's own process and phase schemas do
not declare the references yet; that is the next commit.

Verified: node verify/check.mjs, node --test verify/, sh
conventions/conventions-format and sh conventions/conventions-check all
exit 0.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
MSG
```

---

### Task 2: The process and the phase declare their references to a track

This is the commit that closes the gap the owner found. `## Tracks` becomes a table of one column declared `ref → track`, which makes it an owner's table of what it owns, held to the `tracks/` folder like `## Phases` to `phases/`. `## Activities` becomes a grouped section whose headings are typed `ref → track`, which R16 resolves and R5 holds to the owning process. `Produces` leaves the process, because the track's tagline now says it and a fact kept twice is kept in step by hand. The example's table is cut down with it, since the column check compares a header row to the schema's column list exactly.

**Files:**

- Modify: `core/process-schema.md` (File Location paragraph, the `## Tracks` row, its column table, two writing rules)
- Modify: `core/phase-schema.md` (the `## Activities` row, a new heading table, two writing rules)
- Modify: `example/model/processes/delivery/delivery.md:14-17`

**Interfaces:**

- Consumes: Task 1's `track` type, schema and example files.
- Produces: core declares `Tracks.Track` and `Activities.Track` as `ref → track`. A consumer of the parser meets edges with `via` `Tracks.Track` and `Activities.Track`; Task 4 pins them.

- [ ] **Step 1: Replay the owner's edit, to see it still pass**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-track && sed -i '' 's/^| Code | A merged/| Code2 | A merged/' example/model/processes/delivery/delivery.md
grep -c "Code2" example/model/processes/delivery/delivery.md
node verify/check.mjs > /dev/null; echo "verify $?"
git checkout example/model/processes/delivery/delivery.md
```

Expected: `1`, then `verify 0`. The count is the control: a rename that did not land proves nothing. This is the failing test of this task, and it is a script rather than a unit test because what it shows is the shipped schemas, which the fixture tests do not read.

- [ ] **Step 2: Amend `core/process-schema.md`**

Five edits. In the File Location paragraph, ``same name, plus the `phases/` collection the phases nest in.`` becomes ``same name, plus the `phases/` and `tracks/` collections the phases and tracks nest in.``

The `## Tracks` row of the sections table becomes:

```markdown
| `## Tracks` | Yes | Table. The kinds of thing this process makes, one row each; its columns are declared below. |
```

The two rows of the `## Tracks` column table, `Track` typed `string` and `Produces`, become one:

```markdown
| `Track` | Yes | ref → track | The track, by its canonical name: the H1 of a file in this process's `tracks/` |
```

Under `## Writing rules`, delete the line `- A track is named for what it makes, not for who makes it.`; it is the track schema's now. And directly before the rule that begins `- A process with one track says so`, insert:

```markdown
- `## Tracks` lists every track in the folder and nothing else, each by its canonical name and
  nothing beside it (R3); the instance checks hold it. What a track produces is said once, in
  the track's own file, and is not repeated here.
```

- [ ] **Step 3: Amend `core/phase-schema.md`**

The `## Activities` row of the sections table gains the word `Grouped.` at the front of its description, as `## Achievements` has in the experience schema:

```markdown
| `## Activities` | Yes | Grouped. A numbered list of what is done; where the work differs by track, one `### [Track]` heading per track, each with its own numbered list |
```

Directly before the line that reads ``` `## What it produces` is a table with these columns: ```, insert the heading table and a blank line after it. The caption's wording is fixed by R9 and read by a regular expression, so it is copied exactly:

```markdown
`## Activities` is grouped under these headings:

| Heading | Required | Type | Description |
| --- | --- | --- | --- |
| `Track` | No | ref → track | The track the numbered list below it is the work of, by its canonical name: the H1 of a file in the owning process's `tracks/` |
```

Under `## Writing rules`, the two rules that begin ``- A `### [Track]` heading under `## Activities` names a track`` and `- A phase whose activities are the same for every track` are replaced by one. The first is now the declaration above; the second stays and says what Task 3 will hold:

```markdown
- A phase whose activities are the same for every track carries no track headings at all, and
  one that carries any puts every activity under one: an activity above the first heading
  belongs to no track, and the instance checks say so.
```

The sections table's words “one `### [Track]` heading per track” stay as they read. The owner decided that a phase naming a track is not held to naming every one, so no check reads those words and they remain the agent pass's.

- [ ] **Step 4: Run the suite to see the example fail**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-track && node verify/check.mjs | tail -6
```

Expected: one problem, `example/model/processes/delivery/delivery.md: "## Tracks" columns are Track|Produces; the schema declares Track`. This is what every instance with a process will see when it takes the release and has not rewritten its table, and it is the enforcement the spec names, not a side effect.

- [ ] **Step 5: Cut the example's table down to its names**

In `example/model/processes/delivery/delivery.md`, the four lines of the `## Tracks` table become:

```markdown
| Track |
| --- |
| Code |
| Docs |
```

- [ ] **Step 6: Verify, then replay the rename both ways**

Both replays restore by hand and not with `git checkout`, which would undo Step 5 with them. First the owner's edit, the row alone:

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-track && node verify/check.mjs > /dev/null; echo "verify $?"
sed -i '' 's/^| Code |$/| Code2 |/' example/model/processes/delivery/delivery.md
node verify/check.mjs | tail -5
sed -i '' 's/^| Code2 |$/| Code |/' example/model/processes/delivery/delivery.md
```

Expected: `verify 0`, then three problems: the row `"Code2"` names no entity (R16), `"## Tracks" does not list "Code"` (R5), and the example does not parse, `R4: "Code2" … names no track of processes/delivery`.

Then the rename done properly, in the row and the file, with the phases left behind:

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-track && sed -i '' 's/^| Code |$/| Code2 |/' example/model/processes/delivery/delivery.md
sed -i '' 's/^# Code$/# Code2/' example/model/processes/delivery/tracks/code.md
mv example/model/processes/delivery/tracks/code.md example/model/processes/delivery/tracks/code2.md
node verify/check.mjs | tail -4
mv example/model/processes/delivery/tracks/code2.md example/model/processes/delivery/tracks/code.md
sed -i '' 's/^# Code2$/# Code/' example/model/processes/delivery/tracks/code.md
sed -i '' 's/^| Code2 |$/| Code |/' example/model/processes/delivery/delivery.md
git status --short
```

Expected: two problems, both about `### Code` in `## Activities` of `example/model/processes/delivery/phases/build.md`: R16's, that it names no entity, and the parser's R4. After the restore, `git status --short` shows exactly the three files this task edits, each `M`, and nothing under `tracks/`.

- [ ] **Step 7: Verify the whole, after the last edit**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-track && node verify/check.mjs > /dev/null; echo "verify $?"
node --test verify/ > /dev/null 2>&1; echo "tests $?"
sh conventions/conventions-format > /dev/null; echo "format $?"
sh conventions/conventions-check > /dev/null; echo "prose $?"
git diff --stat
```

Expected: four zeros, and a diff stat of three files in which `delivery.md` shows the table cut down, four lines for four.

- [ ] **Step 8: Commit**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-track && git add core/process-schema.md core/phase-schema.md example/model/processes/delivery/delivery.md && git commit -F - <<'MSG'
A process lists its tracks by name and a phase's headings name them

A track renamed in a process left every phase still headed with the old
name and every check green, because the heading was a word that matched a
cell. The process schema now declares the Track column a reference to a
track, which makes the table an owner's table of what it owns, held to the
tracks folder as Phases is to phases. The phase schema declares Activities
grouped under a heading typed the same way, which R16 resolves and R5
holds to the owning process.

Produces leaves the process. The track's tagline says what it produces,
and a fact kept in two files is kept in step by hand. The example's table
is cut down to its names with it, since the column check compares a header
row to the declared columns exactly; an instance that takes this and has
not rewritten its table fails there, by name.

Verified: node verify/check.mjs, node --test verify/, sh
conventions/conventions-format and sh conventions/conventions-check all
exit 0; and the example with its track renamed in the table alone, then in
the table and the file with the phases left, fails the suite both times
where before this commit it passed.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
MSG
```

---

### Task 3: An activity above the first track heading belongs to no track

“A grouped section's bullets stand under its headings” applies to `## Activities` once an instance holds a track. It reads `-` and `*` items only and activities are a numbered list, so without a change a phase passes by its list marker whatever it does. The owner decided the two halves apart. An item before the first heading is lost in either section, so that half reads numbered items too and says “item”. A section with no heading at all stays bullets-only: for a phase it is the legal way to say the work is the same on every track, and a test pins that as meant.

**Files:**

- Modify: `lib/checks.mjs`, the check named `a grouped section's bullets stand under its headings` (its comment, its `name`, one regular expression and one message)
- Modify: `verify/instance-checks.test.mjs:360` (one assertion the new wording breaks)
- Test: `verify/instance-checks.test.mjs` (append at end of file)

**Interfaces:**

- Consumes: `withTracks(files)` and `DELIVERY` from Task 1.
- Produces: the first-half failure reads ``has an item before its first `###` heading; where the instance holds a track, every item stands under the heading of one``. The second-half message is unchanged. The Obsidian plugin locates failures by their wording (`src/locate.ts`), so the follow-on work in the plugin reads this line.

- [ ] **Step 1: Write the tests**

Append to the end of `verify/instance-checks.test.mjs`:

```js
// The two halves of "a grouped section's items stand under its headings" mean different things
// for a phase. An activity above the first track heading belongs to no track, as a bullet above
// the first kind belongs to none, so the first half reads a numbered item too. A phase with no
// track heading at all is the legal way to say the work is the same on every track, so the
// second half is left reading bullets only, and a numbered list under no heading passes on
// purpose and not by its list marker.
test("an activity above the first track heading is a failure, numbered though it is", () => {
  const failures = withTracks([
    ...DELIVERY.slice(0, 3),
    ["model/processes/delivery/phases/build.md", "# Build\n\n> Make it.\n\n## Activities\n\n1. Belongs to no track.\n\n### Code\n\n1. Do the work.\n"],
  ]);
  const hit = failures.find((f) => f.includes("phases/build.md") && f.includes("before its first `###` heading"));
  assert.ok(hit, `no failure named the item; got: ${failures.join(" | ") || "none"}`);
  assert.match(hit, /an item/);
  assert.match(hit, /a track/);
});

test("a phase with no track heading passes where the instance holds a track: its work is the same on every track", () => {
  const failures = withTracks([
    ...DELIVERY.slice(0, 3),
    ["model/processes/delivery/phases/build.md", "# Build\n\n> Make it.\n\n## Activities\n\n1. One thing.\n2. Another.\n"],
  ]);
  assert.deepEqual(failures.filter((f) => f.includes("Activities")), []);
});
```

- [ ] **Step 2: Run them**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-track && node --test verify/instance-checks.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)|^✖" | sort -u
```

Expected: `fail 1`, the first of the two. The second passes already, by the list marker; after Step 3 it passes by intent, and the check's comment says so.

- [ ] **Step 3: Change the check**

In `lib/checks.mjs`, the check's comment gains a second paragraph and its name changes:

```js
    // R16. A bullet standing before the first heading belongs to no kind, and a reader looking
    // for one kind cannot tell that from a kind the entry has nothing under. Only where the
    // instance holds an entity of the heading's type: an instance that defines none writes a
    // flat list, which is why the section's heading table is `Required: No`.
    //
    // The two halves read different items, on purpose. Before a first heading a numbered item
    // is as lost as a bullet, so both are read: a phase's activity above its first track
    // heading belongs to no track. With no heading at all only a bullet is read, because a
    // phase whose work is the same on every track says so by carrying a numbered list and no
    // track heading, which its schema makes legal, while an entry's achievements are bullets
    // and must stand under a kind. The list marker is what tells the two apart, and the tests
    // pin it so that the difference is on record as meant.
    name: "a grouped section's items stand under its headings",
```

and further down in the same check, the loop over the section's lines becomes:

```js
          const hasHeading = lines.some((line) => /^###\s+\S/.test(line));
          const item = hasHeading ? /^\s*(?:[-*]|\d+[.)])\s+\S/ : /^\s*[-*]\s+\S/;
          for (const line of lines) {
            if (/^###\s+\S/.test(line)) break;
            if (!item.test(line)) continue;
            fail(
              hasHeading
                ? `${child}: "## ${section}" has an item before its first \`###\` heading; where the instance holds ${article(target)} ${target}, every item stands under the heading of one`
                : `${child}: "## ${section}" has a bullet and no \`###\` heading at all; where the instance holds ${article(target)} ${target}, every bullet stands under the heading of one`,
            );
            break;
          }
```

The `hasHeading` line and the second message are unchanged and shown for place. New are the `item` line, its use in the `if`, and the words `an item` and `every item` in the first message.

- [ ] **Step 4: Run the tests, and mend the one assertion the wording breaks**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-track && node --test verify/instance-checks.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)|^✖" | sort -u
```

Expected: `fail 1`, and it is an old test: “a bullet before the first heading is a failure where the instance holds a kind” asserts `assert.match(hit, /bullet/);`. The message no longer says bullet there. Change that one line to:

```js
  assert.match(hit, /an item before its first/);
```

The test further down, “a bullet before a later heading names the type with the right article”, asserts the words `before its first` and `an achievement-kind` and needs no change.

- [ ] **Step 5: Verify**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-track && node verify/check.mjs > /dev/null; echo "verify $?"
node --test verify/ > /dev/null 2>&1; echo "tests $?"
node --test verify/instance-checks.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)"
```

Expected: two zeros, `fail 0`, and `pass` six above the total noted in Task 1.

- [ ] **Step 6: Commit**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-track && git add lib/checks.mjs verify/instance-checks.test.mjs && git commit -F - <<'MSG'
An activity above the first track heading belongs to no track

The check that a grouped section's items stand under its headings reaches
a phase's Activities once an instance holds a track. It read bullets only
and activities are numbered, so a phase passed by its list marker
whatever it did. Before a first heading a numbered item is as lost as a
bullet, so that half reads both and says item.

The other half is left reading bullets only, on purpose. A phase with a
numbered list and no track heading is how a phase says its work is the
same on every track, and its schema makes that legal, while achievements
are bullets and must stand under a kind. A test pins the numbered list
under no heading as passing, so the difference is on record as meant.

Verified: node verify/check.mjs and node --test verify/ exit 0.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
MSG
```

---

### Task 4: The parser's half is pinned

The parser was not changed for any of this, which is the spec's argument for the decision, and a behavior that arrives for free is one nobody notices leaving. Three tests pin it: a track is an entity of type `track` owned by its process, with edges `Tracks.Track` and `Activities.Track`; two processes may each have a track of one name and a phase's heading lands on its own; and a heading naming another process's track is an R4 that says where it looked.

**Files:**

- Test: `verify/instance.test.mjs` (append at end of file)

**Interfaces:**

- Consumes: `schema(type, { fields, tables, grouped, location, owner })` and `parseInstance(files, { schemas })`, already at the top of `verify/instance.test.mjs`. This file's `schema` helper takes an options object and `grouped` as `{ Section: [name, type] }`; it is not the helper of the same name in `verify/instance-checks.test.mjs`.
- Produces: nothing later tasks use.

- [ ] **Step 1: Write the tests**

Append to the end of `verify/instance.test.mjs`:

```js
// A track is a second type a process owns, and a phase's `### [Track]` heading is a declared
// reference to it. The parser was not changed for it: a type is read from its schema's File
// Location, an owned name resolves within the owner the referring entity is or is owned by, and a
// grouped heading draws an edge. These pin that, since nothing else would notice it going.
const tracking = () => new Map([
  ["identity-schema.md", schema("identity", { location: "identity.md" })],
  ["process-schema.md", schema("process", { tables: { Tracks: [["Track", "ref → track"]], Phases: [["Phase", "ref → phase"]] }, location: "processes/<process>/<process>.md" })],
  ["track-schema.md", schema("track", { location: "processes/<process>/tracks/*.md", owner: "process" })],
  ["phase-schema.md", schema("phase", { grouped: { Activities: ["Track", "ref → track"] }, location: "processes/<process>/phases/*.md", owner: "process" })],
]);
const twoTracked = (extra = []) => new Map([
  ["identity.md", "# Beacon Systems\n\n> Billing software.\n"],
  ["processes/delivery/delivery.md", "# Delivery\n\n> Ships.\n\n## Tracks\n\n| Track |\n| --- |\n| Code |\n| Docs |\n\n## Phases\n\n| Phase |\n| --- |\n| Build |\n"],
  ["processes/delivery/tracks/code.md", "# Code\n\n> A merged change.\n"],
  ["processes/delivery/tracks/docs.md", "# Docs\n\n> A published page.\n"],
  ["processes/delivery/phases/build.md", "# Build\n\n> Make it.\n\n## Activities\n\n### Code\n\n1. Write it.\n\n### Docs\n\n1. Draft it.\n"],
  ["processes/hiring/hiring.md", "# Hiring\n\n> Hires.\n\n## Tracks\n\n| Track |\n| --- |\n| Code |\n\n## Phases\n\n| Phase |\n| --- |\n| Screen |\n"],
  ["processes/hiring/tracks/code.md", "# Code\n\n> A reviewed exercise.\n"],
  ["processes/hiring/phases/screen.md", "# Screen\n\n> First.\n\n## Activities\n\n### Code\n\n1. Read it.\n"],
  ...extra,
]);

test("a track is an entity its process owns, named by its table and by a phase's headings", () => {
  const graph = parseInstance(twoTracked(), { schemas: tracking() });
  const code = graph.entities.find((e) => e.id === "processes/delivery/tracks/code");
  assert.equal(code.type, "track");
  assert.equal(code.owner, "processes/delivery");
  const edge = (from, via) => graph.edges.filter((e) => e.from === from && e.via === via).map((e) => e.to).sort();
  assert.deepEqual(edge("processes/delivery", "Tracks.Track"), ["processes/delivery/tracks/code", "processes/delivery/tracks/docs"]);
  assert.deepEqual(edge("processes/delivery/phases/build", "Activities.Track"), ["processes/delivery/tracks/code", "processes/delivery/tracks/docs"]);
});

test("two processes may each have a track of one name, and a phase's heading finds its own process's", () => {
  const graph = parseInstance(twoTracked(), { schemas: tracking() });
  const to = graph.edges.filter((e) => e.from === "processes/hiring/phases/screen" && e.via === "Activities.Track").map((e) => e.to);
  assert.deepEqual(to, ["processes/hiring/tracks/code"]);
});

test("a phase heading that names no track of its own process is an R4 that says where it looked", () => {
  const files = twoTracked();
  files.set("processes/hiring/phases/screen.md", "# Screen\n\n> First.\n\n## Activities\n\n### Docs\n\n1. Read it.\n");
  assert.throws(() => parseInstance(files, { schemas: tracking() }), /R4: "Docs" in .*screen\.md "## Activities" names no track of processes\/hiring/);
});
```

- [ ] **Step 2: Run them**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-track && node --test verify/instance.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)"
```

Expected: `fail 0`, `pass` three above the total noted in Task 1. They pass on the first run because the parser already does this; that is what they are for.

- [ ] **Step 3: See that each can fail**

A test that has never failed has shown nothing. In the fixture `twoTracked`, change the path `processes/hiring/tracks/code.md` to `processes/hiring/tracks/kode.md` and its H1 `# Code` to `# Kode`, run the file, and read the failures: all three new tests fail with `R4: "Code" … names no track of processes/hiring`, the third because its expected error names `"Docs"` and a different one arrived first. Put it back. Then in the third test change `### Docs` to `### Code`, run, and see `Missing expected exception`. Put it back and run once more:

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-track && node --test verify/instance.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)" && git diff --stat
```

Expected: `fail 0`, and the diff stat names `verify/instance.test.mjs` alone.

- [ ] **Step 4: Commit**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-track && git add verify/instance.test.mjs && git commit -F - <<'MSG'
The parser's reading of a track is pinned, though it did not change

A type is read from its schema's File Location, an owned name resolves
within the owner the referring entity is or is owned by, and a grouped
heading draws an edge, so a track parsed the moment its schema existed.
Nothing would notice that going. Three tests hold it: a track is owned by
its process and named by the process's table and a phase's headings, two
processes may each have a track of one name, and a heading naming another
process's track is an R4 that says where it looked.

Verified: node --test verify/instance.test.mjs exits 0, and each test was
seen to fail once against a fixture broken on purpose.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
MSG
```

---

### Task 5: The release is prepared, and the pull request opened

A change to anything another repository vendors is at least a minor, because it makes every copy stale. This one asks every instance with a process to add a file per track and rewrite a table, which `conventions/WORKING.md` would call a major; core is below 1.0, where a minor carries a breaking change and the notes say so. Core's bytes changed, so `core/manifest.json` moves with `package.json` to the same number, and the reusable workflow's two mentions of the release move with them, because the checker compares its own version against an instance's pin and refuses when they differ. `shape` stays: no schema file changed shape, and a heading table is a shape the vocabulary already has.

**Files:**

- Modify: `core/manifest.json:1`
- Modify: `package.json:3`
- Modify: `.github/workflows/instance-check.yml:6` and `:37`

**Interfaces:**

- Consumes: Tasks 1 through 4, committed and green.
- Produces: a pull request, green, waiting for the owner. After the merge and only on the owner's word, a tag and a GitHub Release, which the follow-on work starts from.

- [ ] **Step 1: Read the numbers**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-track && cat core/manifest.json && sed -n '3p' package.json && grep -n "instance-check.yml@v\|ref: v" .github/workflows/instance-check.yml
```

The new version is `package.json`'s with its minor raised by one and its patch zero. When this plan was written `package.json` read `0.32.0` and core `0.31.1`, which makes it `0.33.0`; if another release has landed since, take the next minor after whatever `package.json` says now, and use that number wherever this task writes `0.33.0` and the old one wherever it writes `0.32.0`.

- [ ] **Step 2: Raise all four**

`core/manifest.json` becomes `{ "version": "0.33.0", "shape": 3 }`. `package.json` line 3 becomes `"version": "0.33.0",` at its indent. In `.github/workflows/instance-check.yml`, line 6's `instance-check.yml@v0.32.0` becomes `instance-check.yml@v0.33.0` and line 37's `ref: v0.32.0` becomes `ref: v0.33.0`.

- [ ] **Step 3: Verify**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-track && node verify/check.mjs > /dev/null; echo "verify $?"
node --test verify/ > /dev/null 2>&1; echo "tests $?"
sh conventions/conventions-format > /dev/null; echo "format $?"
sh conventions/conventions-check > /dev/null; echo "prose $?"
grep -n "0\.32\.0" core/manifest.json package.json .github/workflows/instance-check.yml; echo "left behind: $?"
```

Expected: four zeros, then `left behind: 1`, which is `grep` finding nothing. That last line is evidence only because Step 1 showed the same files carrying the old number.

- [ ] **Step 4: Commit**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-track && git add core/manifest.json package.json .github/workflows/instance-check.yml && git commit -F - <<'MSG'
Core and the package read 0.33.0, and the workflow's ref with them

A track is an entity its process owns, so every instance with a process
adds a file per track and cuts its Tracks table down to names. That breaks
an instance until it does, and it is a minor because core is below 1.0.
Core's bytes changed, so core moves with the package this time.

shape stays 3. No schema file changed shape: a heading table is a shape
the vocabulary has had since achievements were grouped.

Verified: node verify/check.mjs, node --test verify/, sh
conventions/conventions-format and sh conventions/conventions-check all
exit 0, and no line of the manifest, the package or the workflow still
names the release before.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
MSG
```

- [ ] **Step 5: Push and open the pull request, then stop**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-track && git -c credential.helper='!/opt/homebrew/bin/gh auth git-credential' push -u origin a-track-in-core
```

**Read the repository's last two merged pull request bodies first** — `gh pr list --state merged --limit 2 --json body` — and match their shape: the commit bodies reread for a reviewer who has not seen the diff, no headers, no bullets, ending with a `Verified:` line, then `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Link #111. Open it with `gh pr create --base main`, watch `gh pr checks --watch` until `verify` and `conventions / conventions` report, and say what they reported.

Then stop. Merging is the owner's decision and the word for it is theirs; it is never inferred from an earlier one. Do not chain a branch delete after a merge: a failed merge still runs the delete and closes the pull request.

- [ ] **Step 6: Tag and release, after the merge and only on the owner's word**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-track && git fetch origin && git checkout --detach origin/main
node verify/check.mjs > /dev/null; echo "verify $?"
git tag v0.33.0 && git -c credential.helper='!/opt/homebrew/bin/gh auth git-credential' push origin v0.33.0
gh release create v0.33.0 --title "0.33.0" --notes "$(cat <<'NOTES'
A track is an entity. A process owns its tracks as it owns its phases: each is a file in
`processes/<process>/tracks/`, holding the track's name as its H1 and what the track produces as
its tagline. The process's `## Tracks` is a table of one column, the names, and a phase's
`### [Track]` headings under `## Activities` are references to those tracks, held to the tracks
of the phase's own process. A track renamed in one place and not the others is now a failure
that names the place, where before every check stayed green.

This breaks every instance that has a process. `## Tracks` lost its `Produces` column and the
checker compares a header row to the schema's columns exactly, so a process that still carries
the column fails by name, and so does one whose rows name tracks that have no file. To take it,
add `tracks/` beside `phases/`, write one file per row with `source` in its frontmatter, the
row's name as the H1 and the row's `Produces` cell as the tagline, and cut the table down to the
`Track` column. An instance with no process changes nothing.

One check reads more than it did. An item standing before the first `###` heading of a grouped
section fails whether it is a bullet or a numbered item, so a phase's activity above its first
track heading is named. A phase with a numbered list and no track heading still passes: that is
how a phase says its work is the same on every track.

A consumer that draws the graph meets a new type, `track`, and two new kinds of edge beside the
ownership: `Tracks.Track` from a process and `Activities.Track` from a phase. One that renders a
process reads what a track produces from the track's tagline.
NOTES
)"
```

The tag is made on a detached `origin/main`, so it cannot land on a commit the merge did not make, and the suite runs on that commit before the tag exists. Run it once more after tagging: `release manifest` fails a tag that disagrees with `package.json`, and that is the run that can see it.

---

## What this plan does not do

The spec's cost section names the consumers and this plan touches none of them. Each takes the release in its own repository, on the owner's word, and in this order, because each later one reads the one before:

1. **`robertblust/mental-model`**, the reference instance. Re-vendor core and move the instance's pin in all of its places together; add `model/processes/delivery/tracks/code.md` and `prose.md`, each with `source: Local`, the H1 and the row's `Produces` cell as the tagline; cut `## Tracks` in `delivery.md` down to its names. The three phases that head their activities `### Code` and `### Prose` need no edit. Run the instance check with the new release and read it.
2. **`companygraph/obsidian-plugin`**. Re-pin the package, by name and with the lockfile. Its heading completion and its rename read grouped declarations and should need nothing; whether **New entity** can make a track, an owned type with no sections, is checked there. `src/locate.ts` finds a failure in the editor by its wording, and Task 3 changed “a bullet before” to “an item before”, so that file is read against the new message. Then the owner's original edit is replayed in Obsidian: rename a track, and see the phases change with it or be named.
3. **`companygraph/mcp-server`**. Re-pin; `list_types` and `describe_schema` read core and gain the type unaided. Any test or description that quotes the two-column Tracks table is reworded.
4. **`robertblust/design` and the sites.** A process page rendered the `Produces` column from the table; it now reads each track's tagline through the `Tracks.Track` edge. `/team/` on blust.ch is the page to look at. Re-pin, rebuild what is committed, and run the sitemap step with the page edit.
