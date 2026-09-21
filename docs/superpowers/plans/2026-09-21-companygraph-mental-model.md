# CompanyGraph mental model — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `companygraph/mental-model`, a CompanyGraph instance describing the company
behind the meta-model, with no person in it.

**Architecture:** The repository is created by running `init` from the working tree of #105 —
the first instance the tooling makes rather than one laid out by hand — then corrected in the
two places §2 of the spec names, joined to the conventions family, and filled one entity type
at a time. Every content task is a review loop, not a test loop: what an entry says is the
owner's decision, and the mechanical gate is `check-instance.mjs`.

**Tech Stack:** Markdown, YAML frontmatter, Node 22 (the checker only), GitHub Actions, the
vendored `conventions/` shell scripts and markdownlint-cli2.

**Spec:** [`../specs/2026-09-21-companygraph-instance-design.md`](../specs/2026-09-21-companygraph-instance-design.md)

**Sibling plan:** the site half — companygraph.io's second pin and the landing-page stage — is
a separate plan in `companygraph/companygraph.github.io`, and it cannot start until this one
merges, because a site cannot pin a commit that does not exist.

## Global constraints

- The instance's name, and the H1 of `model/identity.md`, is **CompanyGraph**.
- Core is vendored at **v0.35.0**, whose `core/manifest.json` reads version **0.34.0**, shape
  **3**. That release is what carries `track-schema.md`, which §3 of the spec needs.
- `.companygraph/manifest.json`'s `tooling` and `.github/workflows/companygraph.yml`'s ref must
  both read **0.35.0** / **v0.35.0**. `check-instance.mjs` refuses when its own version differs
  from `tooling`, and refuses a vendored core newer than itself.
- Populated root folders are exactly: `sources`, `values`, `strategic-objectives`,
  `strategies`, `surfaces`, `processes`. The six `init` also writes — `profiles`, `skills`,
  `roles`, `proficiency-levels`, `experience-kinds`, `achievement-kinds` — are deleted.
- Prose follows `conventions/WRITING.md`: en-US, sentence case headings, spaced em-dash, curly
  quotes, no serial comma, cause before mechanism, no adjective that sells.
- **A number that still moves is not written down** — no counts of entities, types, releases or
  pages in any prose this plan produces.
- One branch per change, in a sibling worktree named `mental-model-<branch>`; the clone stays
  on the default branch. Nothing is committed on `main` after Task 1.
- Commits and pull request bodies are in the git register: a subject under seventy characters,
  one to three paragraphs with no headers or bullets, a final line beginning `Verified:`, then
  the trailers.
- **Merging is the owner's decision.** Every task ends by opening the pull request, reporting
  the check and stopping.
- Nothing is invented. Every claim traces to the organization profile, the meta-model README
  and its specs, the pages of companygraph.io, or the intro talk.

---

### Task 1: The repository exists and passes its own check

**Files:**

- Create: the repository `companygraph/mental-model` on GitHub
- Create: everything `init` writes — `meta/core/*`, `.companygraph/manifest.json`,
  `model/README.md`, `model/<type>/README.md`, `model/sources/local.md`,
  `model/identity.md`, `model/vision.md`, `.github/workflows/companygraph.yml`, `AGENTS.md`,
  `CLAUDE.md`
- Modify: `.companygraph/manifest.json`, `.github/workflows/companygraph.yml`
- Delete: the six unpopulated root folders

**Interfaces:**

- Consumes: `bin/companygraph.mjs` from the working tree of companygraph/meta-model#105, at
  `/Users/rob/git/companygraph/meta-model` (branch `the-cli-design`)
- Produces: a green instance on `main`, and the commit later tasks branch from

- [ ] **Step 1: Create the repository, empty and private-to-public as the org does**

```bash
export PATH=/opt/homebrew/bin:$PATH
gh repo create companygraph/mental-model --public \
  --description "CompanyGraph, described in its own vocabulary" \
  --disable-wiki
git clone git@github.com:companygraph/mental-model.git ~/git/companygraph/mental-model
cd ~/git/companygraph/mental-model && git config user.email
```

