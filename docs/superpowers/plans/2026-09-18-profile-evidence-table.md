# Profile evidence table implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move a profile's evidence out of the Skills table into a table of its own, one row per fact, each row able to name the experience the fact came from.

**Architecture:** `## Skills` drops to `Skill | Level`. A new optional `## Evidence` section is a table of `Skill` (the drawing reference), `What it shows` (string) and `Experience` (optional qualifier). The parser gains one guard so a blank qualifier cell is not resolved; nothing else in `lib/` or `verify/check.mjs` changes, because both already read what the schemas declare rather than naming columns.

**Tech Stack:** Node 22+, no dependencies. `node:test` for unit tests. Markdown schemas in `core/`, a worked instance in `example/`, a hand-written verification script in `verify/check.mjs`.

**Spec:** `docs/superpowers/specs/2026-09-18-profile-evidence-table-design.md`

## Global Constraints

- **Scope is this repository only.** The reference instance migration (`robertblust/mental-model`, 216 rows), the MCP server's test and description wording, and the site re-pin are named in spec §7 and get their own plan after 0.29.0 is released. Do not touch them here.
- **Branch:** `evidence-becomes-rows`, already carrying the spec. Work in the worktree at `/tmp/mm-evidence`; the main checkout at `~/git/companygraph/meta-model` has unrelated uncommitted work and must not be touched.
- **`export PATH=/opt/homebrew/bin:$PATH`** before any `node` or `gh` command. Both live there and are not on the default path.
- **Never commit on the default branch.** Never chain a branch delete after a merge.
- **Prose register** for every Markdown word written here, per `conventions/WRITING.md`: paragraphs by default, cause before mechanism, en-US spelling, no serial comma, spaced em-dash, no adjective that sells, and no count of something that still moves.
- **Commit messages** follow the git register: a subject that is a sentence under seventy characters with no prefix and no trailing period, a body of one to three short paragraphs with no headers and no bullets, then one line beginning `Verified:` naming what ran and passed, then the trailers. Every commit ends with `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.
- **Verification is running the command,** never reading the diff. The two that matter here are `node verify/check.mjs` and `node --test verify/`.
- **Do not edit anything under `docs/superpowers/plans/` or `docs/superpowers/specs/` other than this plan's own spec.** Older plans and specs quote the three-column Skills table as it was on the day they were written; they are the record of that day, and the repository is written forward.

---

### Task 1: The parser stops resolving a blank qualifier cell

The parser resolves every declared cell in a table row whether or not the cell holds anything, so the first blank `Experience` cell throws `R4: "" ... names no experience`. Frontmatter has had this right all along — `value === "" ? [] : [value]` at `lib/instance.mjs:264` means an empty field yields nothing to resolve. The table loop gains the same guard. This task is first because the schema change in Task 2 cannot be verified without it.

**Files:**

- Modify: `lib/instance.mjs:290`
- Test: `verify/instance.test.mjs` (append at end of file)

**Interfaces:**

- Consumes: nothing.
- Produces: `parseInstance(files, { schemas })` no longer throws on a blank cell in a column declared `qualifier → <type>`; the edge's `attrs` carries that column with the empty string as its value. Tasks 2 and 3 rely on this.

- [ ] **Step 1: Write the failing test**

Append to `verify/instance.test.mjs`. It reuses the `valid` and `schemas` fixtures already at the top of the file, whose profile schema declares `Skills` as `Skill | Level | Evidence` — a reference, a qualifier and a string. Blanking the qualifier is the case:

```javascript
// A cell with nothing in it names nothing, so there is nothing to resolve. Frontmatter has
// always read an empty field that way; a table row did not, and the first optional qualifier
// column in a schema — `Experience` on a profile's Evidence table — met R4 against an empty
// string. Requiredness is the checker's, which reads the schema's Required column; the parser
// owes only that a value it was given resolves.
test("a blank qualifier cell is not resolved, and keeps its empty value", () => {
  const files = new Map(valid);
  files.set("profiles/mira-halvorsen/mira-halvorsen.md",
    "---\nemail: mira@example.invalid\n---\n\n# Mira Halvorsen\n\n> Backend engineer.\n\n## Skills\n\n" +
    "| Skill | Level | Evidence |\n| --- | --- | --- |\n| Java Programming |  | Owned it. |\n");
  const { edges } = parseInstance(files, { schemas });
  assert.deepEqual(edges.find((x) => x.via === "Skills.Skill"), {
    from: "profiles/mira-halvorsen", to: "skills/java-programming", via: "Skills.Skill",
    attrs: { Level: "", Evidence: "Owned it." },
  });
});

