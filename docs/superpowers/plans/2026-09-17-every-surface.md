# Every Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `surface` a required `production` enum and an optional `built-by`, release core 0.26.0, write the reference instance's three built surfaces and the missing Also at row, and take the release in blust.ch, mcp-blust-ch and companygraph.io.

**Architecture:** One schema file changes; the parser does not. The existing R8 check reads the new enum off its Description, and the required-field check makes the release breaking for any instance holding a surface. The condition tying `## Projection rules` and `built-by` to `production` is a writing rule, enforced by agents. Downstream, only blust.ch changes code: its `sameAs` stops listing the site's own origin once the profile's Also at carries it.

**Tech Stack:** Markdown, Node 22's built-in test runner, `npm run verify` and the three `npm run test:*` suites in `companygraph/meta-model`, the instance checker at the release tag, `npm run model`/`pages`/`og` in `robertblust.github.io`, `npm run snapshot` and `npm test` in `mcp-blust-ch`, `npm run build` in `companygraph.github.io`.

**Spec:** `docs/superpowers/specs/2026-09-17-every-surface-design.md`

## Global Constraints

- Core and the package are at 0.25.2 and **both go to 0.26.0**. The version lives in `core/manifest.json`, `package.json` and twice in `.github/workflows/instance-check.yml`. `shape` stays **2**. The next tag is the thirty-second.
- The field is **`production`**, values **`built`** and **`written`**, required. **`built-by`** is an optional string, present exactly when `production` is `built`. It is never `ref → source`.
- `## Projection rules` becomes **optional** in the Sections table; a writing rule makes it required when `written` and absent when `built`. `## What it shows` stays required for both.
- A surface is named for the page, never the host: `blust.ch website`, not `blust.ch`. No surface H1 may equal a `Where` cell of any `## Also at` table.
- Core and the example are company-generic. Nothing in `core/` or `example/` names Robert Blust, blust.ch, MCP or any real product. **The multi-person instance is never named** anywhere.
- Prose follows `conventions/WRITING.md`: American English, spaced em-dashes, sentence case, no serial comma. Run `sh conventions/conventions-check` before every commit.
- Commit messages: subject under seventy characters, no type prefix, no trailing period; one to three short paragraphs, cause before mechanism; one line beginning `Verified:` written from the commands actually run; then `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.
- Pull request descriptions are prose: no `##` headings, no bullets, no checkboxes; a `Verified:` sentence; ending `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- **Nothing is merged and nothing is tagged by an agent.** Each phase ends with a green pull request and stops. Never chain a branch delete after a merge.
- Phase 2 is blocked until Phase 1 is merged and tagged `v0.26.0`. Phases 3 and 4 are blocked until Phase 2 is merged. Phase 5 is blocked until Phase 1 is tagged and does not wait for Phase 2.
- On every parser re-pin, install the package **by name** (`npm install companygraph-meta-model@github:companygraph/meta-model#v0.26.0`) and compare `packages["node_modules/companygraph-meta-model"].resolved` with `gh api repos/companygraph/meta-model/git/refs/tags/v0.26.0 --jq .object.sha`. Never grep the lockfile for the tag string.

---

## Phase 1 — companygraph/meta-model

Repository: `/Users/rob/git/companygraph/meta-model`. Branch: `every-surface`, which carries the spec and this plan and is open as pull request #87. Base: `main` at 0d6a001.

### Task 1: The schema, and the example that exercises both values

**Files:**

- Modify: `core/surface-schema.md` (whole file below)
- Modify: `example/model/surfaces/partner-directory.md` (frontmatter)
- Create: `example/model/surfaces/beacon-systems-website.md`
- Modify: `example/model/README.md` (the `surfaces/` line of the tree)

**Interfaces:**

- Produces: `production` and `built-by` on `surface`, which Phase 2 writes against.

- [ ] **Step 1: Replace `core/surface-schema.md`**