Expected: `robert.blust@flatland.ch`. If it prints anything else, stop — `~/.gitconfig`'s
`includeIf` for `~/git/companygraph/` is not matching, and every commit will land misattributed.

- [ ] **Step 2: Run `init` from #105's working tree**

```bash
cd ~/git/companygraph/mental-model
node ~/git/companygraph/meta-model/bin/companygraph.mjs init . --here \
  --agent claude --name CompanyGraph --core v0.35.0
```

`--here` because the clone already exists. `--core v0.35.0` fetches that release's core rather
than vendoring the one inside #105's tree, which is 0.31.1 and predates `track`.

- [ ] **Step 3: Record what the run actually did, before changing any of it**

```bash
cat .companygraph/manifest.json | head -8
cat .github/workflows/companygraph.yml
ls model/
```

Write down `tooling`, `core.version`, `core.source`, the workflow's ref, and the list of
folders. Task 8 reports these to #105 and they cannot be recovered once corrected.

- [ ] **Step 4: Verify the uncorrected instance fails, and why**

Run: `node ~/git/companygraph/meta-model/bin/check-instance.mjs .`

Expected: FAIL. `init` writes `tooling` as its own package version, 0.32.0, while the vendored
core is 0.34.0 — a core newer than the checker that release carries — so the guard refuses
before reading a single entity. This is finding two of the spec's §8, observed rather than
predicted.

- [ ] **Step 5: Correct the two pins to the release that can run this core**

In `.companygraph/manifest.json`, set `"tooling": "0.35.0"`. In
`.github/workflows/companygraph.yml`, set the ref to `@v0.35.0`:

```yaml
name: companygraph
on:
  push:
    branches: [main]
  pull_request:
jobs:
  companygraph:
    uses: companygraph/meta-model/.github/workflows/instance-check.yml@v0.35.0
```

- [ ] **Step 6: Delete the six folders this instance will not populate**

```bash
cd ~/git/companygraph/mental-model
rm -r model/profiles model/skills model/roles \
      model/proficiency-levels model/experience-kinds model/achievement-kinds
ls model/
```

Expected: `README.md identity.md processes sources strategic-objectives strategies surfaces values vision.md`

- [ ] **Step 7: Verify the corrected instance passes**

Run: `node ~/git/companygraph/meta-model/bin/check-instance.mjs . ; echo "exit: $?"`

Expected: every check passes, `exit: 0`. The three starting entities are stubs and that is
legal — they exist, their sections are present, and `identity.md`'s `source` resolves to
`model/sources/local.md`.

- [ ] **Step 8: Commit and push to `main`**

This is the one commit that does not go through a pull request: the default branch does not
exist yet, so there is nothing to open one against. Protection is added in Step 9.

```bash
cd ~/git/companygraph/mental-model
git add -A
git commit -F - <<'MSG'
CompanyGraph is an instance of the model it publishes

The meta-model has described one company since the reference instance, and that company is a
person, so nothing in it separates the parts of the vocabulary that need a person behind them
from the parts that do not. This repository is the company behind the meta-model described in
the meta-model, with no person anywhere in it.

It was made by running `init` rather than laid out by hand, from the working tree of
companygraph/meta-model#105, which is the first time that tool has made anything. Core is
vendored at v0.35.0. Two things the run got wrong are corrected here and reported to that pull
request: it wrote a folder for every root type core declares, of which six are deleted because
this company has no people, and it pinned the manifest and the workflow to its own package
version, which cannot run the core it had just fetched.

Verified: `node bin/check-instance.mjs .` from meta-model exits 0 on the commit.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
git push -u origin main
```

- [ ] **Step 9: Protect `main`, mirroring the reference instance**

```bash
export PATH=/opt/homebrew/bin:$PATH
gh api repos/robertblust/mental-model/rulesets/22319074 > /tmp/ruleset.json
```

