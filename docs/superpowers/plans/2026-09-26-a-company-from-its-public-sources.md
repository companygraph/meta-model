# A company is drawn from what it publishes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The tooling writes two new skills, `companygraph-company`, which builds an instance from a company's web address, and `companygraph-consent`, which records the terms and consents a source's content is used under, and `companygraph-profile` asks for the person's consent before it writes.

**Architecture:** The skills are Markdown procedures under `agents/claude/skills/`, collected by `init` with a directory walk, so no plan code changes; the deliverables are three `SKILL.md` texts, the four places that name the skills by name, and the package's minor. The first real run is on a fresh instance for a company the owner names, on this branch, and what it changes ships in the same pull request. The three instances take the skills by upgrading after the tag.

**Tech Stack:** Markdown skills for Claude, Node ESM (`node --test`) for the CLI test, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-26-a-company-from-its-public-sources-design.md` (this branch).

## Global Constraints

- Skill names `companygraph-company` and `companygraph-consent`, folders `agents/claude/skills/<name>/SKILL.md`, frontmatter `name`, `description`, `allowed-tools` as the four existing skills carry.
- Core does not change and stays at 0.42.0. The package moves to 0.49.0, and the `ref:` in `.github/workflows/instance-check.yml` names `v0.49.0` in the same commit.
- A consent is prose on the source's `> [Description]`, one sentence for the terms and one per consent, in the shape "Published under <terms>, read on <Month D, YYYY>. <Who>, <capacity>, consented on <Month D, YYYY>, by <how>, to <what>." No field on the source schema.
- LinkedIn is read only as its public page loads without a login or as the operator pastes it; a path `robots.txt` disallows is not read.
- A site is a source, never a surface, unless the company runs the model; the skill writes no surface.
- Not extracted, not noted: a revenue, a headcount, a funding round, a customer count, a founding year stated as an age. Not written: brand, skills, evidence, experiences.
- The ledger is `dist/research/<date>-<instance>.md`; `dist/` is gitignored and the ledger is never committed. The skills commit nothing.
- American English everywhere (R14); commits and PR bodies are prose, no headings or bullets, ending `Verified: …` before the trailers.
- Every branch lives in a sibling worktree named `<repo>-<branch>`; the clone stays on `main`. This work is in `meta-model-company-from-public-sources`, branch `company-from-public-sources`.
- Every PR is opened and left: a merge, a tag and a release each wait for Rob's explicit go.
- Before any `node`/`npm`/`gh`: `export PATH=/opt/homebrew/bin:$PATH`.
- `sh conventions/conventions-format check` and `sh conventions/conventions-check` pass before every commit.

## Review Focus

- An instance `init` wrote before these skills existed, whose manifest records no skill: `upgrade` gives it all six, because the existing test at `verify/cli.test.mjs` asserts the listing against `SKILL_NAMES`; Tasks 1 and 2 extend that constant so the assertion covers the two new folders.
- A skill file edited inside an instance: `check` refuses it as it refuses edited core, and the existing test pins it for `companygraph-validate`; Task 2 adds the same assertion for `companygraph-company/SKILL.md`, because a skill that asks the operator questions is the one an operator is most tempted to edit.
- A fresh instance's `AGENTS.md` naming four skills while six are on disk: an agent reading the file would not know to run consent; Task 4's test asserts the paragraph names both new skills.
- The profile skill's steps renumbered with a gap or a duplicate after the insertion: an operator following "step 4" would land on the wrong step; Task 3 asserts the numbering is 1 through 11 with a shell check.
- A consent sentence written in a second shape by a later run, so that a future move to a table cannot be mechanical: the consent skill states the one shape and Task 1's text carries it verbatim, and the first-run task checks the sentence the run wrote against it.

---

## Phase A — the skills (worktree `meta-model-company-from-public-sources`)

### Task 1: The consent skill

**Files:**

- Create: `agents/claude/skills/companygraph-consent/SKILL.md`
- Modify: `verify/cli.test.mjs:539` (the `SKILL_NAMES` constant)

**Interfaces:**

- Produces: the skill name `companygraph-consent`, which Task 2's and Task 3's texts invoke by that string, and the consent sentence shape the Global Constraints give.

- [ ] **Step 1: Extend the test so it fails**

In `verify/cli.test.mjs`, change the constant to:

```js
const SKILL_NAMES = ["companygraph-consent", "companygraph-export", "companygraph-profile", "companygraph-surface", "companygraph-validate"];
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `export PATH=/opt/homebrew/bin:$PATH && node --test verify/cli.test.mjs 2>&1 | grep -E "^(not ok|ok) .*skills"`