// The reference column is not softened with it. A row that names no skill is the R4 it always
// was, because moving that error out of the parser would buy nothing: the row draws no edge
// and the page has said a thing it cannot mean.
test("a blank reference cell is still an R4 error", () => {
  const files = new Map(valid);
  files.set("profiles/mira-halvorsen/mira-halvorsen.md",
    "---\nemail: mira@example.invalid\n---\n\n# Mira Halvorsen\n\n> Backend engineer.\n\n## Skills\n\n" +
    "| Skill | Level | Evidence |\n| --- | --- | --- |\n|  | Proficient | Owned it. |\n");
  assert.throws(() => parseInstance(files, { schemas }), /^Error: R4: "" in .* names no skill/);
});
```

- [ ] **Step 2: Run the tests to verify the first one fails**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd /tmp/mm-evidence && node --test verify/instance.test.mjs 2>&1 | tail -20
```

Expected: `a blank qualifier cell is not resolved, and keeps its empty value` FAILS with `R4: "" in profiles/mira-halvorsen/mira-halvorsen.md "## Skills" names no proficiency-level`. The second test, `a blank reference cell is still an R4 error`, PASSES already — it is there to pin behavior the change must not alter, not to drive it.

- [ ] **Step 3: Add the guard**

In `lib/instance.mjs`, inside the table-row loop, the qualifier branch reads:

```javascript
          const d = columns.get(col);
          attrs[col] = d ? resolve(d, cell, where) ?? cell : cell;
```

Change it to:

```javascript
          const d = columns.get(col);
          attrs[col] = d && cell ? resolve(d, cell, where) ?? cell : cell;
```

Then extend the comment block above the loop, which today ends `a row whose \`ref\` column names nothing is the R4 it always was.` Add to it:

```javascript
    // A cell with nothing in it names nothing, so a declared column that is empty is not
    // resolved and keeps its empty value — the rule frontmatter has always had, where an
    // empty field yields no value to resolve. Whether the cell was allowed to be empty is
    // the schema's Required column, which the checker reads; the parser holds only what it
    // was given. The reference column is not included: a blank there draws no edge anyway,
    // and the R4 says so where the row is.
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd /tmp/mm-evidence && node --test verify/ 2>&1 | tail -8 && node verify/check.mjs 2>&1 | tail -2
```

Expected: `pass 82`, `fail 0`, and `✓ 20 checks passed`. The suite was 80 tests before this task; nothing existing may go red, because no fixture in the file has a blank declared cell today.

- [ ] **Step 5: Commit**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd /tmp/mm-evidence && git add lib/instance.mjs verify/instance.test.mjs && git commit -F - <<'MSG'
An empty cell has nothing to resolve

A table row resolved every cell its schema declared, empty or not, so a column
that is allowed to be blank could not be written: the first blank cell met R4
against an empty string. Frontmatter has always read an empty field as no value
to resolve, and the table loop now reads one the same way.

Whether a cell was allowed to be empty is the schema's Required column and the
checker reads it, so nothing is lost by the parser holding only what it was
given. The reference column keeps its R4, because a row that names no entity
draws no edge and the error belongs where the row is.

Verified: node --test verify/ passes 82 tests and node verify/check.mjs passes
20 checks.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
```

---

### Task 2: The schema moves evidence into a table of its own

**Files:**

- Modify: `core/profile-schema.md:31` (a row inserted into the Sections table, above `## Summary`), `:40` (the Evidence column row, deleted), `:42` (the paragraph under the Skills table), `:46` (the new column table and its paragraphs go immediately above this line), `:75-95` (the writing rules)

