# A system runs in several environments — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The landscape pack gains a type, `environment`, and two fields on `system`, `instance-of` and `environment`, so a running copy of a software says what it is a copy of and where it runs; `service` gains `domain`; and the two answers that need no change stand in the schemas' writing rules.

**Architecture:** Four Markdown schemas and the README in `packs/landscape/` carry the vocabulary; `lib/checks.mjs` carries the rules a checked instance holds, as rows of `PACKS.landscape` plus one new generic rule, `flat`, beside `acyclic`; `verify/landscape.test.mjs` reads the schemas from disk and holds the rules against a small instance. One repository, one branch, the one the spec is on, one pull request.

**Tech Stack:** Node 22+, `node:test`, the checker in `lib/checks.mjs`, `tsc` for `types/`.

**Spec:** `docs/superpowers/specs/2026-10-11-a-system-runs-in-several-environments-design.md`, committed as `586bba7` on the branch `a-system-runs-in-several-environments`.

## Global Constraints

- `environment` is a file type in `model/environments/*.md`, owned by nothing, with `rank` (Yes, number) and no `element`; a system's `environment` and `instance-of` are optional references; `instance-of` is acyclic and one level deep; `service` gains `domain` (No, ref → domain).
- No version in `packs/landscape/manifest.json`, `core/manifest.json` or `package.json` moves: the release is the owner's.
- The example company under `example/` is unchanged: its three systems run in one place each, and the fixtures hold the rules.
- `lib/checks.mjs` states a pack's folders in `PACKS`, never derived from a schema; a new type is a row there and a schema file, and `types/` follows by `npm run build`.
- Every commit is the Implementer's, `git commit --author "Implementer <implementer@companygraph.io>"`, with `Process: Delivery`, `Phase: Implement`, `Track: Code`, and `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`; prose and schemas ride in the same commits as the rules they state, since a schema the checks part from fails the pack's test.
- `export PATH=/opt/homebrew/bin:$PATH` before any `node`, `npm` or `sh conventions/…`. The whole suite is the scripts `npm run verify`, `build:check`, `typecheck`, `test:instance`, `test:instance-checks`, `test:instance-files`, `test:form`, `test:pins`, `test:ids`, `test:localization`, `test:plan`, `test:rules`, `test:cli`, `test:consumer`, `test:untar`, `test:fetch-core`, `test:obsidian`, `test:judge`, `test:seats` and `test:gate`; `node --test verify/landscape.test.mjs` is the pack's own.
- Nothing is merged or released without the owner's word.

## Review Focus

1. An `instance-of` naming a page that itself carries `instance-of` must be reported once, naming both pages, and not also as a circle. Pinned in Task 2.
2. An `instance-of` naming the page itself is a circle of one and must be reported by the circle rule, not by `flat`. Pinned in Task 2.
3. A copy that claims `master` beside the software's row must fail once under the existing master rule with no second message from the new rules. Pinned in Task 2.
4. An `environment` page no system names must be reported as an unnamed kind is, and one named only by a platform, with no `instance-of`, must pass. Pinned in Task 1.
5. A `service` whose `domain` names no page must be R4's with the same message a system's `domain` gets. Pinned in Task 3.

---

### Task 1: The `environment` type

**Files:**

- Create: `packs/landscape/environment-schema.md`
- Modify: `lib/checks.mjs` — a row in `PACKS.landscape`; `packs/landscape/README.md` — the types table and the paragraph after it
- Modify: `types/lib/checks.d.mts` — by `npm run build`
- Test: `verify/landscape.test.mjs`

**Interfaces:**

- Produces: the type `environment` in folder `environments`, gathering at least one `system` by `environment`; Task 2's `environment` field resolves to it.

- [ ] **Step 1: Write the failing tests**

In `verify/landscape.test.mjs`, after `const kindPage = …` add:

```js
const envPage = (name, rank, tagline = "An environment.") => `---\nsource: Local\nrank: ${rank}\n---\n\n# ${name}\n\n> ${tagline}\n\n## What it means\n\nWhat runs here, who deploys to it and what data it holds.\n`;
```

In `tree()`, after the `service-schema.md` entry add `["meta/landscape/environment-schema.md", pack("environment")],` and after the system kinds add:

```js
  ["model/environments/production.md", envPage("Production", 30, "Where the store's customers are served.")],
  ["model/environments/test.md", envPage("Test", 20, "Where a release candidate runs against synthetic data.")],
