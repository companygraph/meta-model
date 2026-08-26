# Reference Instance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut `meta-model` release `v0.1.0` and build `robertblust/mental-model`, the reference instance, by hand in the exact layout the tooling spec's `init` produces, with the whole CV described in the six core types.

**Architecture:** Two repositories. `meta-model` gains the release contract (`core/manifest.json`, a verify check, tag `v0.1.0`). The instance vendors `core/` at that tag into `meta/`, records it in `.companygraph/manifest.json` with sha256 per file, and holds Markdown entities only — no code, no build. Validation is the agent pass (`companygraph-validate`); every finding goes into the spec's §7.

**Tech Stack:** Markdown, YAML frontmatter, git, `gh`. Node (built-in `node:test` is *not* used — `verify/check.mjs` is an assertion script run directly). `shasum -a 256` for the manifest hashes. Zero dependencies anywhere.

**Spec:** `docs/superpowers/specs/2026-08-26-reference-instance-design.md` — read it first; §4 fixes the content rules, §7 is filled by this plan.

## Global Constraints

- Release version is `0.1.0`, shape is `1`; tag is `v0.1.0` (spec §2). Never `1.0.0`.
- Instance manifest: `"tooling": "0.0.0"`, `"core": { "version": "0.1.0", "shape": 1, "source": "fetched:v0.1.0" }`, `"schemas": "meta"`, `"packs": []` (spec §3).
- `meta/` is copied from the tag and never edited; every file in it is hashed into the manifest (spec §3).
- No code in the instance: no validator, no build, no sync, no `package.json` (spec §1). Throwaway checks run from the shell are fine; nothing of the kind is committed.
- Content is English only, drawn from `~/git/robertblust/rob-cv/content/` (the path is in `LOCAL.md`); nothing invented. Entities from the CV carry `source: rob-cv` and `source-id: <CV id>`; entities written here carry `source: Local` (spec §4).
- Every rule in `meta/CONVENTIONS.md` R1–R10 holds: one entity per file, H1 is the canonical name, references by H1 only, every ref resolves, owned type nests, folders are plural, enum values from the schema, no `:---` alignment colons in tables.
- Dates are `YYYY-MM`; a year-only CV date becomes `YYYY-01` and the coercion is a §7 finding (spec §4).
- House style: American English, no Oxford comma, one idea per bullet, active voice, claim only what the CV states (spec §5).
- Git: author must be `robert.blust@flatland.ch` — check `git config user.email` in every fresh clone. Merge PRs with `gh pr merge --merge`, never `--squash` (meta-model `CLAUDE.md`). Commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- The instance repository is created **public** under `robertblust/mental-model`.

---

## File map

**meta-model (modified):**
- `core/manifest.json` — new; the release contract
- `verify/check.mjs` — one new check, `CHECKS` entry "release manifest"; meta-check learns to skip a check with `rule: null`
- `LOCAL.md` — untracked; last line renamed
- `README.md` — roadmap item 2 ticked with a link (Task 9)
- `docs/superpowers/specs/2026-08-26-reference-instance-design.md` — §7 filled (Task 9)

**mental-model (created):**
- `.companygraph/manifest.json`
- `meta/` — `CONVENTIONS.md`, `LICENSE`, six `*-schema.md`
- `LICENSE`, `README.md`, `AGENTS.md`, `CLAUDE.md`, `.gitignore`
- `sources/README.md` + 2 entities; `proficiency-levels/README.md` + 4; `skills/README.md` + 22; `values/README.md` + 4
- `profiles/README.md`, `profiles/robert-blust/robert-blust.md`, `profiles/robert-blust/experiences/` + 20
- `.claude/skills/companygraph-validate/SKILL.md`, `companygraph-add-entity/SKILL.md`, `companygraph-export/SKILL.md`
- `export/SKILL-intro.md`

---

### Task 1: The release contract in meta-model

**Files:**
- Create: `core/manifest.json`
- Modify: `verify/check.mjs` — append one entry to `CHECKS` before the `"rules are written down"` entry (line ~600); modify that meta-check
- Modify: `LOCAL.md` (untracked)

**Interfaces:**
- Produces: tag `v0.1.0` on `main`, which Task 2 vendors from.

- [ ] **Step 1: Branch and confirm identity**

```bash
cd ~/git/companygraph/meta-model && git checkout main && git pull -q && git checkout -b release-manifest
git config user.email   # must print robert.blust@flatland.ch
```

- [ ] **Step 2: Write the check first, run it, watch it fail on the missing manifest**

Insert into `verify/check.mjs` immediately before the `{ name: "rules are written down", ...` entry:

```js
  {
    // The tooling spec's §2 release contract, not a CONVENTIONS.md rule: the one file another
    // program reads. `version` must be the tag when there is one, so a tag can never point at
    // a commit that claims a different version. No tag is fine — every commit between
    // releases has none.
    name: "release manifest",
    rule: null,
    run() {
      const raw = read("core/manifest.json");
      if (raw === null) return fail("core/manifest.json is missing");
      let m;
      try { m = JSON.parse(raw); } catch (e) { return fail(`core/manifest.json: ${e.message}`); }
      if (typeof m.version !== "string" || !/^\d+\.\d+\.\d+$/.test(m.version))
        fail(`core/manifest.json: version must be MAJOR.MINOR.PATCH, got ${JSON.stringify(m.version)}`);
      if (!Number.isInteger(m.shape) || m.shape < 1)
        fail(`core/manifest.json: shape must be a positive integer, got ${JSON.stringify(m.shape)}`);
      const tags = execFileSync("git", ["tag", "--points-at", "HEAD", "v*"], { cwd: ROOT, encoding: "utf8" })
        .split("\n").filter(Boolean);
      for (const tag of tags)
        if (tag !== `v${m.version}`)
          fail(`tag ${tag} sits on HEAD but core/manifest.json says ${m.version}`);
    },
  },
```

Add to the imports at the top of the file:

```js
import { execFileSync } from "node:child_process";
```

In the `"rules are written down"` check, change the loop to skip a check that cites no rule:

```js
      for (const check of CHECKS)
        if (check.rule !== null && !defined.has(check.rule))
          fail(`check "${check.name}" enforces ${check.rule}, which CONVENTIONS.md does not define`);
```

Run: `npm run verify`
Expected: `✗ 1 problem` — `core/manifest.json is missing`.

- [ ] **Step 3: Write the manifest, run again**

`core/manifest.json`:

```json
{ "version": "0.1.0", "shape": 1 }
```

Run: `npm run verify`
Expected: `✓ N checks passed` (N is one more than before).

- [ ] **Step 4: Prove the tag check both ways with a throwaway tag**

```bash
git tag v9.9.9 && npm run verify; git tag -d v9.9.9
```

Expected: the first run fails with `tag v9.9.9 sits on HEAD but core/manifest.json says 0.1.0`; the tag is deleted after.

```bash
git tag v0.1.0 && npm run verify; git tag -d v0.1.0
```

Expected: passes. Delete it — the real tag goes on the merge commit, not this one.

- [ ] **Step 5: Rename the instance in LOCAL.md**

In `LOCAL.md` (untracked, stays untracked) change the last line to:

```
The reference instance is `robertblust/mental-model`, local at `~/git/robertblust/mental-model`.
```

- [ ] **Step 6: Commit, PR, merge, tag**

```bash
git add core/manifest.json verify/check.mjs
git commit -m "$(cat <<'EOF'
Add the release manifest and the check that a tag agrees with it

core/manifest.json is the tooling spec's §2 contract: the one file
another program reads. 0.1.0, not 1.0.0 — usable, not settled. The
verify suite refuses a v* tag on HEAD that names a different version.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
git push -u origin release-manifest
gh pr create --title "Add the release manifest and the tag check" --body "Tooling spec §2, first half. Spec: docs/superpowers/specs/2026-08-26-reference-instance-design.md §2.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
gh pr merge --merge --delete-branch
git checkout main && git pull -q
npm run verify
git tag -a v0.1.0 -m "0.1.0 — the person cluster: profile, experience, skill, proficiency-level, value, source"
git push origin v0.1.0
git tag --points-at HEAD   # prints v0.1.0
```

---

### Task 2: The instance skeleton

**Files:**
- Create in `~/git/robertblust/mental-model/`: `.companygraph/manifest.json`, `meta/*`, `LICENSE`, `README.md`, `CLAUDE.md`, `.gitignore`, and `README.md` in `sources/`, `proficiency-levels/`, `skills/`, `values/`, `profiles/`

**Interfaces:**
- Produces: the tree every later task writes into; the manifest's `files` map, which must be regenerated only if Task 2 is redone (no later task touches `meta/`).

- [ ] **Step 1: Create the repository**

```bash
cd ~/git/robertblust
gh repo create robertblust/mental-model --public --description "Robert Blust, described in CompanyGraph — the reference instance" --clone
cd mental-model
git config user.email   # robert.blust@flatland.ch, from the includeIf on ~/git/robertblust/
```

- [ ] **Step 2: Vendor core at the tag, exactly**

```bash
mkdir -p meta .companygraph
rm -rf /tmp/cg-v010 && mkdir -p /tmp/cg-v010
git -C ~/git/companygraph/meta-model archive v0.1.0 core/ CONVENTIONS.md LICENSE | tar -x -C /tmp/cg-v010
cp /tmp/cg-v010/core/*-schema.md /tmp/cg-v010/CONVENTIONS.md /tmp/cg-v010/LICENSE meta/
cp /tmp/cg-v010/LICENSE LICENSE
ls meta   # CONVENTIONS.md LICENSE experience-schema.md proficiency-level-schema.md profile-schema.md skill-schema.md source-schema.md value-schema.md
```

`core/manifest.json` is deliberately not copied: the tooling spec's tarball is `core/`, `CONVENTIONS.md`, `LICENSE`, and the manifest is what the instance's own manifest records, not vendors.

- [ ] **Step 3: Write the manifest with real hashes**

```bash
{
  echo '{'
  echo '  "tooling": "0.0.0",'
  echo '  "core": { "version": "0.1.0", "shape": 1, "source": "fetched:v0.1.0" },'
  echo '  "schemas": "meta",'
  echo '  "packs": [],'
  echo '  "files": {'
  ls meta | sort | while read f; do printf '    "meta/%s": "sha256:%s",\n' "$f" "$(shasum -a 256 "meta/$f" | cut -d' ' -f1)"; done | sed '$ s/,$//'
  echo '  }'
  echo '}'
} > .companygraph/manifest.json
node -e 'JSON.parse(require("fs").readFileSync(".companygraph/manifest.json","utf8")); console.log("valid json")'
```

- [ ] **Step 4: Verify the vendored copy is byte-identical to the tag and the hashes are right**

```bash
for f in meta/*-schema.md; do diff -q "$f" "/tmp/cg-v010/core/$(basename $f)"; done
diff -q meta/CONVENTIONS.md /tmp/cg-v010/CONVENTIONS.md && diff -q meta/LICENSE /tmp/cg-v010/LICENSE
node -e '
const m=JSON.parse(require("fs").readFileSync(".companygraph/manifest.json","utf8"));
const {createHash}=require("crypto");
for (const [p,h] of Object.entries(m.files)) {
  const got="sha256:"+createHash("sha256").update(require("fs").readFileSync(p)).digest("hex");
  if (got!==h) { console.error("MISMATCH",p); process.exit(1); }
}
console.log(Object.keys(m.files).length+" files, all hashes match");'
```

Expected: no diff output; `8 files, all hashes match`.

- [ ] **Step 5: Root files and folder stubs**

`.gitignore`:

```
dist/
```

`CLAUDE.md`:

```
@AGENTS.md
```

`README.md`:

```markdown
# Robert Blust — mental model

> One person, described in [CompanyGraph](https://github.com/companygraph/meta-model): the
> reference instance of the meta-model, a company of one.

This repository is roadmap item 2 of the meta-model — a real company in the core vocabulary,
laid out by hand exactly as the [tooling](https://github.com/companygraph/meta-model/blob/main/docs/superpowers/specs/2026-08-25-companygraph-tooling-design.md)
will lay one out, before that tooling exists. Its design and what it taught are in the
meta-model's
[reference instance spec](https://github.com/companygraph/meta-model/blob/main/docs/superpowers/specs/2026-08-26-reference-instance-design.md).

```
.companygraph/manifest.json    which core this vendors, and a hash per vendored file
meta/                          core 0.1.0: CONVENTIONS.md, LICENSE, one schema per type — never edited here
sources/                       where each page's facts are mastered
proficiency-levels/            the four-rung ladder every skill claim uses
skills/                        one file per capability
values/                        one file per value
profiles/robert-blust/         the profile, and the experiences it owns
AGENTS.md                      the instance's own rules; every modelling rule is in meta/CONVENTIONS.md
.claude/skills/companygraph-*  the portable skills: validate, add an entity, export as a skill
```

The content is the whole professional portfolio, in English, drawn from the CV. Pages with
`source: rob-cv` are mastered in the CV repository and copied here; pages with
`source: Local` are written here. Nothing is invented.

Apache 2.0.
```

One `README.md` per type folder, each a single line pointing at its schema:

```bash
mkdir -p sources proficiency-levels skills values profiles
printf '# Sources\n\nOne file per source, written against `meta/source-schema.md`.\n' > sources/README.md
printf '# Proficiency levels\n\nOne file per rung, written against `meta/proficiency-level-schema.md`.\n' > proficiency-levels/README.md
printf '# Skills\n\nOne file per skill, written against `meta/skill-schema.md`.\n' > skills/README.md
printf '# Values\n\nOne file per value, written against `meta/value-schema.md`.\n' > values/README.md
printf '# Profiles\n\nOne folder per profile, written against `meta/profile-schema.md`; each owns its `experiences/`.\n' > profiles/README.md
```

- [ ] **Step 6: Check the tree against spec §3, commit**

```bash
find . -path ./.git -prune -o -type f -print | sort
```

Expected: exactly `.companygraph/manifest.json`, `.gitignore`, `CLAUDE.md`, `LICENSE`, `README.md`, the 8 files in `meta/`, and the 5 folder READMEs — 17 files. No `experiences/` at root (owned types get no root folder).

```bash
git add -A
git commit -m "$(cat <<'EOF'
Lay out the instance as the tooling's init would

Core 0.1.0 vendored into meta/ from the v0.1.0 tag, byte for byte, and
hashed into .companygraph/manifest.json. tooling is 0.0.0: no tooling
wrote this. One README stub per root type folder; no root folder for
the owned type.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
git push -u origin main
```

---

### Task 3: Sources and proficiency levels

**Files:**
- Create: `sources/local.md`, `sources/rob-cv.md`, `proficiency-levels/{familiar,competent,proficient,expert}.md`

**Interfaces:**
- Produces H1s every later task references: `Local`, `rob-cv`, `Familiar`, `Competent`, `Proficient`, `Expert`.

- [ ] **Step 1: The two sources**

`sources/local.md`:

```markdown
# Local

> Written and kept in this repository; nothing syncs it.
```

`sources/rob-cv.md` — the source schema's `url` is optional and the CV repository has no remote, so it is absent:

```markdown
# rob-cv

> The CV repository, local and without a remote: the master for the profile and every experience. `source-id` is the entry's `id` in its `content/` folder.
```

- [ ] **Step 2: The ladder, copied from the meta-model example**

```bash
cp ~/git/companygraph/meta-model/example/proficiency-levels/*.md proficiency-levels/
grep -l "source: Local" proficiency-levels/*.md | wc -l   # 4
grep -h "^rank:" proficiency-levels/*.md | sort   # rank: 10 / 20 / 30 / 40
```

Read each file once; the `## What it means` prose is kept as is — one ladder in two instances is the point (spec §4).

- [ ] **Step 3: Throwaway check — every source reference resolves**

```bash
for f in proficiency-levels/*.md; do s=$(grep -m1 '^source:' $f | sed 's/source: //'); grep -qx "# $s" sources/*.md || echo "UNRESOLVED $f -> $s"; done
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add sources proficiency-levels
git commit -m "$(cat <<'EOF'
Add the two sources and the four-rung ladder

Local for what is written here, rob-cv for what the CV masters. The
ladder is the meta-model example's, unchanged.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Skills

**Files:**
- Create: 22 files under `skills/`, named for the kebab-case of the H1.

**Interfaces:**
- Consumes: `Local` (Task 3).
- Produces: the 22 H1s below; the profile table (Task 6) and the experiences (Task 7) reference these strings exactly.

- [ ] **Step 1: Write the 22 skills**

Every file has this shape (the schema: `source` required, `group` optional, H1, `>` definition, `## In practice` optional — always written here, it is where products go):

```markdown
---
source: Local
group: <CV group name verbatim>
---

# <Skill>

> <one-line definition>

## In practice

<what doing it looks like; the products from skills.yaml named here, never as skills of their own>
```

The list — H1, `group`, definition, and the products for `## In practice`. Read `~/git/robertblust/rob-cv/content/skills.yaml` and the six role files under `content/experience/` before writing each body, so the practice paragraph states what the CV states:

| H1 | group | definition | products for `## In practice` |
| --- | --- | --- | --- |
| Scaling engineering organizations | Leadership & Strategy | Growing an engineering team and its practices without losing delivery. | 3AP to ~70 people; LIKE MAGIC engineering 5 to 25 |
| Technology strategy and governance | Leadership & Strategy | Setting the direction of a company's technology and the rules it is run under. | IT strategy, technology management |
| AI strategy and governance | Leadership & Strategy | Deciding how a company adopts AI, under what oversight and with which guardrails. | Human Oversight principle, data-privacy guardrails, cost governance |
| Stakeholder and vendor management | Leadership & Strategy | Keeping the people who fund, use and supply a platform aligned. | — |
| Agentic AI development | AI & Agentic Development | Building software with and for AI agents, from coding assistants to agent-consumable platforms. | Claude Code, Claude Cowork, OpenAI Codex, Gemini, GitHub Copilot, OpenRouter, Hermes, NotebookLM |
| Cloud platform engineering | Cloud & Platform Engineering | Running production workloads on a managed cloud, and owning their reliability. | Google Cloud (GKE, Pub/Sub), Azure, OpenShift, Kubernetes |
| Infrastructure as code and delivery automation | Cloud & Platform Engineering | Describing infrastructure in versioned code and shipping through automated pipelines. | Terraform, DevOps, GitOps, CI/CD, GitHub Actions |
| Enterprise architecture | Architecture | Describing an organization's systems, capabilities and their relations at the level decisions are made. | TOGAF, ArchiMate, reference architecture |
| Business architecture | Architecture | Modeling a business as concepts and capabilities before modeling its systems. | L0 concepts, L1 capabilities, capability-based modeling |
| Domain-driven design | Architecture | Cutting a system along the seams of the business it serves. | bounded contexts |
| Event-driven architecture | Architecture | Building systems that communicate through events rather than calls. | Kafka, Pub/Sub, RabbitMQ, CQRS |
| Process orchestration and automation | Architecture | Making a business process explicit and executable. | Camunda, n8n, BPMN 2.0, DMN |
| Enterprise integration | Architecture | Connecting systems that were never built to talk to each other. | ESB, SOA, MuleSoft, SOAP |
| Multi-tenant SaaS architecture | Architecture | Serving many customers from one platform without one seeing another. | — |
| API design | Architecture | Designing the contract a system offers, first, and as a product. | REST, GraphQL, OpenAPI, AsyncAPI, JSON Schema, XSD, MCP |
| Software modeling | Modeling & Notations | Expressing structure and behavior in a notation others can read and tools can check. | UML, SysML, OCL, C4 model, ArchiMate |
| Model-driven engineering | Model-Driven Engineering | Generating software from models that are the primary artifact. | MDA, MDSD, DSLs, MOF, Ecore, EMF, Xtext, Enterprise Architect, code generation |
| Java platform engineering | Languages, Frameworks & Platforms | Building server-side systems on the JVM. | Java, Spring Boot, WebFlux, JPA, Hibernate, Spring Kafka, Spring Cloud GCP, R2DBC, jOOQ |
| Web application development | Languages, Frameworks & Platforms | Building the browser-facing half of a product. | React, TypeScript, Node.js, MUI |
| Database design and operation | Data | Choosing, shaping and running the store a system depends on. | PostgreSQL, Oracle, MSSQL, MongoDB |
| Information security and compliance | Security & Compliance | Running a platform so that it can prove it is secure and lawful. | ISO 27001, GDPR / DSGVO, zero-trust API boundaries |
| Identity and access management | Security & Compliance | Deciding who a caller is and what it may do. | OAuth, OpenID Connect, Keycloak |
| Agile delivery | Agile & Delivery | Delivering in short cycles with the work visible. | Kanban, Scrum, SAFe |

That is 23 rows; "Stakeholder and vendor management" and "Multi-tenant SaaS architecture" have no product and get a practice paragraph from the roles instead. If a row cannot be evidenced by any experience in Task 7, delete the file then — the cut rule is in spec §4.

Filenames: `scaling-engineering-organizations.md`, `technology-strategy-and-governance.md`, … `agile-delivery.md`.

- [ ] **Step 2: Throwaway checks — shape and count**

```bash
ls skills/*.md | grep -v README | wc -l                       # 23
for f in skills/*.md; do [ "$f" = skills/README.md ] && continue
  grep -q '^source: Local$' $f || echo "no source: $f"
  grep -q '^group: ' $f || echo "no group: $f"
  grep -q '^# ' $f || echo "no H1: $f"
  grep -q '^> ' $f || echo "no definition: $f"
  h=$(grep -m1 '^# ' $f | sed 's/^# //'); k=$(echo "$h" | tr 'A-Z' 'a-z' | sed 's/[^a-z0-9]\{1,\}/-/g; s/^-//; s/-$//')
  [ "skills/$k.md" = "$f" ] || echo "filename != kebab(H1): $f vs $k"
done
```

Expected: `23` and no other output.

- [ ] **Step 3: Commit**

```bash
git add skills
git commit -m "$(cat <<'EOF'
Add the skills: one per capability, products under In practice

Twenty-three files where the CV lists seventy items; a product earns a
mention, never a file. group carries the CV's group name verbatim so
the schema's open question about groups has data.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Values

**Files:**
- Create: `values/decide-well-over-build-fast.md`, `values/production-is-the-finish-line.md`, `values/grow-the-people-with-the-platform.md`, `values/model-it-before-you-build-it.md`

**Interfaces:**
- Consumes: `Local`.

- [ ] **Step 1: Write the four values**

Shape per the schema — `source` required; H1; `>` statement required; `## In practice` required, in two halves (following it, breaking it). Each drawn from `content/profile.yaml`'s summary and achievements; put `<!-- drafted from the CV summary — review before merge -->` as the first line after the frontmatter of each, to be removed by the owner in the PR.

```markdown
---
source: Local
---

<!-- drafted from the CV summary — review before merge -->

# Decide well over build fast

> AI moved the constraint from building quickly to deciding correctly; the decision is the work.

## In practice

Following it looks like writing the decision down before the code, with the alternatives
that lost and why, so that the next person can disagree with a reason rather than a rewrite.

Breaking it looks like a feature that shipped in a day and is argued about for a quarter,
because nobody can say what it was for.
```

```markdown
---
source: Local
---

<!-- drafted from the CV summary — review before merge -->

# Production is the finish line

> A platform counts when it runs for customers under real security and compliance obligations, not when the demo works.

## In practice

Following it looks like owning reliability, incident management and the audit trail as part of
building the thing, and treating ISO 27001 and GDPR as design inputs rather than a form to fill
in after.

Breaking it looks like a launch date met by a system nobody is on call for.
```