**Interfaces:**

- Consumes: Task 1's guard, without which the example written in Task 3 cannot parse.
- Produces: `## Skills` declared as `Skill | Level`; `## Evidence` declared as `Skill | What it shows | Experience`. Task 3's example files must match these column lists exactly, in this order — `checks.mjs` compares the instance's header row to the schema's column list joined by `|` and fails on any difference, including order.

- [ ] **Step 1: Run the check first, to see it green before the schema moves**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd /tmp/mm-evidence && node verify/check.mjs 2>&1 | tail -2
```

Expected: `✓ 20 checks passed`. This is the baseline the next step deliberately breaks.

- [ ] **Step 2: Cut the Evidence column out of the Skills table**

In `core/profile-schema.md`, delete this row entirely from the `## Skills` column table:

```markdown
| `Evidence` | Yes | string | A concrete fact the level can be weighed against. Required, because the adjective on its own measures confidence rather than skill. |
```

- [ ] **Step 3: Declare the new section**

In the Sections table, insert a row between `## Skills` and `## Summary` so the table reads:

```markdown
| `## Skills` | No | Table. One row per skill claimed; its columns are declared below. |
| `## Evidence` | No | Table. One row per fact a claim rests on; its columns are declared below. |
| `## Summary` | No | A paragraph of context |
```

Then, immediately before the line `` `## Also at` is a table with these columns: ``, insert the column table and the paragraphs that carry its reasons:

```markdown
`## Evidence` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Skill` | Yes | ref → skill | The claim this row stands under — the H1 of a file in `skills/` |
| `What it shows` | Yes | string | One sentence naming the thing done, concrete enough that a reader could check it |
| `Experience` | No | qualifier → experience | The period the fact comes from — the H1 of a file in this profile's `experiences/` |

Evidence is a table of its own rather than a third column of `## Skills` because a claim rests
on more than one thing and a cell holds one line. A paragraph listing four engagements cannot be
counted, and the rule for reading a level is a rule about counting: evidence that names one
engagement supports a lower rung than evidence that names three. One fact per row is what makes
that rule readable by anyone, including a machine.

`Experience` is the optional column and sits last. It is optional because a claim at the lower
rungs can rest on having been near work rather than on having owned a period of it, and such a
row leaves the cell blank rather than inventing a period to fill it. Where the cell is filled,
the period is read from the experience and is not written into the sentence as well: a date
copied beside a fact the experience already owns is a second copy that nothing keeps true.

The column is `What it shows` rather than `Evidence` so that it does not restate the section it
sits in, which is the same reason `## References` calls its first column `What`.
```

- [ ] **Step 4: Move the assessment paragraph and rewrite the purpose and the writing rules**

The paragraph under the Skills column table today reads "An assessment is a table row rather than a frontmatter field because it is a claim with prose attached, not a short fact." Its second half — about quoting hazards and wrapped lines — now argues for both tables, so leave the paragraph where it is and change only its first clause to name the pair:

```markdown
An assessment is a table row rather than a frontmatter field because it is a claim with prose
attached, not a short fact, and the evidence under it is a table for the reason stated below.
A table renders where a reader looks, has no quoting hazard around a colon or a wrapped line,
and declares its columns here exactly as a frontmatter field does.
```

In `## Purpose`, the last sentence reads "What only the profile can hold is the claim — this person, this skill, at this level, on this evidence." Leave it: it is still true, and the evidence is still the profile's.

In `## Writing rules`, replace the three rules that name the old cell. These:

```markdown
- An Evidence cell states a fact that can be checked — a system, an organization, a number, a
  named outcome. "Extensive experience" and "deep knowledge" are not evidence.
- Evidence never restates the level. If removing the Level column would lose nothing, the
  evidence is describing confidence rather than the work.
- A level is weighed against the evidence beside it and the rung's own definition, not against
  how long the person has done it. Evidence that names one engagement supports a lower rung
  than evidence that names three.
```