Create the same ruleset on the new repository: target `branch`, enforcement `active`,
conditions `~DEFAULT_BRANCH`, and the four rules — `deletion`, `non_fast_forward`,
`pull_request` with `allowed_merge_methods: ["merge"]` and zero required approvals, and
`required_status_checks` with `strict_required_status_checks_policy: true` and these two
contexts:

```json
[{ "context": "conventions / conventions" }, { "context": "companygraph / companygraph" }]
```

`conventions / conventions` is added now and starts reporting in Task 2; until then the
ruleset requires a check that never arrives, so Task 2 is not optional and comes next.

- [ ] **Step 10: Verify CI is green on `main`**

Run: `gh run list --repo companygraph/mental-model --limit 3`

Expected: the `companygraph` workflow completed successfully. Read the exit status on its own,
not through a pipe.

---

### Task 2: The conventions member

**Files:**

- Create: `conventions/` (vendored), `conventions.json`, `.markdownlint-cli2.jsonc`,
  `.github/workflows/check.yml`, `README.md`, `LICENSE`, `.gitignore`
- Modify: `AGENTS.md`

**Interfaces:**

- Consumes: `robertblust/conventions` at its current release
- Produces: a green `conventions / conventions` check, which Task 1's ruleset already requires

- [ ] **Step 1: Read the three files before writing anything**

```bash
cd ~/git/robertblust/conventions && git log --oneline -1
cat conventions/WRITING.md conventions/WORKING.md conventions/REPOSITORIES.md
```

- [ ] **Step 2: Branch, in a sibling worktree**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/mental-model && git fetch origin --quiet
git worktree add -b the-instance-joins-the-conventions \
  ~/git/companygraph/mental-model-the-instance-joins-the-conventions origin/main
```

- [ ] **Step 3: Write `conventions.json` at the release the family is on**

```json
{ "repo": "robertblust/conventions", "tag": "vX.Y.Z", "exclude": [], "format-exclude": [] }
```

Read the tag from `~/git/robertblust/conventions` — `git tag --sort=-v:refname | head -1` — and
write that exact value. Do not copy a tag out of this plan; a version written into a document
is stale by the time it is read.

- [ ] **Step 4: Vendor the shared files**

```bash
cd ~/git/companygraph/mental-model-the-instance-joins-the-conventions
sh conventions/conventions-sync 2>/dev/null || \
  CONVENTIONS_REPO=~/git/robertblust/conventions sh ~/git/robertblust/conventions/conventions/conventions-sync
```

On a repository with no `conventions/` yet, the script is taken from the conventions checkout
itself. It writes `conventions/`, `.markdownlint-cli2.jsonc` and `.vscode/`.

- [ ] **Step 5: Add the shared check workflow**

`.github/workflows/check.yml`:

```yaml
name: check
on:
  push:
    branches: [main]
  pull_request:
jobs:
  conventions:
    uses: robertblust/conventions/.github/workflows/check.yml@vX.Y.Z
```

The tag is the one `conventions.json` names, written out in full — a re-sync moves the pin,
the vendored folder and this line together.

- [ ] **Step 6: Write `README.md` with the title `REPOSITORIES.md` will ask for**

The first line must be exactly `# CompanyGraph — Mental Model`. `conventions-check` reads the
row for this repository and compares it to line 1; while the row does not exist yet it prints
"not in REPOSITORIES.md, so the README title is not checked" and passes, and the row lands in
the follow-up that releases conventions.

The body follows `robertblust/mental-model`'s README in shape — what the repository is, the
tree of what each folder holds, where the content is mastered, and the license split — and says
in its own words that this instance describes the company behind the meta-model and contains no
person.

- [ ] **Step 7: Write `LICENSE` as CC BY 4.0, and say so in the README**

`meta/core/LICENSE` is Apache 2.0 and is not written here. The README's license section states
the split: CC BY 4.0 for everything under `model/`, `meta/core/` under its own license at the
release the manifest names.

- [ ] **Step 8: Extend `AGENTS.md` with the conventions block and this instance's own rules**