```markdown
---
source: Local
---

<!-- drafted from the CV summary — review before merge -->

# Grow the people with the platform

> A platform that outgrows the team that runs it is a liability with good uptime.

## In practice

Following it looks like scaling the engineering organization on purpose — hiring, practices,
ownership — at the pace the platform scales, so that every part of the system has someone who
can be woken up for it and would know what to do.

Breaking it looks like five people who know everything and twenty who wait for them.
```

```markdown
---
source: Local
---

<!-- drafted from the CV summary — review before merge -->

# Model it before you build it

> A business described as concepts and capabilities is one that people and AI can both act inside of.

## In practice

Following it looks like a written model — domains, capabilities, processes, rules — that the
code, the org chart and the agents all refer back to, kept where the people who own the facts
can edit it.

Breaking it looks like the model living in three heads and a slide deck, and every system
encoding a slightly different version of it.
```

- [ ] **Step 2: Throwaway check — required sections present**

```bash
for f in values/*.md; do [ "$f" = values/README.md ] && continue
  grep -q '^## In practice' $f || echo "missing In practice: $f"
  grep -q '^> ' $f || echo "missing statement: $f"
  grep -q '^source: Local$' $f || echo "missing source: $f"; done
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add values
git commit -m "$(cat <<'EOF'
Draft four values from the CV summary, marked for review

The one place the instance carries prose the CV does not; the marker
comes out when the owner has read them.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: The profile

**Files:**
- Create: `profiles/robert-blust/robert-blust.md`

**Interfaces:**
- Consumes: every skill H1 (Task 4), every level H1 (Task 3), `rob-cv`.
- Produces: `Robert Blust`, the owner of Task 7's experiences.

- [ ] **Step 1: Write the profile**

Read `~/git/robertblust/rob-cv/content/profile.yaml` and all six `content/experience/*.md`. Then:

```markdown
---
source: rob-cv
email: robert.blust@flatland.ch
location: Wallisellen, Switzerland
---

# Robert Blust

> Technology executive, head of technology and business architect — 25 years of building digital platforms and the organizations that run them.

## Skills

| Skill | Level | Evidence |
| --- | --- | --- |
| Scaling engineering organizations | Expert | Grew LIKE MAGIC engineering from 5 to 25 and 3AP to about 70 people. |
| … one row per file in skills/, 23 rows … |

## Summary

<the `summary:` paragraph from profile.yaml, verbatim, as one or two paragraphs>
```

Rules for the table: `Skill` is the H1 string exactly; `Level` is one of `Familiar`, `Competent`, `Proficient`, `Expert`; `Evidence` is one concrete fact from a CV role or project — a number, a system, a named outcome. No row without evidence: a skill whose row you cannot fill from the CV is deleted from `skills/` (spec §4's second pass). Levels are the owner's to dispute; assign `Expert` only where the CV shows years of ownership (architecture, modeling, Java, leadership), `Proficient` for hands-on tooling named across several roles, `Competent` for named-once tools, and add a `<!-- levels drafted — review -->` comment above the table.

`profile.yaml` has no `id`, so no `source-id`.

- [ ] **Step 2: Throwaway check — every row resolves**

```bash
p=profiles/robert-blust/robert-blust.md
sed -n '/^## Skills/,/^## Summary/p' $p | grep '^| ' | tail -n +3 | while IFS='|' read -r _ s l e _; do
  s=$(echo "$s" | sed 's/^ *//;s/ *$//'); l=$(echo "$l" | sed 's/^ *//;s/ *$//')
  grep -qx "# $s" skills/*.md || echo "UNRESOLVED skill: $s"
  grep -qx "# $l" proficiency-levels/*.md || echo "UNRESOLVED level: $l"
  [ -n "$(echo "$e" | tr -d ' ')" ] || echo "EMPTY evidence: $s"; done
n=$(sed -n '/^## Skills/,/^## Summary/p' $p | grep -c '^| [A-Z]'); m=$(ls skills/*.md | grep -vc README); [ "$n" -eq "$((m+1))" ] || echo "rows $n vs skills $m (+1 header)"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add profiles/robert-blust/robert-blust.md
git commit -m "$(cat <<'EOF'
Add the profile with one evidenced claim per skill

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: The experiences

**Files:**
- Create: 20 files under `profiles/robert-blust/experiences/`

**Interfaces:**
- Consumes: skill H1s (Task 4), `rob-cv`, the profile folder (Task 6).

- [ ] **Step 1: Write the 20 experiences**

Read each CV file in full before writing its experience. Shape per the schema — `source`, `source-id`, `start`, `end`, `organisation`, `skills` in frontmatter; H1; `>` tagline; `## Achievements`:

```markdown
---
source: rob-cv
source-id: 2022-likemagic
start: 2022-01
end: 2026-01
organisation: LIKE MAGIC AG
skills: [Scaling engineering organizations, AI strategy and governance, Cloud platform engineering, Process orchestration and automation, Multi-tenant SaaS architecture, API design, Information security and compliance, Java platform engineering]
---

# Co-Founder & Head of Technology

> Built and ran the SaaS hospitality platform behind 90+ customers and 16,000+ units across DACH.

## Achievements

- <the CV's English bullets, one per line, verbatim except for house style>
```

The twenty, with the frontmatter that is fixed by the CV (bullets and `skills` come from reading each file; every skill listed must be one the entry's bullets actually evidence):

| file | source-id | organisation | start | end | H1 |
| --- | --- | --- | --- | --- | --- |
| `1999-ubs-trainee.md` | 1999-ubs-trainee | UBS AG | 1999-01 | 2001-01 | UBSIT — Internal Software Engineering Apprenticeship |
| `2001-ubs-engineer.md` | 2001-ubs-engineer | UBS AG | 2001-01 | 2006-01 | Software Engineer / IT Developer |
| `2006-ubs-solution-manager.md` | 2006-ubs-solution-manager | UBS AG | 2006-01 | 2010-01 | Solution Manager, Software Engineering — Analysis & Design |
| `2010-ubs-architect.md` | 2010-ubs-architect | UBS AG | 2010-01 | 2015-01 | IT Architect — Software Development Lifecycle Toolchain |
| `2015-3ap.md` | 2015-3ap | 3AP AG | 2015-01 | 2022-01 | Co-Founder & CTO |
| `2022-likemagic.md` | 2022-likemagic | LIKE MAGIC AG | 2022-01 | 2026-01 | Co-Founder & Head of Technology |
| `2015-credit-suisse-mdr.md` | credit-suisse-mdr | Credit Suisse | 2015-01 | 2016-01 | Credit Suisse — Master Data Repository |
| `2015-swisscard-data-integration.md` | swisscard-data-integration | Swisscard | 2015-01 | — | Swisscard — Data Integration Services Rewrite |
| `2015-swisscom-agile-cockpit.md` | swisscom-agile-cockpit | Swisscom | 2015-01 | — | Swisscom — Agile Delivery Cockpit |
| `2017-axa-health-platform.md` | axa-health-platform | AXA Health | 2017-01 | 2019-01 | AXA Health — Digital Insurance Platform |
| `2018-flawa-iq.md` | flawa-iq | Flawa | 2018-01 | 2019-01 | Flawa iQ — Networked First-Aid Kit |
| `2019-aroov-realestate.md` | aroov-realestate | Aroov | 2019-01 | 2021-01 | Aroov — Digital Rental Platform |
| `2020-stay-koook.md` | stay-koook | SV Group | 2020-01 | 2022-01 | Stay KooooK — Digital Hospitality Platform |
| `2002-wirtschaftsinformatik-fh.md` | 2002-wirtschaftsinformatik-fh | AKAD University of Applied Sciences | 2002-01 | 2006-01 | Wirtschaftsinformatiker FH |
| `2016-safe-practitioner.md` | 2016-safe-practitioner | Scaled Agile, Inc. | 2016-01 | — | Certified SAFe 4 Practitioner |
| `2010-eclipse-modeling-platform.md` | eclipse-modeling-platform | Eclipse Foundation | 2010-01 | 2011-01 | Eclipse Modeling Platform Working Group |
| `2011-jugs-board.md` | jugs-board | JUG Switzerland | 2011-01 | 2014-01 | Board Member — Swiss Eclipse User Group |
| `2012-talks-eclipse.md` | talks-eclipse-2012 | Eclipse Foundation | 2012-01 | — | Conference Speaker — Eclipse 2012 |
| `2020-camunda-case-study.md` | camunda-case-study | Camunda | 2020-01 | — | Featured Case Study — LIKE MAGIC on Camunda |
| `2022-talk-camundacon.md` | talk-camundacon-2022 | Camunda | 2022-01 | — | Conference Speaker — CamundaCon 2022, Berlin |

Notes that are decisions, not options:
- A project's tagline names the employer and role: `> 3AP · Lead Architect & Backend Engineer, about two years hands-on.` The `organisation` is the client.
- `end` absent where the CV has none — for a one-off (a talk, a certification, a case study) the schema reads absence as "ongoing", which is wrong for a talk. Write it absent anyway and record the strain in §7 (Task 9); do not invent an end month.
- If a project's CV title collides with an H1 already used, keep the CV's title — the file's H1 must be unique across `experiences/` because it is the canonical name (R2); check with the script below.
- An entry with no bullets in the CV (some community items) omits `## Achievements`; the section is optional.

- [ ] **Step 2: Throwaway checks — refs, dates, uniqueness**

```bash
d=profiles/robert-blust/experiences
ls $d/*.md | wc -l    # 20
for f in $d/*.md; do
  grep -q '^source: rob-cv$' $f || echo "source: $f"
  grep -q '^source-id: ' $f || echo "source-id: $f"
  grep -Eq '^start: [0-9]{4}-[0-9]{2}$' $f || echo "start: $f"
  grep -E '^end: ' $f | grep -Evq '^end: [0-9]{4}-[0-9]{2}$' && echo "end: $f"
  y=$(grep -m1 '^start:' $f | cut -c8-11); [ "$(basename $f | cut -c1-4)" = "$y" ] || echo "filename year != start: $f"
  grep -m1 '^skills:' $f | sed 's/^skills: \[//; s/\]$//' | tr ',' '\n' | sed 's/^ *//;s/ *$//' | while read s; do [ -z "$s" ] || grep -qx "# $s" skills/*.md || echo "UNRESOLVED skill in $f: $s"; done