become these:

```markdown
- A `What it shows` cell states a fact that can be checked — a system, an organization, a
  number, a named outcome. "Extensive experience" and "deep knowledge" are not evidence.
- Evidence never restates the level. If removing the Level column would lose nothing, the row
  is describing confidence rather than the work.
- A row that says no more than its own `Experience` cell says nothing. It is dropped rather
  than written.
- One sentence per row, under forty words, and the period is not repeated in it where the
  `Experience` column names one.
- Rows run in the order the Skills table lists the skills, and chronologically within a skill.
- A level is weighed against the rows under it and the rung's own definition, not against how
  long the person has done it. One row supports a lower rung than three.
```

And the rule that reads "One row per skill claimed. A skill the person can name but not evidence has no row: the table is the claim, and a claim needs something under it." becomes:

```markdown
- One row per skill claimed in `## Skills`, and every claim has at least one row under it in
  `## Evidence`. A skill the person can name but not evidence has no row in either: the table
  is the claim, and a claim needs something under it.
- An `Experience` names a period this profile owns, and that experience lists this skill in its
  `skills` field. Neither is checked — both would be the first rule in the checker to name a
  type, and the schemas drive every rule there today — so both are kept by whoever writes.
```

The rule beginning "A profile whose nature is `agent` claims no skill and carries no Skills table" gains the second table:

```markdown
  claims no skill and carries neither a Skills table nor an Evidence table: a claim is a
```

- [ ] **Step 5: Run the check to verify it fails on the example, and only there**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd /tmp/mm-evidence && node verify/check.mjs 2>&1 | head -10
```

Expected, exactly two problems and no others:

```
✗ 2 problems

  example/model/profiles/mira-halvorsen/mira-halvorsen.md: "## Skills" columns are Skill|Level|Evidence; the schema declares Skill|Level
  example/model/profiles/tomas-reyes/tomas-reyes.md: "## Skills" columns are Skill|Level|Evidence; the schema declares Skill|Level
```

If a third problem appears, the schema's fixed shape is wrong — most likely the new column table's caption does not read exactly `` `## Evidence` is a table with these columns: ``, which is what `checks.mjs` matches a captioned column table by.

- [ ] **Step 6: Do not commit yet**

The repository is red until Task 3 lands, and a commit that does not verify is a commit whose `Verified:` line would have to lie. Task 3 commits both.

---

### Task 3: The example instance gains its Evidence table

Both example profiles move. Tomas's is where the design is shown: he claims Product Discovery at Expert, three of his experiences list the skill, and today's single evidence cell names one of them. Under rows the Expert rung has three periods beside it. His Java Programming claim is the other case — no experience of his lists it, so the row keeps its sentence and leaves `Experience` blank, which is what the optional column exists for.

**Files:**

- Modify: `example/model/profiles/tomas-reyes/tomas-reyes.md:13-19`
- Modify: `example/model/profiles/mira-halvorsen/mira-halvorsen.md:15-20`

**Interfaces:**

- Consumes: Task 1's guard (Tomas's blank cell) and Task 2's declarations (the exact column lists).
- Produces: a worked instance the schemas ship beside. Nothing later depends on it in this repository.

The experience H1s these rows must match exactly, because a qualifier resolves by name:

| Profile | Experience H1 | Lists |
| --- | --- | --- |
| Tomas Reyes | Finding out what the order pipeline was for | Product Discovery |
| Tomas Reyes | Conference talk — the speed-up nobody asked for | Product Discovery |
| Tomas Reyes | Deciding which billing goes first | Product Discovery, Domain-Driven Design |
| Mira Halvorsen | Rebuilding the order pipeline | Java Programming |
| Mira Halvorsen | Splitting the billing domain | Java Programming, Domain-Driven Design |

- [ ] **Step 1: Rewrite Tomas's two sections**

In `example/model/profiles/tomas-reyes/tomas-reyes.md`, replace the `## Skills` section with:

```markdown
## Skills

| Skill | Level |
| --- | --- |
| Product Discovery | Expert |
| Domain-Driven Design | Familiar |
| Java Programming | Familiar |

## Evidence

| Skill | What it shows | Experience |
| --- | --- | --- |
| Product Discovery | Ran the conversations that showed visibility, not speed, was what the pipeline rebuild bought, and rewrote the roadmap around it. | Finding out what the order pipeline was for |
| Product Discovery | Told a room that the rebuild's measured win was not the one it had been funded for. | Conference talk — the speed-up nobody asked for |
| Product Discovery | Killed two of the three features on the roadmap after twenty customer conversations; the third shipped and is the one customers name. | Deciding which billing goes first |
| Domain-Driven Design | Sat in the billing-context sessions and can follow a context map; has never drawn one. | Deciding which billing goes first |
| Java Programming | Reads pull requests well enough to ask the right question, and has merged none. |  |
```

The `2023` that today's cell carries is dropped: the period is the Beacon Systems entry's, and the row names it.

- [ ] **Step 2: Rewrite Mira's two sections**

In `example/model/profiles/mira-halvorsen/mira-halvorsen.md`, replace the `## Skills` section with:

```markdown
## Skills

| Skill | Level |
| --- | --- |
| Java Programming | Proficient |
| Domain-Driven Design | Competent |

## Evidence

| Skill | What it shows | Experience |
| --- | --- | --- |
| Java Programming | Owned the JVM services two other teams built on, and was the one called when they stopped. | Rebuilding the order pipeline |
| Java Programming | Replaced a nightly batch with a pipeline that ran when the order did, taking visibility from the next morning to seconds. | Rebuilding the order pipeline |
| Domain-Driven Design | Split the billing domain into two bounded contexts; the seams have held under two years of change. | Splitting the billing domain |
```

Mira's second Java row is drawn from the achievement her Northwind entry already states, so the two profiles differ in shape: hers shows two rows against one experience, his shows three experiences under one claim.

- [ ] **Step 3: Run the check and the suite**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd /tmp/mm-evidence && node verify/check.mjs 2>&1 | tail -3 && node --test verify/ 2>&1 | tail -8
```

Expected: `✓ 20 checks passed`, then `pass 82`, `fail 0`.

- [ ] **Step 4: Run the prose check**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd /tmp/mm-evidence && sh conventions/conventions-check; echo "EXIT=$?"
```

Expected: `✓ every Markdown file follows WRITING.md` and `EXIT=0`.

- [ ] **Step 5: Commit the schema and the example together**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd /tmp/mm-evidence && git add core/profile-schema.md example/ && git commit -F - <<'MSG'
Evidence is a table under the claim, not a cell beside it

A skill claim rested on one string, so the engagements a level was weighed
against could not be counted, and the period each fact came from was a year
typed into the sentence beside a fact the experience already owned. The claim
keeps the Skills table, now the skill and its level; the facts under it move to
an Evidence table of their own, one row each.

The row's Skill draws the edge where the Skills row drew one, and an optional
Experience column qualifies it without drawing a second. Filling that column is
what removes the year from the sentence: the period is read from the experience
instead. Leaving it blank is allowed, because a claim at the lower rungs can
rest on having been near work rather than on having owned a period of it.

The example shows both. Tomas claims Product Discovery at Expert and three of
his experiences list it, where one sentence named one of them; his Java
Programming row names no experience at all.

Verified: node verify/check.mjs passes 20 checks, node --test verify/ passes 82
tests, and the conventions prose check passes.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
```

---

### Task 4: Release 0.29.0

A change to what another repository vendors is at least a minor release, because it makes every copy stale. This one asks the taking repository to rewrite its profile, which by `conventions/WORKING.md` would be a major — except that core is below 1.0, where a minor carries a breaking change and the notes say so.

**Files:**

- Modify: `core/manifest.json:1`
- Modify: `package.json:3`
- Create: the tag `v0.29.0` and its GitHub Release

**Interfaces:**

- Consumes: Tasks 1 through 3, all committed and green.
- Produces: tag `v0.29.0` and a GitHub Release. The follow-on plan for `robertblust/mental-model` starts from it.

- [ ] **Step 1: Read the two version lines**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd /tmp/mm-evidence && head -1 core/manifest.json && sed -n '3p' package.json
```