`init` wrote an `AGENTS.md` whose first half is the instance's rules. The conventions block goes
above it, in the form every member carries:

```markdown
<!-- conventions · vX.Y.Z -->
Shared conventions of the robertblust, guestgraph and companygraph organizations live in
`conventions/`, vendored from robertblust/conventions at the release `conventions.json`
names. Read them before writing or committing anything here.
<!-- end conventions -->
```

Below it, keep what `init` wrote and add what is this instance's own: that the company
described here is CompanyGraph and not its owner, that no `profile`, `skill`, `experience`,
`role` or `proficiency-level` is written here by decision, and that a claim which cannot be
traced to a published page does not go in.

- [ ] **Step 9: Run both halves of the shared check**

```bash
cd ~/git/companygraph/mental-model-the-instance-joins-the-conventions
sh conventions/conventions-format; echo "format: $?"
sh conventions/conventions-check; echo "check: $?"
node ~/git/companygraph/meta-model/bin/check-instance.mjs .; echo "instance: $?"
```

Expected: `0`, `0`, `0`. `conventions-format fix` writes the Markdown form if the first is not
zero; nothing in it is fixed by hand.

- [ ] **Step 10: Commit, push, open the pull request, report and stop**

The subject says what is now true, under seventy characters — for example
`The instance is held to the family's conventions`. The body says why a member vendors rather
than references, and that the `REPOSITORIES.md` row follows rather than precedes because a
repository the list does not name passes. End with the `Verified:` line naming the three
commands above, then the trailers. Do not merge.

---

### Task 3: Identity and vision

**Files:**

- Modify: `model/identity.md`, `model/vision.md`

**Interfaces:**

- Consumes: `meta/core/identity-schema.md`, `meta/core/vision-schema.md`
- Produces: the canonical name `CompanyGraph`, which every later entity's `source` and
  reference resolution is written against

- [ ] **Step 1: Read the two schemas in the instance's own vendored core**

```bash
cd ~/git/companygraph/mental-model
sed -n '1,60p' meta/core/identity-schema.md
sed -n '1,60p' meta/core/vision-schema.md
```

Each schema's `## Frontmatter` and `## Sections` tables are the contract; its
`## Writing rules` is what no check reads and an agent judges by hand.

- [ ] **Step 2: Settle the first person, before drafting**

`value-schema.md`'s writing rules say the company speaks in its own first person — "I" for a
company of one, "We" for a company of more — and **the same one throughout the instance**.
CompanyGraph has no people in it at all, which neither branch anticipates. Put the question to
the owner with both readings: "We", because the reader of companygraph.io meets a project with
contributors and a talk; or "I", because the company is operated by one person and the
reference instance already says "I". Do not draft until this is decided; it is in every value,
strategy and process file that follows.

- [ ] **Step 3: Draft `model/identity.md`, and present it for review**

Present: what it says, the case against it, a proposal, and stop for the decision. Its facts
come from the organization profile's opening and companygraph.io's hero, and the `## Also at`
table carries `https://github.com/companygraph` and `https://companygraph.io` — which are the
addresses that exist, not every address that could.

- [ ] **Step 4: Draft `model/vision.md`, and present it for review**

The same loop. The vision is the future the company works toward, not what it ships today; the
organization profile's "Where we are" section is the roadmap and is not the vision.

- [ ] **Step 5: Verify**

```bash
cd ~/git/companygraph/mental-model-<branch>
sh conventions/conventions-format; echo "format: $?"
sh conventions/conventions-check; echo "check: $?"
node ~/git/companygraph/meta-model/bin/check-instance.mjs .; echo "instance: $?"
```

Expected: `0`, `0`, `0`.

- [ ] **Step 6: Commit, push, open the pull request, report and stop**

---

### Task 4: Sources and values

**Files:**

- Modify: `model/sources/local.md`
- Create: `model/values/*.md`

**Interfaces:**

- Consumes: `meta/core/source-schema.md`, `meta/core/value-schema.md`, and the first person
  settled in Task 3