Expected: `not ok` on "init writes the skills, hashed into the manifest like the core, and tells how to run the checks" and on "upgrade gives the skills to an instance that records none and holds none, and check passes after", with the listing missing `companygraph-consent`.

- [ ] **Step 3: Write the skill**

Create `agents/claude/skills/companygraph-consent/SKILL.md` with exactly this content:

````markdown
---
name: companygraph-consent
description: Record the terms a source's content is published under and the consent its use needs — find the terms, propose whether a consent is needed, take the one the operator states, and keep it as a sentence on the source every fact names. A step of companygraph-company and companygraph-profile, and a procedure of its own when a source is added later.
allowed-tools: Bash(*), Read, Write, Edit, Glob, Grep, WebFetch
---

# companygraph-consent

Every fact in the model names the source it is mastered in, and this records, on that source, what its content may be used for and who agreed to it. It runs for one source and one or more subjects: a company whose statements are drawn from the source, a person drawn from it, a document read from it. It runs as a step of `companygraph-company` and of `companygraph-profile`, and alone when a source is added to an instance later. It records what the operator decided and where the terms were found, and it gives no legal advice: whether a use is lawful is the operator's question to a person qualified to answer it, and the report says so in one line.

Read `<units>/core/source-schema.md` whole before writing to a source, where `<units>` is the folder `.companygraph/manifest.json` names under `units`. The schema is the contract for the file this writes to, and nothing here restates it.

## Procedure

1. **Name the source and the subjects.** The caller names them; when run alone, ask. The source is a file under `model/sources/`, existing or about to be written, and the subjects are each a company, a person or a document, named as the operator names them.

2. **The terms.** Find what the content is published under: a `LICENSE` beside a repository, a site's terms or legal page, a platform's user agreement, a document's own notice. Record which was found and its address, or that none was found. Name the uses the run makes of the content, and there are three: facts restated in the model's own words with the source named; text carried verbatim, a tagline, a mission line, a value statement; a file copied, an image or a document. Say for each use whether the terms found allow it. Where the terms are silent, or none were found, the operator judges, and the judgment is written down as theirs, never as the skill's.

3. **Is a consent needed?** Propose an answer the operator can override, from three defaults. A person drawn from any source: yes, the person's own, because a profile is personal data in a model that is published. A company drawn by an operator who is not the company: yes, the company's, because its statements are being held and republished elsewhere. A company modeling itself, or a person modeling themselves: no, and the step is one line in the report. The operator decides, and the decision is theirs whichever way it goes.

4. **Is it given?** Where a consent is needed, ask whether it has been given: by whom, in what capacity, on what date, and how, a mail, a signed letter, in person. Take what the operator states and infer nothing: a consent the operator cannot state is not given. A consent not given means the content that rested on it is not used; tell the caller which subjects are declined, so it writes nothing that rested on them, name them in the report, and propose the line for the instance's agent file that records the decision so the next run does not ask again.

5. **Write.** The source's `> [Description]` gains one sentence for the terms and one per consent given, in this one shape and no other, so that a later move of these records to a table is mechanical:

   ```text
   Published under <terms>, read on <Month D, YYYY>. <Who>, <capacity>, consented on <Month D, YYYY>, by <how>, to <what>.
   ```

   As written for a company's site: "Published under the site's terms, read on September 26, 2026. Jane Doe, its founder, consented on September 26, 2026, by mail, to its statements being held in this model." Where no terms were found, the first sentence reads "Published under no stated terms, read on <Month D, YYYY>." Where no consent was needed, there is no second sentence. Where the source does not exist yet, the caller writes it with these sentences in place; when run alone, write them into the existing file and change nothing else in it. The source is in the model, committed and versioned, so the record is kept the way every other fact is.

## Report

The source, by H1; the terms found and their address, or that none were; each use and whether the terms allow it, with the operator's judgment marked as theirs where the terms were silent; each subject, whether a consent was needed, and whether it was given, with the sentence written; each subject declined and the agent-file line proposed for it; and the one line that this is a record of decisions and not legal advice. Nothing is committed.
````

- [ ] **Step 4: Run the test to verify it passes, and the family checks**

Run: `export PATH=/opt/homebrew/bin:$PATH && node --test verify/cli.test.mjs 2>&1 | tail -8 && node verify/check.mjs && sh conventions/conventions-format check && sh conventions/conventions-check`

Expected: the CLI suite reports `fail 0`; each check prints its ✓ line.

- [ ] **Step 5: Commit**