Expected: `{ "version": "0.28.0", "shape": 3 }` and `  "version": "0.28.0",`.

- [ ] **Step 2: Raise both to 0.29.0**

`core/manifest.json` becomes `{ "version": "0.29.0", "shape": 3 }`. `package.json` line 3 becomes `  "version": "0.29.0",`. The `shape` field is untouched: it says what shape a schema file has, and no schema file changed shape.

- [ ] **Step 3: Verify**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd /tmp/mm-evidence && node verify/check.mjs 2>&1 | tail -2 && node --test verify/ 2>&1 | tail -6
```

Expected: `✓ 20 checks passed`, `pass 82`, `fail 0`.

- [ ] **Step 4: Commit**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd /tmp/mm-evidence && git add core/manifest.json package.json && git commit -F - <<'MSG'
Core 0.29.0

The profile's Skills table is the claim alone and the facts under it are an
Evidence table of their own, so every instance carrying a profile has a file to
rewrite. That is a breaking change, and it is a minor because core is below 1.0.

Verified: node verify/check.mjs passes 20 checks and node --test verify/ passes
82 tests.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
```

- [ ] **Step 5: Push and open the pull request, then stop**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd /tmp/mm-evidence && git push -u origin evidence-becomes-rows
```

Then open the pull request with a description that is the commit bodies reread for a reviewer who has not seen the diff, in the git register: no headers, no bullets, ending with a `Verified:` line. **Read the repository's last two merged pull request bodies first** — `gh pr list --state merged --limit 2 --json body` — and match their shape.

Report the check result and stop. Merging is the Owner's decision and the word for it is theirs; it is never inferred from an earlier one. Do not chain a branch delete after a merge: a failed merge still runs the delete and closes the pull request.

- [ ] **Step 6: Tag and release, after the merge and only on the Owner's word**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model && git checkout main && git pull
git tag v0.29.0 && git push origin v0.29.0
gh release create v0.29.0 --title "0.29.0" --notes "$(cat <<'NOTES'
A profile's evidence is a table of its own. The Skills table is the claim alone,
a skill and its level, and the facts under it move to `## Evidence`: one row per
fact, with the skill drawing the edge, a `What it shows` sentence, and an
optional `Experience` naming the period the fact came from.

This breaks every profile in every instance. The Skills table is now two columns
and the checker compares an instance's header row to the schema's column list
exactly, so a profile that still carries a third column fails by name. To take
it, move each evidence cell's sentences into `## Evidence`, one row each, name
the experience where there is one, and drop the year from the sentence when you
do — the period is the experience's and is read from there.

The parser changed with it: a blank cell in a declared column is no longer
resolved, which is what makes an optional qualifier column writable at all. An
instance with no blank cells sees no difference.
NOTES
)"
```

---

## What this plan does not do

Spec §7 names four consumers and this plan touches none of them. After 0.29.0 is released, a second plan covers, in this order:

1. **`robertblust/mental-model`** — re-vendor core in its three places, then the migration: 70 Skills rows lose a column and 216 sentences become rows. The instance's own `mental-model-evidence-coverage` skill already matches organization names to experiences, so it drives the migration rather than being run against the result. Its own file then shrinks to reading a column. Expect rows whose sentence restates the experience it names to surface and go.
2. **`companygraph/mcp-server`** — no code change; `findEvidence` names no column. Five test assertions name `attrs.Evidence` or `attrs.Level`, and the `find_evidence` tool description and its row in the README say "Evidence verbatim".
3. **`robertblust/design`** — no change expected. `Level` stays in the Skills table, so the proficiency marks on skill chips keep finding it, and the table renderer draws the new section unaided. Whether 216 rows should be grouped by their first column at render time is spec §9 and is a separate decision.
4. **The site** — re-pin, regenerate `model.json` and the export bundles, and reword the two export files that tell their reader to look at "the Evidence cell in Profiles.md".