done
grep -h '^# ' $d/*.md | sort | uniq -d    # nothing: H1s unique
for s in $(ls skills/*.md | grep -v README); do h=$(grep -m1 '^# ' $s | sed 's/^# //'); grep -q "$h" $d/*.md || echo "skill evidenced by no experience: $h"; done
```

Expected: `20`, otherwise no output. A skill evidenced by no experience is deleted from `skills/` and from the profile table (spec §4's cut rule), and the check re-run.

- [ ] **Step 3: Commit**

```bash
git add profiles
git commit -m "$(cat <<'EOF'
Add the twenty experiences: roles, projects, education, community

Every dated CV entry is one experience with the CV's id as source-id.
Year-only dates become -01; a one-off has no end, which the schema
reads as ongoing. Both are findings for the spec.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Agent instructions and the three portable skills

**Files:**
- Create: `AGENTS.md`, `.claude/skills/companygraph-validate/SKILL.md`, `.claude/skills/companygraph-add-entity/SKILL.md`, `.claude/skills/companygraph-export/SKILL.md`, `export/SKILL-intro.md`

**Interfaces:**
- Consumes: `.companygraph/manifest.json` (Task 2) — export reads name and core version from it.
- Produces: `dist/mental-model-skill.zip` when export runs (Task 9).

- [ ] **Step 1: AGENTS.md**

```markdown
# AGENTS.md

Guidance for agents working in this repository — the instance's own rules. Every modelling
rule lives in `meta/CONVENTIONS.md` and is not restated here; read it first.

## What this is

Robert Blust, described in CompanyGraph: one profile, its experiences, the skills and values
it claims, and the ladder it claims them on. `meta/` is core 0.1.0, vendored and never edited
here; `.companygraph/manifest.json` records which release and a hash per file.

## Before every commit

Run the `companygraph-validate` skill. It reports per rule R1–R10 and names what it did not
check. A commit with an unresolved reference is not made.

## Mastership

- A page with `source: rob-cv` is mastered in the CV repository. Correct it there first, then
  copy the fact here. Editing it here alone is drift.
- A page with `source: Local` is mastered here.
- `source-id` on a `rob-cv` page is the CV entry's `id`. It is a pointer a person follows;
  there is no sync.

## House style

- American English — `organization`, `modeling`, `color`. Proper nouns and quotations stay as
  they are. (The schema fields are British — `organisation` — and are spelled as the schema
  spells them; a field name is not prose.)
- No Oxford comma.
- One idea per bullet, leading with the outcome or the decision. Active voice. Past tense for
  what ended.
- Claim only what the CV states. No invented metrics, dates, employers or partners.

## Sync slot

Instance-owned skills would live at `.claude/skills/mental-model-<source>/`. None exist: the
content was written once by hand. The `companygraph-*` skills are the portable ones from the
tooling spec, carried here until the tooling installs them.
```

- [ ] **Step 2: companygraph-validate**

`.claude/skills/companygraph-validate/SKILL.md`:

```markdown
---
name: companygraph-validate
description: Validate this CompanyGraph instance against meta/CONVENTIONS.md, rule by rule, and report what was not checked. Run before every commit.
---

# companygraph-validate

The R0 agent pass. `companygraph check` — the CLI — does not exist in this instance, so the
mechanical rules it would cover are done here by hand as well.

## Procedure

1. Read `meta/CONVENTIONS.md` in full. The rules R1–R10 are what is being checked; do not
   check anything they do not state.
2. Read `.companygraph/manifest.json`. For every path in `files`, compute its sha256 and
   compare. Report a mismatch — it is not a failure (upgrade's business), but it is said.
3. Walk every `*-schema.md` in `meta/` and check the R9 fixed shape: H1 `# <Type> Schema`,
   `>` tagline, `**Owner:**` line if owned, `## File Location`, `## Frontmatter` with one table
   (`Field | Required | Type | Description`) or `No YAML frontmatter.`, `## Sections` opening
   with a `Section | Required | Description` table; every `Table.` section has a column table
   introduced by `` `## X` is a table with these columns: `` and vice versa; no `:---`.
4. List the root folders. Every schema's File Location folder exists (R7); every root folder
   is one a schema names or `meta/`, `.companygraph/`, `.claude/`, `export/`, `dist/` (R6, R7).
   No schema file sits inside a type folder (R9).
5. For every entity file (every `.md` in a type folder except `README.md`): exactly one H1
   (R1, R2); filename is the kebab-case of the H1, or for an experience the start year plus a
   slug; a folder-form entity's own file is named for its folder (R6).
6. For every entity, against its schema: every required frontmatter field present; every
   field typed `enum` holds a listed value (R8); every `ref → <type>` and
   `array of ref → <type>` value equals the H1 of an entity of that type (R3, R4); every
   required section present; for a `Table.` section, the header row equals the column table's
   columns and every `ref → <type>` cell resolves (R4).
7. Owned types: every `experience` sits under `profiles/<profile>/experiences/` and nowhere
   else (R5, R10).

## Report

Per rule, `R1 ✓` or `R4 ✗ <file>: <reference> resolves to no <type>` — one line per failure,
citing the rule. Then the lines the script cannot reach and this pass judged by reading:
whether each `Evidence` cell is a concrete fact, whether `## In practice` prose says what
following and breaking the value looks like. End with **Not checked:** naming anything above
that was skipped, so a clean report is never read as more than it is.
```

- [ ] **Step 3: companygraph-add-entity**

`.claude/skills/companygraph-add-entity/SKILL.md`:

```markdown
---
name: companygraph-add-entity
description: Add one entity to this CompanyGraph instance from a prompt — the shell from its schema, the body from the prompt, then validate.
---

# companygraph-add-entity

`companygraph add` — the CLI — does not exist in this instance, so its half is done by hand:
read the schema by the R9 fixed shape, write the shell, then fill it.

## Procedure

1. Take the type and the name from the prompt. Read `meta/<type>-schema.md` — its tables only.
2. Resolve the path from `## File Location`. An owned type (`**Owner:**` line) needs its owner
   named in the prompt and lands inside the owner's folder; refuse an owner that resolves to
   no entity of the owning type. A type that owns collections becomes a folder holding its own
   file and one empty folder per owned type.
3. Write the shell: frontmatter with every field the table declares — required ones present,
   optional ones as `# field:` YAML comments; H1 exactly as given; every required section as a
   heading; a `Table.` section gets its header row from the column table.
4. Fill the body from the prompt. Every reference is the H1 of an existing entity — never
   invent one; if the prompt names an entity that does not exist, stop and offer to add it
   first, in a separate run.
5. Remove the optional-field comments that stayed empty. Run `companygraph-validate`.
```

- [ ] **Step 4: companygraph-export and the intro**

`.claude/skills/companygraph-export/SKILL.md`:

```markdown
---
name: companygraph-export
description: Package this CompanyGraph instance as a loadable agent skill — dist/<instance>-skill.zip with SKILL.md and one consolidated file per root type.
allowed-tools: Bash(*)
---

# companygraph-export

Produces `dist/mental-model-skill.zip`, uploadable as an organization or personal skill:
`SKILL.md` at the root, `model/<type>.md` per root type folder, `model/meta.md`.

## Procedure

1. Read `.companygraph/manifest.json` for the core version. The instance name is the
   repository folder's name (`mental-model`); the description is the root `README.md`'s
   `>` line.
2. Stage in a temporary directory: `mental-model/SKILL.md` and `mental-model/model/`.
3. For every root type folder (every folder a schema in `meta/` names, plus `profiles/`
   recursively so experiences travel with their profile): write `model/<folder>.md` — the
   folder's `README.md` first, then every entity file in path order, separated by a line
   holding `---`. Count the entities per type as you go.
4. `model/meta.md`: `meta/CONVENTIONS.md`, then every `meta/*-schema.md`, separated by `---`.
5. `SKILL.md`: frontmatter `name: mental-model` and `description: <the README tagline>`; then
   `export/SKILL-intro.md` verbatim when it exists; then a table of `model/` files with the
   entity count per type and the core version; then one paragraph on how to read the model —
   H1 is the name, references are by name, `meta/meta.md` holds the rules.
6. `mkdir -p dist && zip -r dist/mental-model-skill.zip mental-model` from the staging root.
   Verify: `unzip -l` lists `SKILL.md`, `model/meta.md` and one file per folder; the counts in
   `SKILL.md` equal `find <folder> -name '*.md' ! -name README.md | wc -l` on disk.
7. Remove the staging directory. `dist/` is gitignored; the zip is never committed.
```

`export/SKILL-intro.md`:

```markdown
## Who this is

Robert Blust — technology executive, head of technology and business architect. Load this
skill to answer, in his own terms, what he has built, which capabilities he claims and on what
evidence, and what he holds to. The profile is the entry point; every experience names the
skills it evidences, and every skill names what using it looks like. Where a claim is
disputed, the `Evidence` column is what to weigh it against, not the level.
```

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md .claude export
git commit -m "$(cat <<'EOF'
Add the instance's rules and three portable skills as prose

AGENTS.md carries only the instance half: house style, mastership, run
validate before every commit, an empty sync slot. validate, add-entity
and export do by hand what the absent CLI would do first; upgrade waits
for the CLI.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
git push
```

---

### Task 9: Validate, export, findings, and the two PRs

**Files:**
- Modify (mental-model): whatever validate reports
- Modify (meta-model): `README.md` roadmap item 2; spec §7

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Run the validate skill over the instance**

In `~/git/robertblust/mental-model`, invoke `companygraph-validate` and follow it literally. Fix every `✗` in the content (never in `meta/`), commit each fix as `Fix: <rule> — <what>`, and re-run until the report has no `✗`. Keep the **Not checked** list — it goes into §7.

- [ ] **Step 2: Run the export skill and check its counts**

Invoke `companygraph-export`. Then:

```bash
unzip -l dist/mental-model-skill.zip
for d in sources proficiency-levels skills values; do echo "$d $(ls $d/*.md | grep -vc README)"; done
echo "profiles 1"; echo "experiences $(ls profiles/robert-blust/experiences/*.md | wc -l)"
unzip -p dist/mental-model-skill.zip mental-model/SKILL.md | grep -E '^\|'
```

Expected: the table in `SKILL.md` shows the same numbers as the `for` loop: sources 2, proficiency-levels 4, skills 23 (or fewer after the cut), values 4, profiles 1, experiences 20.

- [ ] **Step 3: Fill spec §7 in meta-model**

```bash
cd ~/git/companygraph/meta-model && git checkout main && git pull -q && git checkout -b reference-instance-findings
```

In `docs/superpowers/specs/2026-08-26-reference-instance-design.md`, replace the sentence `The rest is written as it is found.` with the findings from Tasks 2–9, each as a bullet `**<spec>, §<n>** — <finding>` in the same voice as the four already there. At minimum, one bullet each on:
- `end` absent on a one-off experience reads as "ongoing" (core, `experience`)
- what `companygraph-validate` listed under **Not checked** (tooling §5/§6)
- whether the skill count survived the two cut passes, and how many rows the profile table ended with (core, `profile`)
- anything the R9 walk in validate step 3 found in the vendored schemas (core, R9) — or that it found nothing
- how long the hand-built `init` took versus what `add` would have saved (tooling §4)

Then in `README.md` change the roadmap's item 2 to:

```markdown
2. ✅ **The reference instance** — a real company described in this vocabulary:
   [`robertblust/mental-model`](https://github.com/robertblust/mental-model), a company of
   one, laid out by hand as the tooling will lay one out. What it taught is §7 of
   [its spec](docs/superpowers/specs/2026-08-26-reference-instance-design.md).
```

Also change the spec's `Status:` line to `Status: built. Findings in §7; each is a follow-up, not a change made here.`

```bash
npm run verify
git add README.md docs/superpowers/specs/2026-08-26-reference-instance-design.md
git commit -m "$(cat <<'EOF'
Record what the reference instance taught; tick roadmap item 2

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
git push -u origin reference-instance-findings
gh pr create --title "Reference instance: findings and roadmap item 2" --body "Fills §7 of the reference instance spec with what building robertblust/mental-model taught, and ticks roadmap item 2. Nothing in core changes; each finding is its own follow-up.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

- [ ] **Step 4: The instance's review PR**

The instance was pushed straight to `main` in Tasks 2–8 (a new repository with no history to protect). For the owner's review of the drafted prose, open one PR that removes the review markers, so that approving it is the act of accepting the values and levels:

```bash
cd ~/git/robertblust/mental-model && git checkout -b review-drafted-prose
grep -rl 'review before merge\|levels drafted' values profiles   # the files carrying markers
for f in values/*.md profiles/robert-blust/robert-blust.md; do
  grep -v -e '<!-- drafted from the CV summary — review before merge -->' -e '<!-- levels drafted — review -->' "$f" | cat -s > "$f.tmp" && mv "$f.tmp" "$f"
done
grep -rn '<!--' values profiles   # nothing
git add -A && git commit -m "$(cat <<'EOF'
Remove the review markers from the drafted values and levels

Merging this is the owner accepting them as their own.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
git push -u origin review-drafted-prose
gh pr create --title "Review: the four values and the skill levels" --body "The values under values/ and the Level column of the profile's Skills table were drafted from the CV summary. Read them; merging accepts them. Edit on this branch first if a word is not yours.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

Do not merge either PR; both are the owner's to read.

- [ ] **Step 5: Report**

State: the tag `v0.1.0` exists; the instance URL; the validate report's last **Not checked** block verbatim; the export counts; both PR URLs.
