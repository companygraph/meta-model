# American English in the vocabulary — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `organisation` `organization`, put the spelling rule where the vocabulary keeps
its rules, and close the validator gap that would let an instance keep the old spelling
silently.

**Architecture:** Two new rules in `core/CONVENTIONS.md` — R14 (American English) and R15 (a
page's frontmatter fields are the ones its schema declares) — one renamed field, and one new
check citing R15. Core releases as 0.13.0; the mental-model re-vendors and renames; both sites
regenerate their data blocks. No rendering code changes anywhere: `@robertblust/design` has
zero occurrences of the field name.

**Tech Stack:** Markdown schemas, Node 22 (`verify/check.mjs`, no dependencies), `gh` CLI.

**Spec:** [`docs/superpowers/specs/2026-09-03-american-english-vocabulary-design.md`](../specs/2026-09-03-american-english-vocabulary-design.md)

## Global Constraints

- **Repositories, in order.** `companygraph/meta-model` → `robertblust/mental-model` →
  `robertblust.github.io` and `companygraph.github.io`. Each waits on the previous one's
  release or merge; the order is forced by what each reads.
- **Open the PR and stop.** Merging needs an explicit go from Robert. No task in this plan
  merges, tags or releases.
- **Author is `robert.blust@flatland.ch`.** Check `git config user.email` before the first
  commit in any repository.
- **Stage files by name.** Never `git add -A`.
- **Merge commits, never squash** — when the go comes, `gh pr merge --merge`.
- **One version line in the meta-model.** `package.json`, `core/manifest.json` and the git tag
  all read `0.13.0`; `verify` fails a tag that disagrees with the manifest.
- **American English in everything this plan writes**, including commit messages and the plan's
  own prose. It is the rule being added.
- **Historical records are not rewritten.** Nothing under any repository's
  `docs/superpowers/` changes spelling, except the two files this plan creates.
- **Prove every new check red before believing it.** A check that cannot fail is worse than no
  check; this repository has shipped three of them.

---

## Task 1: R14 and R15 in CONVENTIONS.md

**Files:**
- Modify: `core/CONVENTIONS.md`

**Interfaces:**
- Produces: rule ids `R14` and `R15`, which Task 2's check cites. `verify/check.mjs` fails a
  check whose `rule` names a rule `CONVENTIONS.md` does not define, so the rules land first.

- [ ] **Step 1: Add R14 at the end of the `## Structure` section**

Insert after R13 (the last rule under `## Structure`, before `## Schemas`):

```markdown
### R14 — Names and prose are American English

Every name this vocabulary chooses is spelled in American English — a field, a type, a folder,
a section heading a schema declares — and so is the prose of `core/` and of an instance's
content. `organization`, `modeling`, `license`, `recognize`.

Excepted: proper nouns, quoted matter, and any name fixed by something outside this
vocabulary — a product, a standard, a legal entity, a `LICENSE` file whose name is what the
ecosystem reads. The rule governs what this vocabulary calls things, not what the world has
already named.

*A name is not prose* is the argument for leaving one British spelling in place, and it loses:
a reader meets both in the same file, and a vocabulary that spells its fields one way and its
sentences another has no rule at all, only a habit with an exception.
```

- [ ] **Step 2: Add R15 at the end of the `## Schemas` section**

Insert after R12 (the last rule under `## Schemas`, before `## Working`):

```markdown
### R15 — A page's frontmatter fields are the ones its schema declares

A frontmatter field its schema does not declare is an error. This binds a page whose folder
matches a type's stated File Location; a file matching none has no schema, so nothing declares
what its frontmatter may hold and nothing reads it.

What the rule costs is the local field: an instance cannot carry one of its own. What it buys
is that a rename cannot half-happen. An undeclared field resolves no reference and satisfies no
requirement — but it still renders, which is how a field left behind by a rename survives on
the page under the old name while every other check reports green.
```

- [ ] **Step 3: Fix the two British spellings in this file**

`core/CONVENTIONS.md` line 34 reads `recognises` and line 284 reads `modelling`. Both are this
vocabulary's own prose and both are now R14 violations:

Both are whole words with no boundary ambiguity, so `sed` is safe here — but note that BSD
`sed` does not understand `\b`, which is why every word-boundary rename below uses `perl`.

```bash
sed -i '' 's/recognises/recognizes/; s/modelling/modeling/' core/CONVENTIONS.md
grep -nowE "recognises|modelling" core/CONVENTIONS.md   # expect: no output
```

- [ ] **Step 4: Verify**

Run: `npm run verify`
Expected: pass. No check cites R14 or R15 yet, and the meta-check only fails a check naming a
rule that does not exist — not a rule without a check.

- [ ] **Step 5: Commit**

```bash
git add core/CONVENTIONS.md
git commit -m "R14 and R15: American English, and fields a schema declares"
```

---

## Task 2: The R15 check

**Files:**
- Modify: `verify/check.mjs`

**Interfaces:**
- Consumes: `R15` from Task 1; the existing `TYPES`, `fieldsOf(type)`, `typeOfFile(rel)`,
  `walkMd(rel, visit)`, `frontmatterOf(text)`, `EX` and `fail(message)`.
- Produces: a check named `frontmatter fields are declared`, which Task 3 relies on to prove
  the example instance's rename is complete.

- [ ] **Step 1: Write the check**

Insert immediately after the `list fields are block sequences` check (the object whose
`rule` is `"R11"`), as a new element of `CHECKS`:

```js
  {
    // R15. The failure this exists for is not an exotic one: a field left behind by a rename
    // renders on the page under the old name while every other check reports green, because
    // an undeclared field resolves nothing and is therefore asked nothing.
    //
    // It walks all of EX rather than example/profiles alone — every typed page has
    // frontmatter, and example/values/, which no check read until now, is as typed as any
    // other folder.
    name: "frontmatter fields are declared",
    rule: "R15",
    run() {
      const declared = new Map(
        TYPES.map((t) => [t.type, new Set(fieldsOf(t.type).map(({ field }) => field))]),
      );
      walkMd(EX, (child, text) => {
        // A file matching no File Location has no schema, so R15 does not bind it.
        const type = typeOfFile(child);
        if (!type) return;
        const known = declared.get(type);
        for (const line of frontmatterOf(text).split("\n")) {
          // Anchored at column 0, so a nested key and a block sequence's `- entry` are not
          // fields — the same read lib/instance.mjs does.
          const m = line.match(/^([\w-]+):/);
          if (m && !known.has(m[1]))
            fail(`${child}: frontmatter field \`${m[1]}\` is not declared by the ${type} schema`);
        }
      });
    },
  },