- Produces: the source name every later entity's `source` field resolves to

- [ ] **Step 1: Read the two schemas, and one worked example of each**

```bash
cd ~/git/companygraph/mental-model
sed -n '1,60p' meta/core/source-schema.md meta/core/value-schema.md
cat ~/git/robertblust/mental-model/model/sources/local.md
cat ~/git/robertblust/mental-model/model/values/*.md
```

A value file in the reference instance reads like this, and this is the shape to match:

```markdown
---
source: Local
---

# Build the alternative before making the point

> Naming what is broken is free, so it is not a position until something works differently.

## In practice

I do not publish a criticism until I have built the thing that answers it, and then the
working alternative is what I lead with — the argument comes second and can be lost without
the point collapsing. Where I cannot build it, I say the problem is real and leave the
criticism unmade.

I never let a complaint stand as a position.
```

The last paragraph is one sentence beginning "I never …" / "We never …", and it names the
specific way the value gets broken rather than its absence.

- [ ] **Step 2: Decide whether `Local` is the only source**

Everything about CompanyGraph is mastered in its own repositories, so `Local` alone is the
proposal. Put it to the owner with the case against: the talk and the org profile live in other
repositories of the same organization, and a reader might expect those named. Recommend `Local`
alone, because a source is where a fact is *mastered* and these facts are mastered here.

- [ ] **Step 3: Draft each value, one at a time, presenting each for decision**

Candidates traceable to published prose: the meta-model's insistence that it is an extraction
and not an invention; that a schema is Markdown enforced by agents rather than a stage on the
way to JSON Schema; that nothing instance-specific is published in the vendor-neutral
repository; that the meta-model and its tooling stay open source and consulting is the one
thing that costs money. Each is a candidate, not a decision — present why, the case against, a
proposal, and stop.

- [ ] **Step 4: Verify, commit, push, open the pull request, report and stop**

```bash
cd ~/git/companygraph/mental-model-<branch>
sh conventions/conventions-format; echo "format: $?"
sh conventions/conventions-check; echo "check: $?"
node ~/git/companygraph/meta-model/bin/check-instance.mjs .; echo "instance: $?"
```

Expected: `0`, `0`, `0`. Then commit, push, open the pull request, report the check and stop.

---

### Task 5: Strategic objectives and strategies

**Files:**

- Create: `model/strategic-objectives/*.md`, `model/strategies/*.md`

**Interfaces:**

- Consumes: `meta/core/strategic-objective-schema.md`, `meta/core/strategy-schema.md`, the
  vision from Task 3 and the values from Task 4
- Produces: objective names that each strategy references by canonical name

- [ ] **Step 1: Read the two schemas and the reference instance's direction files**

```bash
cd ~/git/companygraph/mental-model
sed -n '1,70p' meta/core/strategic-objective-schema.md meta/core/strategy-schema.md
cat ~/git/robertblust/mental-model/model/strategic-objectives/*.md
cat ~/git/robertblust/mental-model/model/strategies/*.md
```

- [ ] **Step 2: Write the objectives before the strategies**

A strategy references the objective it reaches by canonical name, and a reference that does not
resolve fails the check. Objectives first, each presented for decision: what must become true
for the vision to be reached, drawn from the organization profile's "Where we are" and the
meta-model README's roadmap pointer.

- [ ] **Step 3: Write the strategies, each naming its objective**

A strategy says how one objective gets reached **and what the route rules out** — the second
half is the part a strategy is for, and a strategy that rules nothing out is a plan. The
meta-model's specs are the richest source here, because each records what was rejected.

- [ ] **Step 4: Verify, commit, push, open the pull request, report and stop**

```bash
cd ~/git/companygraph/mental-model-<branch>
sh conventions/conventions-format; echo "format: $?"
sh conventions/conventions-check; echo "check: $?"
node ~/git/companygraph/meta-model/bin/check-instance.mjs .; echo "instance: $?"
```