```

The `system()` builder gains two fields: add `environment, instanceOf,` to its destructured arguments and, after the `partOf` line, `...(environment ? [`environment: ${environment}`] : []), ...(instanceOf ? [`instance-of: ${instanceOf}`] : []),`. Give the Store server `environment: "Production"` and the Store network `environment: "Test"`, so both environments are named, Test by a platform alone. At the end of the file append:

```js
test("an environment no system names is told so, and one a platform alone names passes", () => {
  assert.deepEqual(failures(tree()), [], "Test, named by the Store network alone, passes");
  const f = failures(tree(edit(`${S}/store-network.md`, "environment: Test", "environment: Production")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /environments\/test\.md: 0 system pages name it in `environment`; a environment gathers at least 1/);
});

test("an environment's rank is required and a number, and its sections are the schema's", () => {
  const f = failures(tree(edit("model/environments/production.md", "rank: 30\n", "")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /production\.md.*rank/);
  const g = failures(tree(edit("model/environments/production.md", "## What it means", "## What it is")));
  assert.ok(g.some((x) => /production\.md.*What it means/.test(x)), g.join("\n"));
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test verify/landscape.test.mjs` Expected: FAIL. The first test of the file fails reading `packs/landscape/environment-schema.md`, which does not exist, and every test after it.

- [ ] **Step 3: Write the schema, the row and the README**

Create `packs/landscape/environment-schema.md`, in the form of `system-kind-schema.md`, with a fresh id in the form `model/identifier.md` declares (`node -e "console.log(require('./lib/identifier.mjs').newId())"` or the CLI's id command, whichever the repository offers; read `core/identifier.md` for the form):

```markdown
---
id: <fresh id>
---

# Environment Schema

> Required structure for environment files.

## File Location

`model/environments/*.md`

An environment owns nothing and nothing owns it: every copy that runs there names it, and what the environment is for lives here rather than being restated on every copy. It sits beside `systems/` as `system-kinds/` does.

The set is the instance's own, in the company's words: `Production`, `UAT`, `Northflank Test`. An environment arriving later is one file here, not a change to this metamodel.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none. |
| `rank` | Yes | number | The environment's place on the path from a developer's machine to the customer, the order every list of copies sorts by. Spaced in tens so one can be added without renumbering the others. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Environment]` | Yes | The canonical name, as the people who deploy to it say it. Every system that runs there references this exact string. |
| `> [Summary]` | Yes | One-paragraph summary of what runs here and for whom |
| `## What it means` | Yes | What is deployed here, who may deploy to it, what data it holds, real customers' or synthetic, and which environments are not it |
| `## References` | No | Table. What a reader can open to reach the environment; its columns are declared below. |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a console, a runbook, the pipeline that deploys here |
| `URL` | Yes | string | Where it is |

## Purpose

An environment answers "where does this copy stand, and what may it touch?" in the company's words, and carries once the order every drawing and every list of copies sorts by. A copy of a software runs in exactly one environment, and a platform runs in one too, so an agent that reads a copy's page follows `environment` to what it may touch there. An environment no system names is vocabulary nobody uses, and leaves, once the instance holds a system.

## Writing rules

- `## What it means` says what data the environment holds and who may deploy to it, since that is what an agent asks before it acts, and which environments are not it.
- The H1 names the environment as its deployers say it, never its rank and never the platform under it.
- A field for the data an environment holds is not written: the sentence in `## What it means` carries it until an instance needs it as a fact with a check.
- The page writes names and prose in the model's language (R14), as every page does.
```

In `lib/checks.mjs`, in `PACKS.landscape` after the `system-kind` row:

```js
    // An environment is where a copy of a software runs, named in the company's words and ranked
    // along the path from a laptop to the customer; one no system names is vocabulary nobody uses.
    { type: "environment", folder: "environments", gathers: { by: "system", field: "environment", least: 1 } },
```

In `packs/landscape/README.md`, in the types table after the `service` row: `| \`environment\` | Where a copy of a software runs, in the company's words and ranked along the path from a developer's machine to the customer | nothing |`, and at the end of the paragraph beginning "A system names its kind": "A system that runs in several environments is one page for the software and one per running copy, each `instance-of` the software, `part-of` its platform and naming its `environment`, a page of its own with a rank on that path."

- [ ] **Step 4: Run the pack's tests, then the suite**

Run: `npm run build && node --test verify/landscape.test.mjs` Expected: PASS. Then every script of the Global Constraints, each read for its exit code, then `sh conventions/conventions-check && sh conventions/conventions-format check`. The gathers message's article, "a environment", is the rule's own wording for every type; the test matches it as written, and changing the rule's article is out of scope.

- [ ] **Step 5: Commit**

```bash
git add packs/landscape/environment-schema.md packs/landscape/README.md lib/checks.mjs types verify/landscape.test.mjs
git commit --author "Implementer <implementer@companygraph.io>" -F- <<'EOF'
The landscape pack has an environment

A running copy of a software runs somewhere on the path from a developer's machine to the customer, and the pack had no word for where. environment is a type of the pack, owned by nothing, named in the company's words and ranked along that path, with a section saying what is deployed there, who may deploy and what data it holds; one no system names is told so, as a kind nobody names is. The README's table and its paragraph on a system say it.

Verified: node --test verify/landscape.test.mjs and every script of the suite pass; conventions-check and conventions-format pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

---

### Task 2: `instance-of` and `environment` on a system

**Files:**

- Modify: `packs/landscape/system-schema.md` — two frontmatter rows after `part-of`, the writing rules of the spec's §3 and §5
- Modify: `lib/checks.mjs` — `acyclic` takes a list; the rule `flat`; the system's row
- Modify: `types/lib/checks.d.mts` — by `npm run build`
- Test: `verify/landscape.test.mjs`

**Interfaces:**

- Consumes: Task 1's type for `environment` to resolve to.
- Produces: `TypeEntry.acyclic: string | string[]` and `TypeEntry.flat: string`, the system row carrying `acyclic: ["part-of", "instance-of"], flat: "instance-of"`.

- [ ] **Step 1: Write the failing tests**

In `tree()`, after the Article master add a software and two copies, and give `point-of-sale.md` no environment:

```js
  [`${S}/billing-service.md`, system({ kind: "Till software", lifecycle: "active", owner: "Store Manager", h1: "Billing service", tagline: "The service that prices every sale.", body: holds([["Customer", "", "reads"]]) })],
  [`${S}/billing-service-production.md`, system({ kind: "Till software", instanceOf: "Billing service", environment: "Production", partOf: "Store server", operator: "IT Operations", h1: "Billing service (production)", tagline: "The copy that serves the stores.", body: connects([["Article master", "Article feed", "", "Article", "REST"]]) })],
  [`${S}/billing-service-test.md`, system({ kind: "Till software", instanceOf: "Billing service", environment: "Test", partOf: "Store server", operator: "IT Operations", h1: "Billing service (test)", tagline: "The copy a release candidate runs as." })],
```

Task 1's test on an unnamed environment then needs the test copy moved too: in that test's edit, change the copy's `environment: Test` to `Production` as well, in the same `tree()` call, so Test is named by nobody. Append:

```js
test("a copy of a copy is told so once, naming both pages, and a copy of itself is a circle", () => {
  const f = failures(tree(edit(`${S}/billing-service-test.md`, "instance-of: Billing service", "instance-of: Billing service (production)")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /billing-service-test\.md names "Billing service \(production\)" in `instance-of`, which is itself `instance-of` "Billing service"; a copy is a copy of the software, never of another copy \(R16\)/);
  const g = failures(tree(edit(`${S}/billing-service.md`, "owner: Store Manager", "owner: Store Manager\ninstance-of: Billing service")));
  assert.equal(g.length, 1, g.join("\n"));
  assert.match(g[0], /`instance-of` runs in a circle.*"Billing service" → "Billing service"/);
});

test("a copy that claims the master beside the software fails once, under the master rule alone", () => {
  const f = failures(tree(edit(`${S}/billing-service-test.md`, "> The copy a release candidate runs as.\n", "> The copy a release candidate runs as.\n" + holds([["Customer", "", "master"]]))));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /"Customer" is in the "## Holds" Concept of model\/systems\/article-master\.md and model\/systems\/billing-service-test\.md/);
});

test("an environment no page resolves is R4's", () => {
  const f = failures(tree(edit(`${S}/billing-service-test.md`, "environment: Test", "environment: Staging")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /billing-service-test\.md.*"Staging".*\(R4\)/);
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test verify/landscape.test.mjs` Expected: FAIL. The passing-instance test fails on `instance-of` and `environment` as fields the schema does not declare, and the three new tests fail after it.

- [ ] **Step 3: Write the schema rows, the rules and the checks**

In `packs/landscape/system-schema.md`, after the `part-of` row:

```markdown
| `instance-of` | No | ref → system | The system this one is a running copy of, the H1 of another file in `systems/`, written on the copy; the software page names nothing. One level deep: the page named leaves `instance-of` empty, so a copy is never a copy of a copy. |
| `environment` | No | ref → environment | Where this system runs, in the path from a developer's machine to the customer, the H1 of a file in `environments/`. Written on a copy, and on a platform, which runs somewhere too. |
```

In `## Writing rules`, after the rule on `## Holds` naming concepts, add the sentence to that rule: "A row with `writes` or `reads` alone is right where the master stands on another system; a concept only one system keeps, as a cache keeps queue jobs, is that system's as `master`." Then add these rules before the last one on cost, license and version:

```markdown
- A software that runs in several environments is one page for the software and one per running copy. The software page carries what is the same wherever it runs: its kind, its owner, what it holds and the master's row among it, the services it provides and the features it realizes. A copy carries what differs where it runs: its platform, its operator, its environment and the connections it takes there, and repeats nothing the software page says.
- A copy writes no `## Holds` row: the data it keeps is the software's, and a copy that claimed `master` beside the software's row is refused by the one-master rule.
- `## Connects to` on a copy names what that copy takes data from there: in production the production database, locally the one on the laptop. A connection the software takes everywhere is written on the software page once.
- A copy's H1 names the software and its environment as the people who run it say it, `Billing service (production)`, so the two are told apart in every list. A database, a queue or a cache is a system too, and its copies follow the same pattern.
```

and extend the last rule to: "The page states no cost, no license count, no version, no port, no command and no log path. Those move, and a contract register, a configuration database or a runbook holds them; `## References` names the runbook, the log console and the repository whose README carries the commands, one row each, so an agent reading the page finds where to look."

In `lib/checks.mjs`: the typedef line for `acyclic` becomes `@property {string | string[]} [acyclic]` with "or several such fields, each its own chain" added to its sentence, and a new line after it:

```js
 * @property {string} [flat] A field naming an entity of the page's own type that is one level deep: the entity named carries the field empty, so a copy is never a copy of a copy.
```

The circle rule's `run()` iterates every field: replace `const field = t.acyclic;` and the body under it with `for (const field of [t.acyclic].flat()) { … }` around the existing body, unchanged inside. After the circle rule's object add:

```js
  {
    // A field that is one level deep: a copy of a software names the software, and never another
    // copy, so the page it names carries the field empty. A page naming itself is a circle of
    // one and the circle rule's; a name that resolves to nothing is R4's.
    name: "a one-level field names a page that leaves it empty",
    rule: "R16",
    run() {
      for (const t of TYPES) {
        if (!t.flat) continue;
        const field = t.flat;
        const pages = pagesOf(t.type);
        for (const { path, text } of pages) {
          const value = fmScalar(frontmatterOf(text), field);
          if (!value) continue;
          const found = entityNamed(path, t.type, t, value);
          if (!found || found.path === path) continue;
          const above = fmScalar(frontmatterOf(found.text), field);
          if (!above) continue;
          fail(`${path} names "${found.name ?? value}" in \`${field}\`, which is itself \`${field}\` "${above}"; a copy is a copy of the software, never of another copy (R16)`);
        }
      }
    },
  },
```

The system's row becomes `acyclic: ["part-of", "instance-of"], flat: "instance-of"`, with one sentence added to its comment: "A copy names the software it is a copy of in `instance-of`, one level deep, so the chain never returns and never stacks."

- [ ] **Step 4: Run the pack's tests, then the suite**

Run: `npm run build && node --test verify/landscape.test.mjs` Expected: PASS. Then the suite's scripts and the conventions checks, as Task 1.

- [ ] **Step 5: Commit**

```bash
git add packs/landscape/system-schema.md lib/checks.mjs types verify/landscape.test.mjs
git commit --author "Implementer <implementer@companygraph.io>" -F- <<'EOF'
A system says what it is a copy of and where it runs

A copy of a software in production, in test or on a laptop is a system of its own, with its platform, its operator and the connections it takes there, and two fields say what makes it a copy: instance-of names the software, one level deep and never in a circle, and environment names the page that says where it stands. The writing rules put the holds and the master on the software page, the connections that differ on the copy, and the runbook facts that move, ports, commands and log paths, into References beside the cost and the version; and they say that a holder need not be a master. The checker's acyclic rule takes several fields, and a new one-level rule reports a copy of a copy once, naming both pages.

Verified: node --test verify/landscape.test.mjs and every script of the suite pass; conventions-check and conventions-format pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

---

### Task 3: `domain` on a service, and the mapping

**Files:**

- Modify: `packs/landscape/service-schema.md` — a frontmatter row after `serves`, a writing rule
- Modify: `packs/landscape/README.md` — the mapping rows of the spec's §4, the departure line, and `## Left for later`
- Test: `verify/landscape.test.mjs`

- [ ] **Step 1: Write the failing tests**

In `tree()`, the Card authorization service gains `domain: Retail` after `provided-by`. Append:

```js
test("a service in a domain resolves, and one naming no domain page is R4's", () => {
  assert.deepEqual(failures(tree()), []);
  const f = failures(tree(edit("model/services/card-authorization.md", "domain: Retail", "domain: Payments")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /card-authorization\.md.*"Payments".*\(R4\)/);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test verify/landscape.test.mjs` Expected: FAIL on the passing instance, `domain` being a field the service schema does not declare.

- [ ] **Step 3: Write the row, the rule and the README**

In `packs/landscape/service-schema.md`, after the `serves` row:

```markdown
| `domain` | No | ref → domain | The area of the company the service belongs to where it realizes no feature, the H1 of a file in `domains/` |
```

and a writing rule after the one on `realizes`: "An API, an SDK client and a set of MCP tools that consumers call apart are three services provided by the same system, each named as its consumers call it; `domain` is what groups them, never one service that bundles them. A service names no bounded context, since a pack names only core's types and its own (R20); a context realizes domains, so a service in a domain stands beside the context of that domain."

In `packs/landscape/README.md`'s mapping table, replace the row `| Function (Common Domain), Artifact | dropped: internal behavior nobody can name a user of |` with the two rows of the spec's §4, and the `Grouping` row after the `Business Actor` row. In the departures list, before the line on a kind being a profile: "- A running copy is a system, not an artifact: a copy has connections, an operator and an owner of its own that an artifact does not carry, and the element comes back exact on export." In `## Left for later`, after "Location, as a third type of this pack, for the first instance that writes one;" the clause stays as it is, and the sentence gains at its end: "a field on `environment` for the data it holds, real or synthetic, which `## What it means` carries as a sentence until an instance needs it as a fact".

- [ ] **Step 4: Run the pack's tests, then the suite**

Run: `node --test verify/landscape.test.mjs` Expected: PASS. Then the suite's scripts and the conventions checks, as Task 1.

- [ ] **Step 5: Commit, push**

```bash
git add packs/landscape/service-schema.md packs/landscape/README.md verify/landscape.test.mjs
git commit --author "Implementer <implementer@companygraph.io>" -F- <<'EOF'
A service belongs to a domain, and a copy maps to an artifact on its node

A service could name the features it realizes and the processes it serves, and not the area of the company it belongs to, which is what groups the services a bounded context offers; it cannot name the context, since a pack names only core's types and its own, and a domain is core, so domain joins service in the system's own words, with the rule that an API, an SDK and a set of MCP tools are three services and a domain groups them. The README's mapping takes the artifact back as a copy assigned to its node and the environment as a Grouping, says why a copy is a system and not an artifact, and leaves a field for the data an environment holds for later.

Verified: node --test verify/landscape.test.mjs and every script of the suite pass; conventions-check and conventions-format pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
git -c credential.helper='!/opt/homebrew/bin/gh auth git-credential' push
```

The pull request #357 then carries the spec, this plan and the build; its body is extended with what the build did and the verification line. Nothing is merged.

---

### Task 4: Order and hand-off

1. Tasks 1, 2 and 3 in order on the branch `a-system-runs-in-several-environments`, each commit after its suite.
2. The hand-off names #357, the three commits, that the release is a minor of the meta-model carrying the pack's next minor, which instances take it, and that the reply to Mischa Ramseyer waits on the merge.