```

- [ ] **Step 2: Run it — it must pass on the tree as it stands**

Run: `npm run verify`
Expected: pass. Every field in `example/` is declared today; a failure here means the check is
reading something wrong, not that the example is wrong.

- [ ] **Step 3: Prove it can fail**

This is not optional. Add an undeclared field to one example page:

```bash
sed -i '' 's/^organisation: /organisation-typo: /' \
  example/model/profiles/mira-halvorsen/experiences/2018-northwind-atelier.md
npm run verify
```

Expected: FAIL, naming that file and `organisation-typo`, and nothing else. If it passes, or
fails for a different reason, the check is wrong — fix it before restoring.

```bash
git checkout -- example/model/profiles/mira-halvorsen/experiences/2018-northwind-atelier.md
npm run verify   # back to pass
```

- [ ] **Step 4: Correct the file-header comment**

The comment at the top of `verify/check.mjs` states what the script does not check. Two of its
clauses are now false. Replace this text:

```
// schema requires, an unknown frontmatter field passes, and no file under example/values/ is
// ever read.
```

with:

```
// schema requires. An unknown frontmatter field is an error as of R15, which is also the
// first check to read example/values/ — for its field names, and nothing else.
```

- [ ] **Step 5: Verify and commit**

```bash
npm run verify
git add verify/check.mjs
git commit -m "A frontmatter field no schema declares is an error"
```

---

## Task 3: `organisation` becomes `organization`

**Files:**
- Modify: `core/experience-schema.md` (6 occurrences, one of them the field declaration),
  `core/experience-kind-schema.md` (1), `core/profile-schema.md` (1),
  `core/proficiency-level-schema.md` (1), `core/CONVENTIONS.md` (2), `README.md` (1),
  `verify/check.mjs` (1, in a comment)
- Modify: `example/model/profiles/*/experiences/*.md` — 5 files carrying the frontmatter key
- Modify: `example/model/experience-kinds/{role,project,community,education}.md` — 8
  occurrences in prose

**Interfaces:**
- Consumes: Task 2's check, which is what proves no example page kept the old key.

- [ ] **Step 1: Rename everywhere except the historical records**

```bash
grep -rIl --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=docs -w organisation . \
  | xargs perl -pi -e 's/\borganisation\b/organization/g'
```

- [ ] **Step 2: Confirm the scope of what moved**

```bash
grep -rIn --exclude-dir=.git -w organisation .    # expect: only docs/superpowers/ paths
grep -rIn --exclude-dir=.git -w organization core/experience-schema.md | head -1
```

Expected: every remaining hit is under `docs/superpowers/`, which §7 of the spec leaves alone.
The second command shows the field declaration now reading `organization`.

- [ ] **Step 3: Verify**

Run: `npm run verify`
Expected: pass. Task 2's check is what makes this meaningful — had the `sed` missed an example
page, `frontmatter fields are declared` would name it, because `organisation` is no longer a
field any schema declares.

- [ ] **Step 4: Commit**

```bash
git add core README.md verify/check.mjs example
git commit -m "organisation becomes organization"
```

---

## Task 4: Release 0.13.0

**Files:**
- Modify: `package.json`, `core/manifest.json`

- [ ] **Step 1: Bump both, to the same number**

`package.json`: `"version": "0.12.0"` → `"version": "0.13.0"`.
`core/manifest.json`: `{ "version": "0.12.0", "shape": 1 }` → `{ "version": "0.13.0", "shape": 1 }`.

`shape` does not move: the schema file format is unchanged.

- [ ] **Step 2: Verify**

Run: `npm run verify`
Expected: pass. `verify` compares a tag on HEAD against the manifest; there is no tag yet, which
it accepts.

- [ ] **Step 3: Commit, push, open the PR — and stop**

```bash
git add package.json core/manifest.json
git commit -m "Core 0.13.0"
git push -u origin american-english
gh pr create --title "American English in the vocabulary" --body "..."
```

The PR body says what the release is: two rules, one renamed field, one new check, and that
every instance on 0.13.0 must rename its `organisation` keys. **Do not merge and do not tag.**
Robert reviews. After his go, the controller merges with `gh pr merge --merge`, then tags
`v0.13.0` on `main` and publishes the release — `verify` on `main` then checks that the tag and
the manifest agree.

---

## Task 5: The mental-model re-vendors and renames

**Blocked on:** `v0.13.0` tagged in `companygraph/meta-model`.

**Files (repository: `robertblust/mental-model`, branch `american-english`):**
- Modify: `meta/core/*` — 12 files, replaced wholesale from the release
- Modify: `.companygraph/manifest.json` — the version, the source, and 12 sha256 values
- Modify: `model/profiles/robert-blust/experiences/*.md` — 23 files carrying `organisation:`
- Modify: `model/experience-kinds/*.md` — 5 files, in prose
- Modify: `AGENTS.md`, `README.md`, `model/skills/open-source-stewardship.md`,
  `model/proficiency-levels/competent.md`

**Interfaces:**
- Consumes: core 0.13.0's `experience-schema.md`, which declares `organization`.
- Produces: the commit both sites will pin.

This repository vendors 0.11.0, so 0.13.0 brings 0.12.0's changes with it. Read that release's
notes before assuming this task is only about spelling.

- [ ] **Step 1: Replace the vendored core**

```bash
cd /tmp && rm -rf mm-013 && git clone -q --depth 1 -b v0.13.0 \
  https://github.com/companygraph/meta-model.git mm-013
cd /Users/rob/git/robertblust/mental-model
rm -rf meta/core && cp -R /tmp/mm-013/core meta/core
```

- [ ] **Step 2: Rewrite the manifest**

`version` becomes `0.13.0` and `source` becomes `fetched:v0.13.0`. Recompute every hash — the
file list itself may have changed between 0.11.0 and 0.13.0, so rebuild the map rather than
editing values in place:

```bash
python3 - <<'PY'
import hashlib, json, pathlib
m = json.load(open(".companygraph/manifest.json"))
m["core"]["version"] = "0.13.0"
m["core"]["source"] = "fetched:v0.13.0"
m["files"] = {
    str(p): "sha256:" + hashlib.sha256(p.read_bytes()).hexdigest()
    for p in sorted(pathlib.Path("meta/core").rglob("*")) if p.is_file()
}
json.dump(m, open(".companygraph/manifest.json", "w"), indent=2)
open(".companygraph/manifest.json", "a").write("\n")
PY
```

- [ ] **Step 3: Rename the field and fix the prose**

```bash
grep -rIl --exclude-dir=.git --exclude-dir=meta --exclude-dir=docs -w organisation . \
  | xargs perl -pi -e 's/\borganisation\b/organization/g'
grep -rIl --exclude-dir=.git --exclude-dir=meta --exclude-dir=docs \
  -wE "licence|modelling|recognise" . | xargs sed -i '' \
  's/\blicence\b/license/g; s/\bmodelling\b/modeling/g; s/\brecognise\b/recognize/g'
grep -rIn --exclude-dir=.git --exclude-dir=meta --exclude-dir=docs \
  -wE "organisation|licence|modelling|recognise" .    # expect: no output
```

- [ ] **Step 4: Correct the `AGENTS.md` rule**

Its house-style bullet currently reads:

```
- American English — `organization`, `modeling`, `color`. Proper nouns and quotations stay as
  they are. (The schema fields are British — `organisation` — and are spelled as the schema
  spells them; a field name is not prose.)
```

The parenthetical is now false. Replace the whole bullet with:

```
- American English — `organization`, `modeling`, `color`. Proper nouns and quotations stay as
  they are. This is core's R14 as of 0.13.0, so it binds the schema's field names too; it used
  to say the opposite, and named `organisation` as the exception.
```

- [ ] **Step 5: Validate**

Run the `companygraph-validate` skill. It reports per rule and names what it did not check.
Expected: every reference resolves, every sha256 matches, and no page carries an undeclared
field. A commit with an unresolved reference is not made.

- [ ] **Step 6: Commit and open the PR — do not merge**

```bash
git add meta/core .companygraph/manifest.json model AGENTS.md README.md
git commit -m "Core 0.13.0: organisation becomes organization"
git push -u origin american-english
gh pr create --title "Core 0.13.0 — organisation becomes organization" --body "..."
```

The body states that 0.12.0 arrives in the same step, and lists what moved beyond spelling.

---

## Task 6: blust.ch regenerates

**Blocked on:** Task 5 merged, so there is a commit to pin.

**Files (repository: `robertblust.github.io`, branch `model-0-13-0`):**
- Modify: `package.json`, `package-lock.json` — the parser pin
- Modify: `source.json` — the mental-model commit
- Modify: `model/index.html` — regenerated, not edited
- Modify: `model/og.sha` if the card reports stale

- [ ] **Step 1: Re-pin both**

```bash
npm install "github:companygraph/meta-model#v0.13.0" --save-dev
python3 - <<'PY'
import json, subprocess
sha = subprocess.run(["git","ls-remote","https://github.com/robertblust/mental-model","main"],
                     capture_output=True, text=True).stdout.split()[0]
json.dump({"repo": "robertblust/mental-model", "commit": sha}, open("source.json","w"))
PY
cat source.json
```

- [ ] **Step 2: Regenerate and check**

```bash
npm run model
npm run model:check
grep -c organisation model/index.html   # expect: 0
```

- [ ] **Step 3: Run the suite**

```bash
npm run serve &
npm run verify
npm run og:check
```

Read `og:check`'s output whole — a stale line ends with its reason, not with `og.png`, so a
filter anchored on the filename shows only the cards that passed. If `model/og.png` reports
stale, run `npm run og` and commit `model/og.sha` with the rest.

- [ ] **Step 4: Commit and open the PR — do not merge**

```bash
git add package.json package-lock.json source.json model/index.html
git commit -m "Pin the model at core 0.13.0"
git push -u origin model-0-13-0
gh pr create --title "Pin the model at core 0.13.0" --body "..."
```

The body names the core version, says the page is regenerated rather than edited, and reports
`model:check`, `verify` and `og:check` — and, if `model/og.sha` moved while `model/og.png` did
not, says why: the recipe hashes every local file the page names, and the card's crop shows the
graph and no card body.

---

## Task 7: companygraph.io regenerates

**Blocked on:** Task 4 merged and `v0.13.0` tagged. Independent of Tasks 5 and 6 — this site
renders the meta-model, not the mental-model.

**Files (repository: `companygraph.github.io`, branch `core-0-13-0`):**
- Modify: `package.json`, `package-lock.json`, `source.json`
- Modify: `model/index.html`, `example/index.html` — regenerated
- Modify: `README.md`, `CLAUDE.md` — prose
- Modify: `example/og.sha`, `model/og.sha` if the cards report stale

- [ ] **Step 1: Re-pin**

```bash
npm install "github:companygraph/meta-model#v0.13.0" --save-dev
python3 - <<'PY'
import json, subprocess
sha = subprocess.run(["git","ls-remote","https://github.com/companygraph/meta-model","main"],
                     capture_output=True, text=True).stdout.split()[0]
json.dump({"repo": "companygraph/meta-model", "commit": sha}, open("source.json","w"))
PY
```

- [ ] **Step 2: Regenerate**

```bash
npm run example
npm run example:check
```

- [ ] **Step 3: Fix this repository's own prose**

`README.md` and `CLAUDE.md` describe the vocabulary and use the old spelling:

```bash
sed -i '' 's/\borganisation\b/organization/g' README.md CLAUDE.md
grep -rIn --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=docs \
  -w organisation .   # expect: only .github/dependabot.yml, if it is a comment — read it
```

- [ ] **Step 4: Run the suite**

```bash
npm run serve &
npm run verify
npm run og:check    # read the whole output, per Task 6 Step 3
```

- [ ] **Step 5: Commit and open the PR — do not merge**

```bash
git add package.json package-lock.json source.json model/index.html example/index.html \
  README.md CLAUDE.md
git commit -m "Pin core 0.13.0 — organisation becomes organization"
git push -u origin core-0-13-0
gh pr create --title "Pin core 0.13.0" --body "..."
```

The body names the core version, separates what regenerated from the two prose files edited by
hand, and reports `example:check`, `verify` and `og:check`.

---

## What this plan does not do

- **It does not merge, tag or release anything.** Four PRs end up open, in dependency order.
  Tasks 5 and 6 cannot start until the ones before them are merged and, for Task 5, tagged.
- **It does not touch `@robertblust/design`.** Zero occurrences; no rendering code names the
  field. If a task finds one, stop — the spec's claim that step 6 is a regeneration rather than
  an edit was wrong, and the plan needs revising, not working around.
- **It does not rewrite historical records.** Every `sed` in this plan excludes `docs/`.
- **It does not reach rob-cv or guestgraph.io.** Spec §7.