```bash
git add agents/claude/skills/companygraph-consent/SKILL.md verify/cli.test.mjs
git commit -F - <<'EOF'
A consent is recorded on the source every fact names

companygraph-consent is the step both the company and the profile skill will call, and a procedure of its own when a source is added later: it finds the terms the content is published under, names the three uses a run makes of it, proposes whether a consent is needed from three defaults the operator can override, takes the consent the operator states and infers none, and writes it as one sentence on the source's description in one shape, so a later move to a table is mechanical. A declined consent goes back to the caller with the subjects it covers and a proposed agent-file line. The CLI test's list of skills gains the folder, so init writes it and upgrade moves it.

Verified: node --test verify/cli.test.mjs reports fail 0, node verify/check.mjs and both conventions checks report clean.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

### Task 2: The company skill

**Files:**

- Create: `agents/claude/skills/companygraph-company/SKILL.md`
- Modify: `verify/cli.test.mjs:539` (the `SKILL_NAMES` constant) and the test "check fails on a skill edited inside the instance, as on edited core" at `verify/cli.test.mjs:553`

**Interfaces:**

- Consumes: `companygraph-consent` from Task 1, invoked by name in step 6 of the text below.
- Produces: the skill name `companygraph-company`, which Task 4's four naming places carry.

- [ ] **Step 1: Extend the tests so they fail**

In `verify/cli.test.mjs`, change the constant to:

```js
const SKILL_NAMES = ["companygraph-company", "companygraph-consent", "companygraph-export", "companygraph-profile", "companygraph-surface", "companygraph-validate"];
```

Below the test "check fails on a skill edited inside the instance, as on edited core", add:

```js
test("check fails on the company skill edited inside the instance, the one an operator is most tempted to edit", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  fs.appendFileSync(path.join(root, ".claude/skills/companygraph-company/SKILL.md"), "\n10. Also read the blog.\n");
  const result = spawnSync(process.execPath, [cli, "check", root], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /\.claude\/skills\/companygraph-company\/SKILL\.md: not as the tooling wrote it/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `export PATH=/opt/homebrew/bin:$PATH && node --test verify/cli.test.mjs 2>&1 | grep -E "^not ok"`

Expected: `not ok` on the two listing tests and on the new edited-skill test, the last because the file does not exist to append to.

- [ ] **Step 3: Write the skill**

Create `agents/claude/skills/companygraph-company/SKILL.md` with exactly this content:

````markdown
---
name: companygraph-company
description: Build an instance from a company's web address — read what the company publishes on its site, its GitHub organization and its public pages, put what a schema has a place for to the operator as a ledger and a round of keep-or-strike questions, record the terms and consents, and write the identity, sources, domains, products, features, vision, values, questions and thin profiles the operator kept. A procedure, because which page says what the company is and who wants to be in a model are judgments no script makes.
allowed-tools: Bash(*), Read, Write, Edit, Glob, Grep, WebFetch, WebSearch
---

# companygraph-company

A company arrives as a web address and leaves as an instance the model can hold: its identity, the sources its facts are mastered in, its products and the domains they sit in, its vision and values where it publishes them, the questions its site answers, and a thin profile for each person its team page names that the operator chose to keep. Most of that is judgment, which of three names is the one the company writes, whether a person on a team page wants to be in a model, so this is a procedure, and the operator is asked wherever the answer is theirs.

Every type's schema is the contract and nothing here restates it. Read `<units>/core/CONVENTIONS.md` whole, and a type's schema whole before writing an entity of it: its frontmatter table, its sections table and its writing rules. `<units>` is the folder `.companygraph/manifest.json` names under `units`. Read the instance's own agent file as well, because an instance may decide what core leaves open: which facts stay out of the model, which places are cited.

## Procedure

1. **Create or Update.** Ask which. Create is an instance `init` wrote whose identity is still the stub, its H1 the instance's name and its tagline placeholder prose. Update is an instance with content, and the run reconciles before it writes.

2. **The address.** Ask for the company's web address. It is the one question the run needs; everything else follows from it. Fetch the front page and read the imprint, the legal page or the about page for the name the company writes, its seat and its contact address, and confirm the name with the operator before anything else, because it is the identity's H1 and every later fact is about it.

3. **Research.** Read the site's pages reachable from its navigation and footer: about, team, products or services, values or mission, careers, FAQ, imprint, press, and the index of a blog but not its posts, which document an experience and belong to a profile. Read `robots.txt` first: a path it disallows is not read, and the ledger says so. Find the GitHub organization by the site's link to it or by the company's name, and read the organization profile, the pinned repositories, each one's README and the license beside it. Read LinkedIn only as the public company page loads without a login, or as the operator pastes it, and never through a session, because its agreement forbids the rest. Search the web for the company's name with its domain and note what the search surfaces without reading it yet: a register entry, a Crunchbase or Wikipedia page, press, a podcast. Write every page read to the ledger with its address and the date it was read.

   Take out only what a schema has a place for: the name, the tagline as the company writes it, what it does and for whom, its seat and contact address, each presence it maintains elsewhere, each product and what it is, each feature where the site names one, the areas the site groups its offer into, its vision or mission where stated, each value where stated, each question its FAQ answers, and for each person on a team page the name, what the page says the person does, and the person's own public presences. A revenue, a headcount, a funding round, a founding year stated as an age, a customer count: these are numbers that move, no schema holds them, and they are not extracted and not noted anywhere. A brand is left to the owner: what the mark means and how the voice sounds is not readable from outside, and the stub `init` wrote stays until the company writes it.

4. **The ledger.** Write `dist/research/<date>-<instance>.md`, with `<date>` as `YYYY-MM-DD` and `<instance>` the model's folder name: one table per type, one row per entity or fact the run proposes, with the address it came from and the words the source uses. Below the tables, three lists: the further sources the search surfaced and the run did not read; the pages read that yielded nothing; the pages not read and why, a robots rule, a login, a paywall. `dist/` is gitignored, so the ledger is the operator's record of the run and never part of the model; what the model keeps is the source each fact names.

5. **The operator decides.** Show the ledger. For each type, the operator keeps, strikes or renames each row. Then ask which of the further sources to read; on any yes, return to step 3 for those alone, add to the ledger, and stop when a round adds nothing the operator keeps. A team page is a special case of the first question: each person is a row the operator keeps or strikes by name, and a struck person is not mentioned in the model anywhere.

6. **Terms and consent.** For every source the kept rows name, run `companygraph-consent` with the company as the subject, and with each kept person as a subject of their own. What it writes, and what a declined consent does to the rows that rested on it, is that skill's to say. Write no entity whose consent was declined, and write the sentences it produced into the source when the source is written in step 8.

7. **Reuse before creating.** Read the instance's agent file for facts the owner has decided to leave out of the model and treat each as settled: a page stating one is not a reason to propose it again. List the H1s already in every type folder the kept rows would write to, and a fact that fits an existing entity is written against that entity by its H1, never under a second spelling. On Update, read every entity the rows would touch and hold each kept fact against it: already held, and where; new; held differently, with both versions quoted; or left out by a recorded decision. Show that reconciliation before writing, because on a model that is already rich most of a site is already held, and what is worth the operator's time is the new and the different. Keep every sentence already written.

8. **Write.** Sources first, one per place the kept facts were read from, each with its `url`, its description saying what it holds and that nothing syncs from it, and the sentences the consent skill wrote. Then the identity: the H1, the tagline as a draft in the company's voice, `## What it is`, `url`, `location` and `email` where the imprint gives them, and one `## Also at` row per presence the operator kept. Domains before products and products before features, because each names the one before it. Vision and values only where the company states them in its own words, and each schema's writing rules hold: a value's `## In practice` is drafted from what the site says following it looks like, and shown as a draft. Questions last, since a question rests on entities that must exist. Each kept person becomes a profile with `nature` human, a tagline drafted from what the page says, the person's `## Also at` rows, and no `## Skills` table: a public page evidences no claim at any level, and a fuller profile is `companygraph-profile`'s work from the person's own documents. The model is written in its own words with the source named; a sentence carried verbatim, a tagline, a mission line, a value statement, is carried only where the terms or a consent allow it, and the report says which sentences those are. Every tagline and every `## What it is` is shown to the operator as a draft, never left as if the company wrote it.

9. **Validate.** Run the mechanical checks, `companygraph check`, or the checker at the release the instance's workflow names where the CLI is not installed; then run `companygraph-validate` for the writing rules no script reads. Repair what it finds, mechanical failures and writing-rule judgments both. Where a repair would change something the operator decided, ask instead.

## What this is not

Not a crawler: it reads the pages a person would read to learn what a company is, and a blog's posts, a documentation site and a repository's code are not among them. Not a writer of surfaces: a surface is a place the company publishes from the model, and a company's site is that only when the company runs the model; for an operator modeling another company the site is a source, the place the company's own statements are mastered, and the identity's `url` is where it is. An instance whose owner is the company adds its site as a surface by hand.

## Report

What was created, one line per file; what was reused, by H1; every page read and every page not read, with why; every question the operator answered and the answer; every fact left out because no schema holds it, named by kind and never by value; the sentences carried verbatim and under which terms or consent; the consents recorded, by source; the gaps the validation pass reported. Where the operator declined a fact the site states and the agent file does not yet record that decision, propose the line that would record it, so the next run does not ask again. Nothing is committed: the files are written and validated, and the commit is the operator's.
````

- [ ] **Step 4: Run the tests to verify they pass, and the family checks**

Run: `export PATH=/opt/homebrew/bin:$PATH && node --test verify/cli.test.mjs 2>&1 | tail -8 && node verify/check.mjs && sh conventions/conventions-format check && sh conventions/conventions-check`

Expected: the CLI suite reports `fail 0`; each check prints its ✓ line.

- [ ] **Step 5: Commit**

```bash
git add agents/claude/skills/companygraph-company/SKILL.md verify/cli.test.mjs
git commit -F - <<'EOF'
A company is drawn from what it publishes

companygraph-company is the reading of a company's public pages as a procedure: one question, the web address, then the site's navigation pages, the GitHub organization and LinkedIn as its public page loads, a ledger under dist/research/ with one table per type and the address behind every row, a round of keep-or-strike questions per type and a second on the further sources the search surfaced, the consent skill for every source the kept rows name, a reconciliation on Update, and the writing in schema order, sources first and questions last. Numbers that move, brand, skills and experiences stay out, each for the reason the spec gives, and a site is a source and never a surface unless the company runs the model. The CLI test lists the folder and pins that an edited copy of it fails check.

Verified: node --test verify/cli.test.mjs reports fail 0, node verify/check.mjs and both conventions checks report clean.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

### Task 3: The profile skill asks for the person's consent

**Files:**

- Modify: `agents/claude/skills/companygraph-profile/SKILL.md` (insert a step after step 5, renumber 6 through 10 to 7 through 11)

**Interfaces:**

- Consumes: `companygraph-consent` from Task 1.

- [ ] **Step 1: Write the check that fails**

Run: `grep -c "companygraph-consent" agents/claude/skills/companygraph-profile/SKILL.md; grep -oE "^[0-9]+\. \*\*" agents/claude/skills/companygraph-profile/SKILL.md | tr -d '. *' | tr '\n' ' '`

Expected: `0`, then `1 2 3 4 5 6 7 8 9 10`.

- [ ] **Step 2: Insert the step and renumber**

Insert this paragraph between step 5 (**Reuse before creating.**) and the step that begins **Write the vocabularies first**, as step 6:

```markdown
6. **Terms and consent.** Run `companygraph-consent` for the source the profile will name, with the person as the subject and the documents as what is drawn from it. Where the person is the instance's owner modeling themselves, the answer is that no consent is needed, and the step is one line in the report. For any other person, a consent not given ends the run with nothing written, as a different person does in step 4.
```

Then renumber the steps that follow: **Write the vocabularies first** becomes 7, **Write the experiences** 8, **Write the profile** 9, **Update merges** 10, **Validate** 11. Change nothing else in the file.

- [ ] **Step 3: Run the check to verify it passes, and the family checks**

Run: `grep -c "companygraph-consent" agents/claude/skills/companygraph-profile/SKILL.md; grep -oE "^[0-9]+\. \*\*" agents/claude/skills/companygraph-profile/SKILL.md | tr -d '. *' | tr '\n' ' '; echo; export PATH=/opt/homebrew/bin:$PATH && node --test verify/cli.test.mjs 2>&1 | tail -3 && sh conventions/conventions-format check && sh conventions/conventions-check`

Expected: `1`, then `1 2 3 4 5 6 7 8 9 10 11`, `fail 0`, and both ✓ lines.

- [ ] **Step 4: Commit**

```bash
git add agents/claude/skills/companygraph-profile/SKILL.md
git commit -F - <<'EOF'
The profile skill asks for the person's consent before it writes

One step between reuse and writing: companygraph-consent runs for the source the profile will name, with the person as the subject and the documents as what is drawn. For the owner of a company of one it is one line in the report; for any other person a consent not given ends the run with nothing written, as a wrong person already does. The steps after it renumber and nothing else changes.

Verified: the file names the consent skill once and its steps run 1 through 11; node --test verify/cli.test.mjs reports fail 0 and both conventions checks report clean.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

### Task 4: The four naming places and the release's numbers

**Files:**

- Modify: `bin/companygraph.mjs:231` (the line `init` prints)
- Modify: `lib/instance-files.mjs:108` (the `AGENTS.md` paragraph)
- Modify: `README.md:107` (the `init` paragraph)
- Modify: `verify/cli.test.mjs` (the test "init writes the skills, hashed into the manifest like the core, and tells how to run the checks")
- Modify: `package.json:3` (`version`) and `.github/workflows/instance-check.yml:37` (`ref:`)

**Interfaces:**

- Consumes: the two skill names from Tasks 1 and 2.

- [ ] **Step 1: Extend the test so it fails**

In the test "init writes the skills, hashed into the manifest like the core, and tells how to run the checks", after the line `assert.match(said, /Python 3/);`, add:

```js
  assert.match(said, /-company and -consent/);
  const agents = fs.readFileSync(path.join(root, "AGENTS.md"), "utf8");
  assert.ok(agents.includes("`companygraph-company`"), "AGENTS.md names the company skill");
  assert.ok(agents.includes("`companygraph-consent`"), "AGENTS.md names the consent skill");
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `export PATH=/opt/homebrew/bin:$PATH && node --test verify/cli.test.mjs 2>&1 | grep -E "^not ok"`

Expected: `not ok` on that one test, at the `-company and -consent` match.

- [ ] **Step 3: Change the line `init` prints**

In `bin/companygraph.mjs`, replace the line at 231 with:

```js
  console.log(`  written for ${agent}, with the companygraph-validate, -export, -surface, -profile, -company and -consent skills; export and surface need Python 3`);
```

- [ ] **Step 4: Change the `AGENTS.md` paragraph**

In `lib/instance-files.mjs`, in the paragraph that names the skills, replace the sentence `` `companygraph-profile` builds a profile, or extends one, from a folder of the person's documents. `` with:

```text
`companygraph-profile` builds a profile, or extends one, from a folder of the person's documents, `companygraph-company` builds the instance from a company's web address, and `companygraph-consent`, which both of them call, records the terms and consents a source's content is used under.
```

The sentence that follows, "All of them are the tooling's and move with an upgrade, so an instance's own skills go beside them under another name.", stays.

- [ ] **Step 5: Change the README's `init` paragraph**

In `README.md`, in the paragraph beginning `` `init [<folder>]` writes a new instance ``, replace `` and `companygraph-profile`, which builds a profile, or extends one, from a folder of the person's documents. `` with:

```text
`companygraph-profile`, which builds a profile, or extends one, from a folder of the person's documents, `companygraph-company`, which builds the instance from a company's web address, and `companygraph-consent`, which both of them call to record the terms and consents a source's content is used under.
```

Read the sentence back whole: the list before it ends with `companygraph-surface`, which produces a surface the model records, and the new text continues that list, so the comma and `and` placement must read as one list of six.

- [ ] **Step 6: Move the package and the workflow ref together**

Run: `sed -i '' 's/"version": "0.48.0"/"version": "0.49.0"/' package.json && sed -i '' 's/ref: v0.48.0/ref: v0.49.0/' .github/workflows/instance-check.yml && grep -rn "0\.48\.0" --exclude-dir=node_modules --exclude-dir=.git . | grep -v "docs/superpowers"`

Expected: no line printed outside `docs/superpowers`; a hit elsewhere is a place that pins the release and must be read before deciding whether it moves.

- [ ] **Step 7: Run the tests to verify they pass, and every check**

Run: `export PATH=/opt/homebrew/bin:$PATH && npm run verify && for s in test:instance test:instance-checks test:instance-files test:plan test:rules test:cli test:untar test:fetch-core test:obsidian; do npm run -s $s 2>&1 | grep -E "^# (pass|fail)"; done && sh conventions/conventions-format check && sh conventions/conventions-check`

Expected: `verify` prints its ✓ lines; every suite prints `# fail 0`; both conventions checks print ✓.

- [ ] **Step 8: Commit**

```bash
git add bin/companygraph.mjs lib/instance-files.mjs README.md verify/cli.test.mjs package.json .github/workflows/instance-check.yml
git commit -F - <<'EOF'
Six skills, and the package reads 0.49.0

The four places that name the skills by name gain the two new ones: the line init prints, the AGENTS.md paragraph init writes, the README's init paragraph and the CLI test, which now also reads the printed line and the written AGENTS.md for both names. The package moves by a minor and the instance workflow's ref with it in the same commit, as the 0.46.1 guard requires. Core stays at 0.42.0.

Verified: npm run verify and every node --test suite report fail 0, and both conventions checks report clean.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

---

## Phase B — the first run (Rob at the keyboard)

### Task 5: A fresh instance for a company Rob names

**Files:**

- Modify, as the run finds reason to: `agents/claude/skills/companygraph-company/SKILL.md`, `agents/claude/skills/companygraph-consent/SKILL.md`

**Interfaces:**

- Consumes: the CLI on this branch, `node bin/companygraph.mjs`, whose `init` writes the six skills.

This task is not run by a subagent. Every step that matters asks the operator something, and the operator is Rob. The executor prepares the instance and hands over.

- [ ] **Step 1: Ask Rob for the company and the folder**

Ask which company, by web address, and where the instance folder goes. Whether it is kept, and where, is Rob's decision at the end of the run, not now.

- [ ] **Step 2: Write the instance from this branch**

Run, with `<folder>` and `<Name>` as Rob gave them: `export PATH=/opt/homebrew/bin:$PATH && node /Users/rob/git/companygraph/meta-model-company-from-public-sources/bin/companygraph.mjs init <folder> --name "<Name>" --agent claude && ls <folder>/.claude/skills`

Expected: the six skill folders, and the printed line naming `-company and -consent`.

- [ ] **Step 3: Rob runs the skill**

In a Claude session opened in `<folder>`, Rob invokes `companygraph-company` and answers its questions. The executor does not run it for him.

- [ ] **Step 4: Check what the run wrote against the shape**

Run in `<folder>`: `grep -h "consented on\|Published under" model/sources/*.md`

Expected: every line matches `Published under .*, read on [A-Z][a-z]+ [0-9]+, [0-9]{4}\.` and, where a consent was given, `[^,]+, [^,]+, consented on [A-Z][a-z]+ [0-9]+, [0-9]{4}, by [^,]+, to .*\.` A line in another shape is a defect in the consent skill's step 5, fixed in the skill before anything else.

- [ ] **Step 5: Carry what the run changed back into the skills**

Every step the run showed to be wrong, missing or in the wrong order is changed in the skill's text on this branch, in the profile skill's manner: the pull request body says which steps the run changed. Run the checks: `export PATH=/opt/homebrew/bin:$PATH && node --test verify/cli.test.mjs 2>&1 | tail -3 && sh conventions/conventions-format check && sh conventions/conventions-check`

Expected: `fail 0` and both ✓ lines.

- [ ] **Step 6: Commit**

```bash
git add agents/claude/skills/companygraph-company/SKILL.md agents/claude/skills/companygraph-consent/SKILL.md
git commit -F - <<'EOF'
The first run changes the skills

<One paragraph, written after the run: which company, which steps the run changed and why, in prose, no counts of what the run produced.>

Verified: node --test verify/cli.test.mjs reports fail 0 and both conventions checks report clean.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

---

## Phase C — the pull request, the release and the instances

### Task 6: The pull request

**Files:** none.

- [ ] **Step 1: Read the register**

Run: `export PATH=/opt/homebrew/bin:$PATH && gh pr list --repo companygraph/meta-model --state merged --limit 2 --json number,title,body -q '.[] | .title, .body, "----"'`

Expected: two prose bodies ending `Verified: …`; the PR body below matches their register.

- [ ] **Step 2: Push and open the PR**

Run from the worktree:

```bash
export PATH=/opt/homebrew/bin:$PATH && git push -u origin company-from-public-sources && gh pr create --repo companygraph/meta-model --title "A company is drawn from what it publishes, and the package reads 0.49.0" --body-file - <<'EOF'
Three company instances were built by hand in September from what each company says about itself, on its site and its repositories, and the reading was the same each time and never written down; nothing anywhere asked whether the content could be used or whether the people in it had agreed. `companygraph-company` is that reading as a procedure under `agents/claude/skills/`, beside `companygraph-profile`, so `init` writes it and `upgrade` moves it. It asks one question, the web address, reads the site's navigation pages, the GitHub organization and LinkedIn only as its public page loads, writes a ledger under `dist/research/` with the address behind every row, puts every row to the operator to keep or strike and then asks which further sources to read, and writes the identity, sources, domains, products, features, vision, values, questions and thin profiles the operator kept, in schema order. Numbers that move, brand, skills and experiences stay out, and a site is a source, never a surface, unless the company runs the model.

`companygraph-consent` is the step both skills call and a procedure of its own: it finds the terms a source publishes under, names the three uses a run makes of content, proposes whether a consent is needed from three defaults the operator overrides, takes the consent the operator states and infers none, and keeps it as one sentence on the source's description, in one shape so a later move to a table is mechanical. `companygraph-profile` gains the step between reuse and writing.

It ran first on a fresh instance for <company>, and that run changed it: <what the run changed>. The `init` message, the `AGENTS.md` that `init` writes, the README and the CLI test name the new skills; nothing else in the tooling changes. The design is `docs/superpowers/specs/2026-09-26-a-company-from-its-public-sources-design.md`.

Release notes to write at tagging: `init` and `upgrade` now write six skills; `companygraph-company` builds an instance from a company's web address, `companygraph-consent` records the terms and consents a source's content is used under, and `companygraph-profile` asks for the person's consent before it writes. The package and the workflow's ref read 0.49.0; core stays 0.42.0.

Verified: npm run verify and every node --test suite report fail 0, and both conventions checks report clean.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
```

Expected: a PR URL. Fill `<company>` and `<what the run changed>` from Task 5 before sending. Stop here: the merge is Rob's.

### Task 7: The release, on Rob's go

**Files:** none.

- [ ] **Step 1: After the merge, tag from `main`**

Run, only after Rob says merge and then release:

```bash
export PATH=/opt/homebrew/bin:$PATH && cd /Users/rob/git/companygraph/meta-model && git pull -q && grep -c '"version": "0.49.0"' package.json && grep -c "ref: v0.49.0" .github/workflows/instance-check.yml && git tag v0.49.0 && git push origin v0.49.0 && gh release create v0.49.0 --title "v0.49.0" --notes-file - <<'EOF'
init and upgrade now write six skills. companygraph-company builds an instance from a company's web address: one question, then the site, the GitHub organization and the public pages, a ledger and a round of keep-or-strike questions, and the entities the operator kept written in schema order. companygraph-consent records the terms and consents a source's content is used under, as one sentence on the source every fact names, and both the company and the profile skill call it; companygraph-profile asks for the person's consent before it writes. An instance takes the skills by upgrading, with nothing else to do. The package and the workflow's ref read 0.49.0; core stays 0.42.0.
EOF
```

Expected: both greps print `1` before the tag is made; the release URL.

- [ ] **Step 2: Delete the merged branch and its worktree, by name**

Run: `export PATH=/opt/homebrew/bin:$PATH && cd /Users/rob/git/companygraph/meta-model && git worktree remove ../meta-model-company-from-public-sources && git branch -d company-from-public-sources && git push origin --delete company-from-public-sources`

Expected: no error; `git worktree list` no longer shows the worktree.

### Task 8: The three instances upgrade

**Files:** in each instance, what `upgrade` moves: `meta/core/`, `.claude/skills/`, `.companygraph/manifest.json`, `.github/workflows/`.

For each of `robertblust/mental-model`, `companygraph/mental-model` and `guestgraph/mental-model`, local under `/Users/rob/git/<org>/mental-model`:

- [ ] **Step 1: Worktree**

Run: `export PATH=/opt/homebrew/bin:$PATH && cd /Users/rob/git/<org>/mental-model && git fetch -q origin && git worktree add -q -b tooling-0.49.0 ../mental-model-tooling-0.49.0 origin/main`

Expected: the worktree beside the clone.

- [ ] **Step 2: Upgrade and check**

Run: `export PATH=/opt/homebrew/bin:$PATH && cd /Users/rob/git/<org>/mental-model-tooling-0.49.0 && npx --yes github:companygraph/meta-model#v0.49.0 upgrade . && ls .claude/skills && git status --short | head -20`

Expected: six skill folders, `upgrade` ends with the checks passing, and the diff touches only the four places `upgrade` owns. The three instances' manifests were written after the skills existed, so `upgrade` gives them the two new folders as it moved the profile skill in 0.44.0.

- [ ] **Step 3: Commit and open the PR, then stop**

Run:

```bash
export PATH=/opt/homebrew/bin:$PATH && cd /Users/rob/git/<org>/mental-model-tooling-0.49.0 && git add -A && git commit -q -F - <<'EOF'
Tooling 0.49.0: the company and consent skills

The upgrade moves the skills, the manifest and the workflow's tag to v0.49.0 and adds companygraph-company and companygraph-consent beside the four skills the instance already held; companygraph-profile now asks for the person's consent before it writes. Core stays at 0.42.0, so no entity changes.

Verified: npx github:companygraph/meta-model#v0.49.0 check reports every rule passing.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
git push -u origin tooling-0.49.0 && gh pr create --title "Tooling 0.49.0: the company and consent skills" --body-file - <<'EOF'
The upgrade moves the skills, the manifest and the workflow's tag to v0.49.0 and adds `companygraph-company` and `companygraph-consent` beside the four skills the instance already held; `companygraph-profile` now asks for the person's consent before it writes. Core stays at 0.42.0, so no entity changes and the instance checks run unchanged against the new tag.

Verified: npx github:companygraph/meta-model#v0.49.0 check reports every rule passing.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
```

Expected: three PR URLs, one per instance. Each merge is Rob's, and after each merge the branch and worktree are deleted by name as in Task 7 step 2.