Expected: `0`, `0`, `0`. Then commit, push, open the pull request, report the check and stop.

---

### Task 6: Surfaces

**Files:**

- Create: `model/surfaces/*.md`

**Interfaces:**

- Consumes: `meta/core/surface-schema.md`
- Produces: the surface entities the landing-page graph will draw most visibly

- [ ] **Step 1: Read the schema and every surface in the reference instance**

```bash
cd ~/git/companygraph/mental-model
sed -n '1,80p' meta/core/surface-schema.md
ls ~/git/robertblust/mental-model/model/surfaces/
cat ~/git/robertblust/mental-model/model/surfaces/*.md | head -60
```

- [ ] **Step 2: List every surface that exists, before writing any**

Built surfaces are listed too, classified by how each is produced. A surface is named **for the
page, never for the place** — the page at companygraph.io/billing is a surface, "the website"
is not. Candidates: the landing page, the model page, the example page, the talks index, the
intro talk, the billing page, the privacy page, the organization profile, and the meta-model
README. Present the list for decision before writing a single file; the argument is about which
of these are surfaces of *this* model and which are pages that merely exist.

- [ ] **Step 3: Write each surface, one at a time, presenting each for decision**

A surface file holds rules and never state. It exists only where no script writes it; where a
script does, the script is the master and the surface says so.

- [ ] **Step 4: Verify, commit, push, open the pull request, report and stop**

```bash
cd ~/git/companygraph/mental-model-<branch>
sh conventions/conventions-format; echo "format: $?"
sh conventions/conventions-check; echo "check: $?"
node ~/git/companygraph/meta-model/bin/check-instance.mjs .; echo "instance: $?"
```

Expected: `0`, `0`, `0`. Then commit, push, open the pull request, report the check and stop.

---

### Task 7: The process, its phases and its tracks

**Files:**

- Create: `model/processes/<process>/<process>.md`,
  `model/processes/<process>/phases/*.md`, `model/processes/<process>/tracks/*.md`

**Interfaces:**

- Consumes: `meta/core/process-schema.md`, `meta/core/phase-schema.md`,
  `meta/core/track-schema.md`
- Produces: the deepest branch of the graph the landing page draws

- [ ] **Step 1: Read the three schemas and the reference instance's process**

```bash
cd ~/git/companygraph/mental-model
sed -n '1,80p' meta/core/process-schema.md meta/core/phase-schema.md meta/core/track-schema.md
find ~/git/robertblust/mental-model/model/processes -type f | sort
cat ~/git/robertblust/mental-model/model/processes/delivery/delivery.md
```

A process is an entity that owns collections, so it is a folder holding its own file beside
`phases/` and `tracks/`. Phases are ranked and the owner's table lists all of them, each once,
in the order the owned give — both are checks, and both fail loudly.

- [ ] **Step 2: Decide what CompanyGraph's one kind of work is**

The reference instance's process is delivery, shaped shape → spec → plan → implement →
integrate. CompanyGraph's own work is visible in this repository's history: a design spec that
records what was rejected, a plan, implementation under review, a release with notes, and
consumers re-pinning. Present that as the proposal with the case against — that it describes
how the meta-model is built rather than how the company operates, and those may not be the same
process — and stop for the decision.

- [ ] **Step 3: Write the process file, then the phases in rank order, then the tracks**

The process file's table of what it owns must list every phase, each once, in the order the
phase files give. Write the phases first and the table last, or write the table and expect the
check to correct you.

- [ ] **Step 4: Verify, commit, push, open the pull request, report and stop**

```bash
cd ~/git/companygraph/mental-model-<branch>
sh conventions/conventions-format; echo "format: $?"
sh conventions/conventions-check; echo "check: $?"
node ~/git/companygraph/meta-model/bin/check-instance.mjs .; echo "instance: $?"
```

Expected: `0`, `0`, `0`. Then commit, push, open the pull request, report the check and stop.

---

### Task 8: Report what `init` did, back to #105

**Files:**