```markdown
# Surface Schema

> Required structure for surface files.

## File Location

`model/surfaces/*.md`

A surface is a place the company publishes from the model. A place is published when anyone
can reach it without asking; a bundle handed to whoever requests it is not a surface. One file
per surface, so every place the model reaches is named in the model, and a reader who finds no
file for a place can take that as meaning the model does not reach it. Nothing owns a surface
and a surface owns nothing.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a record key, an entry id. Absent when the source has none, as a repository does not. |
| `production` | Yes | enum | `built` or `written`. `built` means a script writes the surface and holds its rules; `written` means a person or an agent writes it from this file. |
| `built-by` | No | string | The repository whose build writes the surface. Present exactly when `production` is `built`. |
| `url` | No | string | Where the surface is published. Absent where it has no address, as a document does not. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Surface]` | Yes | The canonical name. Everything references the surface by this exact string. |
| `> [Description]` | Yes | Single-line description of what this surface is and who reaches it |
| `## What it shows` | Yes | One line per unit the surface presents, naming the unit and what fills it |
| `## Projection rules` | No | How the model becomes this surface: what is carried, what is left out and why. Required for a `written` surface, absent for a `built` one. |
| `## Constraints` | No | What the published result must satisfy, each written so a reader can pass or fail it |

## Purpose

A surface is a place the company publishes from the model. For a written surface, this file is
what somebody needs in order to write it: which of the model's facts reach it, in what shape and
what the result has to satisfy. For a built surface, it is what somebody needs in order to know
the place exists, what it presents and which repository holds its rules. Either way it answers
"if I had to rebuild this from the model today, what would I have to know, and where would I
find it?" — for a person, and for an agent. It is not a record of what the surface currently
shows, which is R17's business and belongs in a validation report.

## Writing rules

- `production` says who holds the rules. A `written` surface carries `## Projection rules`,
  because nothing re-runs a person. A `built` surface carries none and names the repository in
  `built-by`, because the script is the projection and a second copy of a rule is what this
  model exists to end.
- A surface is named for the page, never for the place that carries it. The place is what a
  profile's or an identity's `## Also at` lists, and a surface named for it would turn that
  table's `Where` column from data into references.
- A line of `## What it shows` names a unit the surface itself has, in the words the surface
  uses for it, and then what fills it. A reader has to be able to find that unit by that name
  while looking at the surface. It names the unit as the place a rule lands, never what that
  unit currently holds — not a count, not a sample, not its present wording.
- A projection rule states what the surface does with the model, not what the model contains. A
  rule that could be read off an entity is a fact restated, and the entity is where it lives.
- Every omission from a written surface is a rule with a reason. Silence about something the
  model holds and the surface does not show cannot be told apart from drift, which is the one
  thing this type is for.
- A constraint is written as a check: something a reader looking at the published result can
  pass or fail. "Every unit that can appear alone pairs the name with a role or a domain" can
  be failed; "the tone is professional" cannot.
- Where the surface imposes a limit, the constraint names the number and where it was read. A
  limit quoted from memory is a claim like any other.
- The file never states what the surface currently shows. That is an observation, true on the
  day it was written and unfalsifiable here afterwards (R17).
```

- [ ] **Step 2: Watch the checker fail on the example**

```bash
cd /Users/rob/git/companygraph/meta-model
npm run verify; echo "exit: $?"
```

Expected: exit 1, with a failure naming `surfaces/partner-directory.md` and a missing `production`, listing `built` or `written`. If it passes, the required-field check is not reading the new row; stop and report.

- [ ] **Step 3: Tag the written surface**

In `example/model/surfaces/partner-directory.md` the frontmatter becomes:

```yaml
---
source: Local
production: written
url: https://directory.example.invalid/beacon-systems
---
```

- [ ] **Step 4: Write the built surface**

Create `example/model/surfaces/beacon-systems-website.md`:

```markdown
---
source: Local
production: built
built-by: https://git.beacon.example/website
url: https://beacon.example
---

# Beacon Systems website

> The company's own site, where a buyer who has heard the name lands first, rebuilt from the
> model on every change.

## What it shows

- **Home** — the identity's tagline and `## What it is`.
- **Principles** — the vision and the values.
- **Team** — the profiles, each with the roles it holds.
- **How we deliver** — the process and its phases, in order.
```

- [ ] **Step 5: The example's tree**

In `example/model/README.md` the surfaces line becomes:

```
surfaces/                        partner-directory.md, beacon-systems-website.md
```

- [ ] **Step 6: Run everything**

```bash
npm run verify; echo "exit: $?"
npm run test:instance; echo "exit: $?"
npm run test:instance-checks; echo "exit: $?"
npm run test:rules; echo "exit: $?"
sh conventions/conventions-check; echo "exit: $?"
```

Expected: all exit 0.

- [ ] **Step 7: Commit**

```bash
git add core/surface-schema.md example/model/surfaces example/model/README.md
git commit -m "$(cat <<'MSG'
A surface says whether a script or a person makes it

A surface a build wrote had no file, so a model's surfaces list was silent about every place a
build makes and a reader could not tell that silence from a forgotten entry. Every surface now
has a file, and `production` says who holds its rules: a written surface keeps its projection
rules here, a built one names the repository in `built-by` and keeps none.

The example shows both values: the partner directory is written, and the company website is
built and named for the page rather than the host.

Verified: <the commands from Step 6 and their results>.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

Replace the `Verified:` line with what Step 6 actually printed before committing.

### Task 2: Versions, README, push, update the pull request

**Files:**

- Modify: `core/manifest.json`, `package.json`, `.github/workflows/instance-check.yml`, `README.md`

**Interfaces:**

- Produces: the release number 0.26.0 that Phases 2 and 5 vendor and pin.

- [ ] **Step 1: Move the four version strings**

```bash
cd /Users/rob/git/companygraph/meta-model
sed -i '' 's/"version": "0\.25\.2"/"version": "0.26.0"/' core/manifest.json package.json
sed -i '' 's/v0\.25\.2/v0.26.0/g' .github/workflows/instance-check.yml
grep -rn "0\.25\.2\|0\.26\.0" core/manifest.json package.json .github/workflows/instance-check.yml
```

Expected: four lines, all 0.26.0; `shape` still 2.

- [ ] **Step 2: The README**

In `README.md`, the sentence at line 82 becomes `The current release is 0.26.0, the thirty-second tag, and at that release`. Confirm with `git tag | wc -l`, which prints 31. The type count and list do not change.

- [ ] **Step 3: Run everything**

```bash
npm run verify; echo "exit: $?"
npm run test:instance; echo "exit: $?"
npm run test:instance-checks; echo "exit: $?"
npm run test:rules; echo "exit: $?"
sh conventions/conventions-check; echo "exit: $?"
```

Expected: all exit 0.

- [ ] **Step 4: Commit, push, retitle the pull request, stop**

```bash
git add core/manifest.json package.json .github/workflows/instance-check.yml README.md
git commit -m "$(cat <<'MSG'
Core 0.26.0, where every surface says how it is made

`production` is required, so this release breaks every instance that holds a surface until the
one line is added. The parser is untouched: the new enum is a fact and `built-by` a string.

Verified: <the commands from Step 3 and their results>.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
git push
gh pr edit 87 --title "Every surface has a file and says how it is made" --body "$(cat <<'MSG'
A surface had a file only where no script writes it, so an instance's surfaces list named the places made by hand and nothing a build makes. The reference instance showed the cost: an agent reading it through its MCP server reported the list incomplete, because the reason sat in a folder README no tool returns.

This carries the design, its plan and the change. `surface` gains a required enum, `production`, `built` or `written`, and `built-by`, the repository whose build writes a built surface. `## Projection rules` becomes optional in the table and a writing rule ties it to `production`: a written surface keeps its rules in the file, a built one keeps them in the script. The definition widens to a place the company publishes from the model, and a new writing rule names a surface for the page rather than the host so it cannot collide with an Also at row. The existing R8 check reads the new enum; the condition between sections and `production` is left to agents, as the schema's other writing rules are. The example gains a built company website beside the written partner directory.

**What it costs downstream.** This is 0.26.0 and it breaks every instance holding a surface: a surface without `production` fails the required-field check. Release notes to write at tagging: what `production` and `built-by` mean, that `production: written` is the one line an existing surface needs, and the three places an instance moves its pin.

Verified: <the commands from Task 2 Step 3 and their results>.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
MSG
)"
gh pr checks 87 --watch; echo "exit: $?"
gh pr view 87 --json body --jq .body | head -5
```

Fill the `Verified:` sentence from what ran. Report the pull request and the check result. **Do not merge and do not tag.**

---

## Phase 2 — robertblust/mental-model

Repository: `/Users/rob/git/robertblust/mental-model`. **Blocked until `v0.26.0` exists on `companygraph/meta-model`.** Base: `main` at 2fd146f or later.

### Task 3: Re-vendor core at 0.26.0 and mark the LinkedIn profile written

**Files:**

- Modify: `meta/core/` (copied whole from the tag, never edited here)
- Modify: `.companygraph/manifest.json`, `.github/workflows/companygraph.yml`, `AGENTS.md` (line 27), `README.md` (line 14)
- Modify: `model/surfaces/linkedin-profile.md` (frontmatter)

**Interfaces:**

- Produces: the instance green at 0.26.0, which Task 4 adds surfaces to.

- [ ] **Step 1: Confirm the release, branch, copy core**

```bash
cd /Users/rob/git/robertblust/mental-model
git checkout main && git pull
gh release view v0.26.0 --repo companygraph/meta-model --json tagName | cat; echo "exit: $?"
git checkout -b every-surface
rm -rf /tmp/cg-0260
git clone --depth 1 --branch v0.26.0 https://github.com/companygraph/meta-model /tmp/cg-0260
rm -rf meta/core && cp -R /tmp/cg-0260/core meta/core
git status --short meta/core
```

Expected: the release exists (else stop, blocked); `surface-schema.md` and `manifest.json` modified.

- [ ] **Step 2: Rewrite the instance manifest and move the pins**

```bash
node -e '
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const m = JSON.parse(fs.readFileSync(".companygraph/manifest.json", "utf8"));
m.tooling = "0.26.0";
m.core = { version: "0.26.0", shape: 2, source: "fetched:v0.26.0" };
const files = {};
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)
  .forEach((e) => { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : (files[p] = "sha256:" + crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex")); });
walk("meta/core");
m.files = Object.fromEntries(Object.keys(files).sort().map((k) => [k, files[k]]));
fs.writeFileSync(".companygraph/manifest.json", JSON.stringify(m, null, 2) + "\n");
console.log(Object.keys(m.files).length, "files hashed");'
sed -i '' 's|meta-model/.github/workflows/instance-check.yml@v0\.25\.2|meta-model/.github/workflows/instance-check.yml@v0.26.0|' .github/workflows/companygraph.yml
sed -i '' 's/core 0\.25\.2/core 0.26.0/' AGENTS.md
sed -i '' 's/core 0\.25\.0/core 0.26.0/' README.md
grep -rn "@v" .github/workflows/; grep -n "core 0.26.0" AGENTS.md README.md
git diff --stat .companygraph/manifest.json
```

Expected: the instance pin at v0.26.0, the conventions pin untouched, both prose lines at 0.26.0; the manifest diff touches only `tooling`, `core` and the two changed hashes.

- [ ] **Step 3: Watch the checker fail on the one missing line**

```bash
node /tmp/cg-0260/bin/check-instance.mjs .; echo "exit: $?"
```

Expected: exactly one failure, on `model/surfaces/linkedin-profile.md`, a missing `production`; exit 1.

- [ ] **Step 4: Add the line**

In `model/surfaces/linkedin-profile.md` the frontmatter becomes:

```yaml
---
source: Local
production: written
url: https://www.linkedin.com/in/robertblust/
---
```

- [ ] **Step 5: Checker and prose check pass, commit**

```bash
node /tmp/cg-0260/bin/check-instance.mjs .; echo "exit: $?"
sh conventions/conventions-check; echo "exit: $?"
git add meta/core .companygraph/manifest.json .github/workflows/companygraph.yml AGENTS.md README.md model/surfaces/linkedin-profile.md
git commit -m "$(cat <<'MSG'
Core 0.26.0, and the LinkedIn profile is written by hand

The release asks every surface how it is made. This instance's one surface is written from its
file, so one line. The README's core line was two releases behind and moves with the rest.

Verified: <the checker and prose check results>.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

`companygraph-validate` does not load for a subagent. Run its R0 pass by hand against `meta/core/CONVENTIONS.md` and say so in `Verified:`.

### Task 4: The three built surfaces and the missing Also at row

**Files:**

- Create: `model/surfaces/blust-ch-website.md`, `model/surfaces/mcp-blust-ch-mcp-server.md`, `model/surfaces/mcp-registry-listing.md`
- Modify: `model/surfaces/README.md` (first and last paragraphs)
- Modify: `model/profiles/robert-blust/robert-blust.md` (the `## Also at` table)

**Interfaces:**

- Consumes: `production` and `built-by` from core 0.26.0.
- Produces: the merge commit Phases 3 and 4 pin.

- [ ] **Step 1: The website**

Create `model/surfaces/blust-ch-website.md`:

```markdown
---
source: Local
production: built
built-by: https://github.com/robertblust/robertblust.github.io
url: https://blust.ch
---

# blust.ch website

> The owner's own site, in English and Swiss German, that a visitor, a search engine or an
> agent reaches at the owner's address, rebuilt from a pinned commit of the model.

## What it shows

- **Timeline** — the profile's experiences, drawn from `model.json`.
- **Model** — the model's entities and edges, drawn as a graph from `model.json`.
- **model.json** — the parsed model at the pinned commit, published as a dataset.
- **Principles** — the vision and the values.
- **Team** — the roles, the profiles that hold them and the process they run.
- **Structured data** — the person, the dataset and the site that every page describes to a
  crawler, with the person's addresses from the profile's `## Also at`.
```

Before writing it, confirm each unit against `robertblust.github.io`: the nav labels in `index.html`, the renderers in `build/pages.mjs` (`writePrinciples`, `writeTeam`, `writeJsonLd`) and the `model.json` preload on `/model/` and `/timeline/`. Correct a line that does not hold rather than keeping it.

- [ ] **Step 2: The MCP server**

Create `model/surfaces/mcp-blust-ch-mcp-server.md`:

```markdown
---
source: Local
production: built
built-by: https://github.com/robertblust/mcp-blust-ch
url: https://mcp.blust.ch/mcp
---

# mcp.blust.ch MCP server

> The server an agent connects to for answers about the owner's work, reading a pinned commit of
> the model and adding nothing to it.

## What it shows

- **Title** — the identity's name.
- **Instructions** — the vision's tagline and the identity's tagline, then the commit and core
  release the answers are read from.
- **Tools** — listing the types, describing a schema, listing and returning entities, finding
  evidence, searching and fetching, over every entity in the model.
```

Confirm against `instructionsFor` and `registerTools` in `companygraph/mcp-server` at the release `mcp-blust-ch/package.json` pins.

- [ ] **Step 3: The registry listing**

Confirm the address answers first:

```bash
curl -s "https://registry.modelcontextprotocol.io/v0/servers?search=ch.blust/mental-model" | head -c 200; echo
```

Expected: JSON naming `ch.blust/mental-model`. If it does not, omit `url`. Create `model/surfaces/mcp-registry-listing.md`:

```markdown
---
source: Local
production: built
built-by: https://github.com/robertblust/mcp-blust-ch
url: https://registry.modelcontextprotocol.io/v0/servers?search=ch.blust/mental-model
---

# MCP Registry listing

> The entry an agent client finds when it searches the public MCP Registry, pointing it at the
> MCP server.

## What it shows

- **Title** — the identity's name.
- **Description** — the identity's name and the vision's name, joined by a colon.
- **Remote** — the MCP server's address.
```

- [ ] **Step 4: The folder README**

In `model/surfaces/README.md`, the first paragraph becomes:

```markdown
One file per surface, written against `meta/core/surface-schema.md` and its writing rules. Every
place the model is published has a file, and `production` says who holds its rules. A written
surface keeps them here, because nothing re-runs a person. A built surface names the repository
whose build writes it and keeps none, because a second copy of a script's rules is a copy
nothing runs. The skill bundle and the Gemini Notebook export are handed out on request, which is
not publishing, so neither has a file.
```

and the last paragraph's opening words `A file holds the rules` become `A written surface's file holds the rules`.

- [ ] **Step 5: The Also at row**

In `model/profiles/robert-blust/robert-blust.md`, the table becomes:

```markdown
| Where | URL |
| --- | --- |
| blust.ch | https://blust.ch |
| GitHub | https://github.com/robertblust |
| LinkedIn | https://www.linkedin.com/in/robertblust/ |
| Substack | https://substack.com/@robertblust |
```

`blust.ch` is also the H1 of the experience `2026-blust-ch.md`. Run Step 6 and read whether the checker reports the table as references (R4). If it does, rename the `Where` cell to `Website` and re-run; record which form passed in the commit body.

- [ ] **Step 6: Validate, export, commit, push, open the pull request, stop**

```bash
node /tmp/cg-0260/bin/check-instance.mjs .; echo "exit: $?"
sh conventions/conventions-check; echo "exit: $?"
python3 .claude/skills/companygraph-export/build.py; echo "exit: $?"
python3 .claude/skills/companygraph-export/verify.py; echo "exit: $?"
```

Expected: all exit 0; run the R0 pass by hand as in Task 3. Then:

```bash
git add model/surfaces model/profiles/robert-blust/robert-blust.md
git commit -m "$(cat <<'MSG'
Every place the model is published has a surface file

An agent reading this model through its MCP server reported the website missing, twice over:
no surface named it and the profile's Also at did not list it. The site, the MCP server and its
registry listing are all built from the model, and each now has a file naming the repository
that builds it and the units it shows. The profile lists the site beside the other places the
person maintains.

Verified: <the checker, prose check, export and R0 results>.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
git push -u origin every-surface
gh pr create --title "Every place the model is published has a surface file" --body "$(cat <<'MSG'
Core 0.26.0 gives every surface a `production`. This takes the release in its three places and marks the LinkedIn profile written, then adds the three surfaces a build writes: the blust.ch website, the mcp.blust.ch MCP server and its MCP Registry listing. Each names its repository in `built-by` and lists what it shows, and none carries projection rules, which stay in the build. The folder README now says why the skill bundle and the Gemini Notebook export have no file: they are handed out on request, not published.

The profile's Also at gains blust.ch, the other half of what an agent reported missing. blust.ch writes its `sameAs` from that table, and its re-pin drops the site's own origin.

Sibling: companygraph/meta-model #87, merged and tagged v0.26.0 before this.

Verified: <the same results as the commit>.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
MSG
)"
gh pr checks --watch; echo "exit: $?"
```

Report the pull request number and the check result. **Do not merge.**

---

## Phase 3 — robertblust.github.io

Repository: `/Users/rob/git/robertblust/robertblust.github.io`. **Blocked until Phase 2 is merged.** The main checkout is on the owner's `indexnow` branch with an untracked file: **do not switch it.** Work in a worktree.

### Task 5: The site stops listing itself in sameAs, and takes the model and the parser

**Files:**

- Modify: `build/jsonld.mjs` (`alsoAt`), `build/renderers.test.mjs`
- Modify: `source.json`, `package.json`, `package-lock.json`, `model.json`, and every page or og stamp the checks regenerate

**Interfaces:**

- Consumes: Phase 2's merge commit on `robertblust/mental-model` `main`; the tag `v0.26.0`.

- [ ] **Step 1: Worktree**

```bash
cd /Users/rob/git/robertblust/robertblust.github.io
git fetch origin
git worktree add ../robertblust.github.io-every-surface -b every-surface origin/main
cd ../robertblust.github.io-every-surface
npm ci
```

- [ ] **Step 2: Write the failing test**

In `build/renderers.test.mjs`, after the test `alsoAt takes the URL column of the root profile's Also at table`, add:

```js
test("alsoAt leaves out the site's own origin, which the Person node already states as url", () => {
  const own = { ...PROFILE_FIXTURE, entities: [PROFILE_FIXTURE.entities[0],
    { ...PROFILE_FIXTURE.entities[1], sections: [{ heading: "Also at", tables: [
      { columns: ["Where", "URL"], rows: [["Site", "https://blust.ch"], ["Site again", "https://blust.ch/"],
        ["GitHub", "https://example.com/a"]] }] }] }] };
  assert.deepEqual(alsoAt(own), ["https://example.com/a"]);
});
```

```bash
npm run test:build; echo "exit: $?"
```

Expected: exit 1, the new test failing with both blust.ch addresses in the actual value.

- [ ] **Step 3: Implement**

In `build/jsonld.mjs`, append two sentences to the comment above `alsoAt`:

```js
// The site's own address is left out: the Person node states it as `url`, and sameAs names the
// other places that are the same person, which the site itself is not.
```

and in `alsoAt`, the final filter becomes:

```js
    .filter(Boolean)
    .filter((u) => u.replace(/\/+$/, "") !== SITE);
```

```bash
npm run test:build; echo "exit: $?"
```

Expected: exit 0. The empty-table test still passes because a table holding only the site's own row would throw on the length check, which is the right outcome.

- [ ] **Step 4: Move both pins**

```bash
gh api repos/robertblust/mental-model/commits/main --jq .sha
```

Confirm it is Phase 2's merge commit. Then:

```bash
node -e '
const fs = require("fs");
const s = JSON.parse(fs.readFileSync("source.json", "utf8"));
s.commit = process.argv[1];
fs.writeFileSync("source.json", JSON.stringify(s) + "\n");
console.log(s);' <THE_SHA>
npm install companygraph-meta-model@github:companygraph/meta-model#v0.26.0
git diff package.json
node -e 'const l=require("./package-lock.json").packages["node_modules/companygraph-meta-model"]; console.log(l.version, l.resolved)'
gh api repos/companygraph/meta-model/git/refs/tags/v0.26.0 --jq .object.sha
```

Expected: `version` 0.26.0 and `resolved` ending in the tag's sha; `package.json` names `#v0.26.0` and nothing else in it moved (else `git checkout origin/main -- package.json` and edit the one line).

- [ ] **Step 5: Regenerate and read the diff**

```bash
npm run model; echo "exit: $?"
npm run pages; echo "exit: $?"
npm run og; echo "exit: $?"
git diff --stat
```

Expected: `model.json` gains three surface entities and their edges, the LinkedIn surface gains `production`; every page's JSON-LD moves only by its commit and, where it carries `sameAs`, not by a blust.ch entry. Read the diff.

- [ ] **Step 6: Run the site's checks**

```bash
npm run model:check; echo "exit: $?"
npm run pages:check; echo "exit: $?"
npm run og:check; echo "exit: $?"
npm run verify; echo "exit: $?"
npm run test:build; echo "exit: $?"
npm run test:og; echo "exit: $?"
npm run pin:check; echo "exit: $?"
sh conventions/conventions-check; echo "exit: $?"
```

Expected: all exit 0. Read `og:check` in full.

- [ ] **Step 7: Commit, push, open the pull request, stop**

```bash
git add -A
git status --short
git commit -m "$(cat <<'MSG'
The site takes every surface, and sameAs stops naming the site

The model now lists blust.ch in the profile's Also at, and sameAs is written from that table, so
every page would have claimed the site is the same person as itself. alsoAt leaves out the
site's own origin, which the Person node already gives as its url. Both pins move: the model to
the commit that added the surfaces and the parser to 0.26.0.

Verified: <the checks from Step 6 and the lockfile comparison>.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
git push -u origin every-surface
gh pr create --title "The site takes every surface, and sameAs stops naming the site" --body "$(cat <<'MSG'
The model gained three built surfaces and a blust.ch row in the profile's Also at. Because every page's `sameAs` is written from that table, the site would have named itself as another address of the person; `alsoAt` now leaves out the site's own origin, with a test, since the Person node already carries it as `url`. The instance pin moves to that merge and the parser pin to v0.26.0, and `model.json` gains the three surfaces.

Siblings: companygraph/meta-model #87 and the robertblust/mental-model surfaces pull request, both merged before this.

Verified: <the same results as the commit>.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
MSG
)"
gh pr checks --watch; echo "exit: $?"
```

Before `git add -A`, read `git status --short` and add nothing outside the files this task names and the regenerated pages and og stamps. Report the pull request and the check result. **Do not merge. Leave the worktree for the owner to remove after merge.**

---

## Phase 4 — robertblust/mcp-blust-ch

Repository: `/Users/rob/git/robertblust/mcp-blust-ch`. **Blocked until Phase 2 is merged.**

### Task 6: The server reads the commit that lists it

**Files:**

- Modify: `source.json`, `snapshot.json` (if committed)

- [ ] **Step 1: Branch and move the pin**

```bash
cd /Users/rob/git/robertblust/mcp-blust-ch
git checkout main && git pull
git checkout -b every-surface
gh api repos/robertblust/mental-model/commits/main --jq .sha
```

Confirm it is Phase 2's merge commit. Set `source.json`'s `commit` to it, keeping the file's existing spacing.

- [ ] **Step 2: Snapshot and test**

```bash
npm ci
npm run snapshot; echo "exit: $?"
npm test; echo "exit: $?"
git status --short
node -e 'const s=require("./snapshot.json"); console.log(s.commit, s.core.version, s.entities.filter(e=>e.type==="surface").map(e=>e.name))'
```

Expected: tests exit 0; the snapshot at the new commit, core 0.26.0, four surfaces. If `snapshot.json` is gitignored, only `source.json` changes.

- [ ] **Step 3: Commit, push, open the pull request, stop**

```bash
git add source.json
git ls-files --error-unmatch snapshot.json >/dev/null 2>&1 && git add snapshot.json
git commit -m "$(cat <<'MSG'
The server reads the model that lists it as a surface

The model now names this server, its registry listing and the website as built surfaces. The
pin moves to that commit; the server release does not change.

Verified: <npm run snapshot and npm test results>.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
git push -u origin every-surface
gh pr create --title "The server reads the model that lists it as a surface" --body "$(cat <<'MSG'
The model now names this server, its MCP Registry listing and the blust.ch website as built surfaces, and lists blust.ch in the profile's Also at. This moves the model pin to that commit so an agent asking about surfaces gets all four. The server release is unchanged, and so is the registry entry, whose title and description come from entities that did not move.

Sibling: the robertblust/mental-model surfaces pull request, merged before this.

Verified: <the same results as the commit>.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
MSG
)"
gh pr checks --watch; echo "exit: $?"
```

Report the pull request and the check result. **Do not merge.** Merging deploys; after the owner merges, `/healthz` reporting the new commit is the proof.

---

## Phase 5 — companygraph/companygraph.github.io

Repository: `/Users/rob/git/companygraph/companygraph.github.io`. **Blocked until Phase 1 is merged and tagged.** Does not wait for Phase 2.

### Task 7: companygraph.io takes the release

**Files:**

- Modify: `source.json`, `package.json`, `package-lock.json`, `example.json`, `model.json`, plus every page or og stamp the checks regenerate

- [ ] **Step 1: Branch and move both pins**

```bash
cd /Users/rob/git/companygraph/companygraph.github.io
git checkout main && git pull
git checkout -b every-surface
gh api repos/companygraph/meta-model/commits/main --jq .sha
```

Confirm it is Phase 1's merge commit and set `source.json`'s `commit` to it. Then:

```bash
npm install companygraph-meta-model@github:companygraph/meta-model#v0.26.0
git diff package.json
node -e 'const l=require("./package-lock.json").packages["node_modules/companygraph-meta-model"]; console.log(l.version, l.resolved)'
gh api repos/companygraph/meta-model/git/refs/tags/v0.26.0 --jq .object.sha
```

Expected: `version` 0.26.0 and `resolved` ending in the tag's sha.

- [ ] **Step 2: Rebuild and read the diff**

```bash
npm ci
npm run build; echo "exit: $?"
git diff --stat example.json model.json
```

Expected: `model.json` shows `surface` with `production` and `built-by`; `example.json` gains one entity, `Beacon Systems website`, and its `source` edge. Read the diff.

- [ ] **Step 3: Run the site's checks**

```bash
npm run build:check; echo "exit: $?"
npm run pages:check; echo "exit: $?"
npm run og:check; echo "exit: $?"
npm run verify; echo "exit: $?"
npm run test:d3; echo "exit: $?"
npm run test:og; echo "exit: $?"
npm run pin:check; echo "exit: $?"
sh conventions/conventions-check; echo "exit: $?"
```

Expected: all exit 0; regenerate pages or og cards as `AGENTS.md` prescribes if a check fails only on the moved sha.

- [ ] **Step 4: Commit, push, open the pull request, stop**

```bash
git add source.json package.json package-lock.json example.json model.json
git status --short
git commit -m "$(cat <<'MSG'
The site draws surfaces that say how they are made

Core 0.26.0 gave surface a required production and a built-by. Both pins move to the release;
the model page shows the two fields and the example gains a built company website.

Verified: <the checks from Step 3 and the lockfile comparison>.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
git push -u origin every-surface
gh pr create --title "The site draws surfaces that say how they are made" --body "$(cat <<'MSG'
Core 0.26.0 gave `surface` a required `production`, `built` or `written`, and `built-by`. Both pins move to the release. `/model/` shows the two fields and `/example/` gains a built company website beside the written partner directory.

Sibling: companygraph/meta-model #87, merged and tagged before this.

Verified: <the same results as the commit>.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
MSG
)"
gh pr checks --watch; echo "exit: $?"
```

Add any regenerated page or og stamp to the `git add` line. Report the pull request and the check result. **Do not merge.**

**Not in this plan.** blust.ch's Home, Ideas and Talks pages are written by hand rather than derived from the model, so the website's surface file does not list them; whether a hand-written page on a built site is a unit of the surface is a question for the owner. The ideas page's hand-typed entity count is stale independently of this change.