- Modify: `docs/superpowers/specs/2026-09-21-companygraph-instance-design.md` §8, in
  `companygraph/meta-model`

**Interfaces:**

- Consumes: the notes taken in Task 1, Step 3, and the failure observed in Task 1, Step 4
- Produces: findings against #105 while it is still open

- [ ] **Step 1: Branch the meta-model, in a sibling worktree**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model && git fetch origin --quiet
git worktree add -b what-init-did ~/git/companygraph/meta-model-what-init-did origin/main
```

- [ ] **Step 2: Rewrite §8's two findings from predicted to observed**

Both were written before the run. Replace each with what actually happened: the exact folder
list `init` wrote, the exact `tooling` and core versions it recorded, and the exact message
`check-instance.mjs` printed when it refused. A finding that names the message it produced is
one a reader can search for.

- [ ] **Step 3: Add any finding the run produced that §8 does not have**

If `init` refused something it should have written, wrote something it should have refused, or
printed a message that did not say what to do next, it is a finding. If the run produced none
beyond the two, say so in one sentence rather than leaving the section looking unfinished.

- [ ] **Step 4: Verify**

```bash
cd ~/git/companygraph/meta-model-what-init-did
sh conventions/conventions-format; echo "format: $?"
sh conventions/conventions-check; echo "check: $?"
npm run verify >/dev/null 2>&1; echo "verify: $?"
```

Expected: `0`, `0`, `0`.

- [ ] **Step 5: Commit, push, open the pull request against `main`, and comment on #105**

The pull request body names #105 and says which findings are now observed rather than
predicted. Comment on #105 itself with the same two facts, because the person reading that
pull request is the person who can act on them. Report the check and stop.

---

### Task 9: The organization profile names the new repository

**Files:**

- Modify: `profile/README.md` in `companygraph/.github`

**Interfaces:**

- Consumes: the merged instance from Tasks 1–7
- Produces: the page a reader meets before choosing a repository, naming all of them

- [ ] **Step 1: Branch the profile repository, in a sibling worktree**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/.github && git fetch origin --quiet
git worktree add -b the-profile-names-the-instance \
  ~/git/companygraph/.github-the-profile-names-the-instance origin/main
```

- [ ] **Step 2: Add the row to the "Where to start" table**

The table's second column says what a repository is, in one line, in the same voice as the
rows beside it. The row names `mental-model` and says it is CompanyGraph described in its own
vocabulary — the second instance, and the one with no people in it.

- [ ] **Step 3: Add the node and its two edges to the mermaid diagram**

The new node sits in the `cg` subgraph. It takes the two edges every instance has: core
vendored at a release, from `MM`, and the site pinning it by commit, from `SITE`. Read the
existing edge labels and reuse them exactly — `"core vendored at a release"` and
`"pinned by commit · builds the model pages"` — because two labels for one relationship is a
diagram that has to be read twice.

- [ ] **Step 4: Check whether "Where we are" earns a line**

The roadmap's item 2 is the reference instance. A second instance is either part of that item
or a new one, and which it is decides whether anything changes here. Present both readings and
stop for the decision rather than editing a roadmap on your own judgment.

- [ ] **Step 5: Verify**

```bash
cd ~/git/companygraph/.github-the-profile-names-the-instance
sh conventions/conventions-format; echo "format: $?"
sh conventions/conventions-check; echo "check: $?"
```

Expected: `0`, `0`. The mermaid block is fenced, so `conventions-format` holds its fence and
not its contents — render the diagram on the pull request and read it before reporting.

- [ ] **Step 6: Commit, push, open the pull request, report and stop**

---

## After this plan

The `conventions/REPOSITORIES.md` row is the follow-up that makes this repository a member by
name and turns on its README title check. It is a change in `robertblust/conventions`, a
release, and a re-sync across every member — which is why it is not a task here: it reaches
fourteen other repositories that have nothing to do with this instance, and whether it rides
its own wave or the next one is the owner's call.

The site plan follows, in `companygraph/companygraph.github.io`, and pins the commit this plan
produces.
