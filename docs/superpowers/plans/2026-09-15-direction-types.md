# Direction types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `strategic-objective` and `strategy` to CompanyGraph core, release them as 0.21.0, write the reference instance's first objective and two strategies, and re-pin blust.ch onto the result.

**Architecture:** The Direction group opens with two folder types owned by nothing. One edge carries the chain and it points up: `strategy.serves` names the objectives it pursues, and a second optional edge, `strategy.upholds`, names the values that constrain the route. The objective draws no edge to the vision, because there is one vision and that edge would be identical on every objective. Neither type declares a body table, so nothing in the prose resolves and the parser needs no change.

**Tech Stack:** Markdown, Node's built-in test runner, `npm run verify` in `companygraph/meta-model`, the `companygraph-validate` skill in `robertblust/mental-model`, `npm run model` in `robertblust.github.io`.

**Spec:** `docs/superpowers/specs/2026-09-15-direction-types-design.md`

## Global Constraints

- Core is at 0.19.0, the package at 0.20.0, and **both go to 0.21.0**. The version string appears in exactly three places that must move together: `core/manifest.json`, `package.json`, and the `ref:` in `.github/workflows/instance-check.yml`. Core may sit behind the package and may never be ahead.
- `shape` in `core/manifest.json` stays **2**. The layout of the vendored unit does not change, only its contents.
- R17 is the highest rule in use and **no rule is added, renumbered or weakened** by this work.
- Core is company-generic. Nothing in `core/` or `example/` names Robert Blust, blust.ch, CompanyGraph's own business or any real client.
- **The multi-person instance is never named**, in any file, commit message or pull request description. `conventions/WRITING.md` forbids naming closed-source predecessor projects; earlier specs call it "the multi-person instance".
- Prose follows `conventions/WRITING.md`: American English, spaced em-dashes, sentence case in headings, no serial comma, curly quotes. Run `sh conventions/conventions-check` in every repository before committing there. `docs/superpowers/` is excluded from that check in every member, so plan and spec prose is held by the agent pass alone.
- Every commit runs the checks its task names, and is made only when they pass. A pipe into `tail` hides an exit code, so check the exit code on its own.
- **Nothing is merged and nothing is tagged by an agent.** Each phase ends with a green pull request and stops. Merging, tagging and publishing the release are the owner's decisions.
- Phase 2 and Phase 3 are both blocked until the owner has merged Phase 1 and pushed the tag `v0.21.0`, and neither blocks the other: Phase 2 writes the instance, Phase 3 pins a site to the meta-model itself. Phase 4 is blocked until the owner has merged Phase 2.
- Commit messages and pull request descriptions follow the git register: a subject under seventy characters with no type prefix and no trailing period, one to three short paragraphs, then one line beginning `Verified:` naming what ran and passed, then the trailers.

---

## Phase 1 — companygraph/meta-model

Repository: `/Users/rob/git/companygraph/meta-model`. Branch: `direction-types`, which already exists and already carries `docs/superpowers/specs/2026-09-15-direction-types-design.md` uncommitted. Task 1 commits the spec alongside the first schema.

### Task 1: The `strategic-objective` schema

**Files:**

- Create: `core/strategic-objective-schema.md`
- Modify: `lib/checks.mjs` (the `TYPES` array, currently lines 18-40)
- Add: `docs/superpowers/specs/2026-09-15-direction-types-design.md` and `docs/superpowers/plans/2026-09-15-direction-types.md` (both already written, neither yet committed)
- Test: `npm run verify`

**Interfaces:**

- Produces: the type name `strategic-objective`, its folder `strategic-objectives`, and the section heading `## What it makes true`. Task 2's `serves` field points at this type by name; Task 3 and Task 7 write entities against this schema.

- [ ] **Step 1: Confirm the current shape before touching anything**

```bash
cd /Users/rob/git/companygraph/meta-model
git branch --show-current
node -e 'import("./lib/checks.mjs").then(m=>console.log(m.TYPES.map(t=>t.type).join(", ")))'
npm run verify
```

Expected: branch `direction-types`; ten type names with no `strategic-objective` and no `strategy`; verify passes. If verify already fails, stop and report — this plan assumes a green starting point.

- [ ] **Step 2: Add the type to `TYPES`, before the schema exists**

The order matters and it is the opposite of what looks natural. An orphan `core/*-schema.md` with no `TYPES` entry passes verify silently — the suite iterates `TYPES` and asks whether each type's schema exists, never the reverse — so writing the schema first gives a green run that proves nothing. A `TYPES` entry with no schema fails loudly, which is the red this task starts from.

In `lib/checks.mjs`, inside the `TYPES` array, add the entry after the `surface` line and before the `profile` line:

```javascript
  { type: "strategic-objective", folder: "strategic-objectives" },
```

- [ ] **Step 3: Run verify and watch it fail for exactly one reason**

```bash
npm run verify; echo "exit: $?"
```

Expected: `✗ 1 problem` and `core/strategic-objective-schema.md is missing`, exit non-zero. If it fails for any other reason, or passes, stop and report — something other than this change is wrong.

- [ ] **Step 4: Write the schema**

Create `core/strategic-objective-schema.md` with exactly this content:

```markdown
# Strategic Objective Schema

> Required structure for strategic objective files.

## File Location

`model/strategic-objectives/*.md`

One file per objective. Nothing owns an objective and an objective owns nothing, as with
`value` — and a strategy cites the objective it serves by name, which a heading in a shared
document could not offer.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `adopted` | Yes | date | When this objective began directing the work |
| `horizon` | No | date | By when it should hold. Absent where the objective is a standing one. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Objective]` | Yes | The canonical name, the objective stated as a phrase. Everything references the objective by this exact string. |
| `> [Statement]` | Yes | Single-line statement of what must become true |
| `## What it makes true` | Yes | What is concretely different when it holds, and what falls outside it |

## Purpose

A strategic objective is what must become true for the vision to be reached — the layer between
a direction that holds still and the strategies that change under it. It answers "what are we
trying to make true, that we are not sure of yet?" for someone weighing whether a piece of work
is worth doing at all.

It is one file per objective so that a strategy can cite the one it serves, and so that the set
of them can be read as the portfolio it is. A vision with no objectives under it states a
destination and leaves every route equally defensible.

## Writing rules

- It says what must become true, never by what means. A means is a strategy, and an objective
  that names one has already chosen a route the model cannot then see being chosen.
- It names something the company could fail at. An objective no outcome could contradict is the
  vision restated in longer words.
- `## What it makes true` is concrete enough that a reader could tell whether it holds today,
  and it states what falls outside it, because an objective silent on its boundary is read as
  covering everything.
- `horizon` is written only where a real date exists. A standing objective leaves it absent
  rather than inventing one, and an invented horizon is a claim like any other.
- Written in the company's own first person — "I" for a company of one, "we" otherwise — and the
  same one throughout the instance.
```

- [ ] **Step 5: Run verify to confirm it passes**

```bash
npm run verify; echo "exit: $?"
npm run test:rules; echo "exit: $?"
```

Expected: both pass, exit 0. Verify now holds the new schema to R9's fixed shape.

- [ ] **Step 6: Run the prose check**

```bash
sh conventions/conventions-check; echo "exit: $?"
```

Expected: `✓ every Markdown file follows WRITING.md`, exit 0.

- [ ] **Step 7: Commit the schema and the spec together**

```bash
git add core/strategic-objective-schema.md lib/checks.mjs docs/superpowers/specs/2026-09-15-direction-types-design.md docs/superpowers/plans/2026-09-15-direction-types.md
git commit -m "$(cat <<'MSG'
An objective is what must become true for the vision to be reached

Core states a destination and the values held on the way to it, and nothing between. A
decision could be weighed against the vision and against a value, never against the thing
the company is currently trying to make true, so the route was defensible whatever it was.

The type is a file per objective because a strategy has to cite one by name, and it draws no
edge to the vision: there is one vision, so that edge would be identical everywhere and say
nothing. The design, including what was dropped from the two schemas this generalizes, is in
the spec committed beside it.

Verified: npm run verify, npm run test:rules and the prose check pass.
MSG
)"
```

### Task 2: The `strategy` schema

**Files:**

- Create: `core/strategy-schema.md`
- Modify: `lib/checks.mjs` (the `TYPES` array)
- Test: `npm run verify`

**Interfaces:**

- Consumes: the type `strategic-objective` from Task 1, named in the `serves` field's type as `array of ref → strategic-objective`.
- Produces: the type name `strategy`, its folder `strategies`, the fields `serves` and `upholds`, and the section headings `## The approach`, `## What it rules out` and `## What would show it is working`. Tasks 3, 8 write entities against this schema.

- [ ] **Step 1: Add the type to `TYPES`, before the schema exists**

Same order as Task 1, for the same reason: an orphan schema passes verify silently, a `TYPES` entry with no schema fails loudly. In `lib/checks.mjs`, immediately after the `strategic-objective` entry:

```javascript
  { type: "strategy", folder: "strategies" },
```

- [ ] **Step 2: Run verify and watch it fail for exactly one reason**

```bash
npm run verify; echo "exit: $?"
```

Expected: `✗ 1 problem` and `core/strategy-schema.md is missing`, exit non-zero.

- [ ] **Step 3: Write the schema**

Create `core/strategy-schema.md` with exactly this content:

```markdown
# Strategy Schema

> Required structure for strategy files.

## File Location

`model/strategies/*.md`

One file per strategy. Nothing owns a strategy and a strategy owns nothing, as with
`strategic-objective`.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `adopted` | Yes | date | When this strategy began deciding things |
| `serves` | Yes | array of ref → strategic-objective | The objectives this strategy pursues — the H1 of a file in `strategic-objectives/` |
| `upholds` | No | array of ref → value | The values that constrain the route chosen — the H1 of a file in `values/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Topic] Strategy` | Yes | The canonical name, ending in "Strategy". Everything references the strategy by this exact string. |
| `> [Statement]` | Yes | Single-line statement of the approach |
| `## The approach` | Yes | How, concretely enough that someone could follow it |
| `## What it rules out` | Yes | The options this choice forecloses |
| `## What would show it is working` | Yes | What is observable, early enough to change course |

## Purpose

A strategy is how an objective gets reached — one route among routes that could all have been
taken, written so that the choice is visible as a choice. It answers "why this way and not the
other way?" for someone who arrives after the decision and would otherwise re-open it.

The vision says where and is not expected to move. A strategy says how and is expected to be
replaced while the objective it serves still stands, which is why it carries the date it
started deciding things and why a retired one is deleted rather than marked.

## Writing rules

- The statement is a choice a reasonable company could have made differently. If no company
  would choose the opposite, it describes the work rather than choosing a route.
- `## The approach` names what is actually done: the tools, the cadence, what is automated and
  what deliberately is not. A strategy that could be pursued by any means at all has chosen
  nothing.
- `## What it rules out` names specific foreclosed options, not their absence. "We do not do bad
  work" rules nothing out; an option a reader can imagine the company taking does.
- `## What would show it is working` states something observable while there is still time to
  change course. A measure that only arrives at the horizon is a verdict rather than an
  instrument, and the objective is where a verdict belongs.
- It says how, never where. A strategy restating the vision has skipped the objective that was
  supposed to sit between them.
- `serves` names at least one objective. A strategy serving none is either an objective nobody
  wrote down or work nothing in the model asked for.
- `upholds` names the values that constrained the route, where any did. It is not a list of
  every value the company holds: a strategy that upholds all of them has cited none.
- Written in the company's own first person — "I" for a company of one, "we" otherwise — and the
  same one throughout the instance.
```

- [ ] **Step 4: Confirm the parser singularizes both folders correctly**

`parseInstance` takes paths **relative to the container** — `sources/local.md`, not `model/sources/local.md` — and refuses an instance with no identity entity. Both are easy to get wrong and both fail loudly, which is why the fixture below carries an identity it does not otherwise need.

```bash
node -e '
import("./lib/instance.mjs").then(async (m) => {
  const files = new Map([
    ["identity.md", "---\nsource: Local\n---\n\n# Acme\n\n> A company.\n"],
    ["sources/local.md", "# Local\n\n> Here.\n"],
    ["strategic-objectives/be-known.md", "---\nsource: Local\nadopted: 2026-01\n---\n\n# Be known\n\n> A statement.\n\n## What it makes true\n\nProse.\n"],
    ["strategies/x-strategy.md", "---\nsource: Local\nadopted: 2026-01\nserves:\n  - Be known\n---\n\n# X Strategy\n\n> A statement.\n\n## The approach\n\nProse.\n"],
  ]);
  const g = m.parseInstance(files, { sub: "model/" });
  console.log(g.types.map((t) => t.type).join(", "));
  console.log(g.edges.filter((e) => e.via === "serves").length, "serves edge(s)");
});'
```

Expected, exactly:

```
identity, source, strategic-objective, strategy
1 serves edge(s)
```

`strategies` is the one `ies` plural in the whole vocabulary, and R7's singularization is the only thing standing between it and a type called `strategie`. This step is here to see that it does not.

- [ ] **Step 5: Run the full suite**

```bash
npm run verify; echo "exit: $?"
npm run test:instance; echo "exit: $?"
npm run test:instance-checks; echo "exit: $?"
npm run test:rules; echo "exit: $?"
sh conventions/conventions-check; echo "exit: $?"
```

Expected: all five pass, exit 0 each.

- [ ] **Step 6: Commit**

```bash
git add core/strategy-schema.md lib/checks.mjs
git commit -m "$(cat <<'MSG'
A strategy is the route, and the route is a choice somebody made

An objective says what must become true and leaves every way of getting there equally
defensible. What a reader arriving later needs is the reason this way was taken and not the
other one, which is the thing that goes unwritten and then gets re-opened every quarter.

So the page carries what it forecloses and what would show it working, beside the approach
itself: a strategy that rules nothing out is a wish, and one whose measure only lands at the
horizon judges the choice after it is too late to change it. It cites the objectives it serves
and the values that kept the route honest, which is the citation the value schema has promised
since the first release.

Verified: npm run verify, the three test suites and the prose check pass.
MSG
)"
```

### Task 3: The example gains one objective and one strategy

**Files:**

- Create: `example/model/strategic-objectives/support-stops-explaining-invoices.md`
- Create: `example/model/strategies/invoicing-strategy.md`
- Test: `npm run verify`

**Interfaces:**

- Consumes: the schemas from Tasks 1 and 2; the example's existing entities `Local` (source) and `Craftsmanship` (value).
- Produces: nothing later tasks read. This is the worked instance a reader meets at companygraph.io/example.

- [ ] **Step 1: Confirm the names this content references actually resolve**

```bash
cd /Users/rob/git/companygraph/meta-model
head -8 example/model/sources/local.md
head -8 example/model/values/craftsmanship.md
head -6 example/model/vision.md
```

Expected: H1s `# Local`, `# Craftsmanship`, `# Billing nobody has to explain`. The frontmatter written below uses the first two verbatim. If either differs, use what is on disk — R3 references by canonical name and R4 makes a miss an error.

- [ ] **Step 2: Write the example objective**

Create `example/model/strategic-objectives/support-stops-explaining-invoices.md`:

```markdown
---
source: Local
adopted: 2026-01
horizon: 2027-06
---

# Support stops explaining invoices

> A customer who opens an invoice gets the same explanation support would have given, without the call.

## What it makes true

Every number on an invoice names the rule that produced it, in the words the customer's contract
uses, so the question "why is this line 4,200" is answered on the page it appears on. Support
still hears from customers, and what it hears about is their pricing rather than our arithmetic.

We would know it holds by what stops arriving. An explanation ticket is one where the customer
asks how a number was reached and nothing about the number is wrong; those are countable today
and they are the measure. The invoice being correct is not what is in question and never was.

What falls outside: a disagreement about what the contract says. An invoice that explains itself
perfectly can still bill something the customer believes they did not buy, and that is a
question for the contract, not for the page.
```

- [ ] **Step 3: Write the example strategy**

Create `example/model/strategies/invoicing-strategy.md`:

```markdown
---
source: Local
adopted: 2026-01
serves:
  - Support stops explaining invoices
upholds:
  - Craftsmanship
---

# Invoicing Strategy

> The invoice is rendered from the pricing rules themselves, so its explanation is generated rather than written.

## The approach

We keep the pricing rules as data the billing run reads, rather than code it executes: one rule
per pricing term, named in the words the contract uses, versioned with the contract it belongs
to. A line on an invoice carries the id of the rule that produced it, and the explanation a
customer reads is rendered from that rule and the inputs it saw. One run produces both the
number and the sentence about the number, which is what keeps them from drifting apart.

Where a rule cannot express a term, we renegotiate the term or we grow the rule language.
Neither is quick, and choosing that over a manual adjustment is the whole of this strategy.

## What it rules out

We never add a manual adjustment line. An invoice that anyone can add a number to is an invoice
that cannot explain itself, and every exception granted teaches the next team to ask for one. We
never write the explanation by hand after the fact, however well written it would be: a sentence
maintained beside a number is a second copy of a rule, and it goes stale on the first pricing
change nobody remembers to follow. And we keep no per-customer pricing code, which is the fast
way to win one deal and the slow way to lose the ability to explain anything.

## What would show it is working

We watch the share of invoice lines whose rule id is missing, which is countable on every run and
should fall to nothing. Then the share of explanation tickets in support's queue, which moves
later and is read monthly. The first number moves within a sprint of any pricing change, which is
what makes it worth watching — by the time the second one moves, the change that broke it is
months old.
```

- [ ] **Step 4: Run verify and the prose check**

```bash
npm run verify; echo "exit: $?"
sh conventions/conventions-check; echo "exit: $?"
```

Expected: both pass. Verify now holds the two new files to R15 (no undeclared frontmatter field) and R16 (`serves` and `upholds` resolve to existing entities).

- [ ] **Step 5: Prove the edges actually landed**

```bash
node -e '
import("./lib/instance.mjs").then(async (m) => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const files = new Map();
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (p.endsWith(".md")) files.set(p.slice("example/model/".length), fs.readFileSync(p, "utf8"));
  });
  walk("example/model");
  const g = m.parseInstance(files, { sub: "model/" });
  const want = g.edges.filter((e) => e.via === "serves" || e.via === "upholds");
  console.log(want.length ? want.map((e) => `${e.via}: ${e.from} -> ${e.to}`).join("\n") : "no serves/upholds edges");
});'
```

Expected: two lines, `serves` from the strategy to the objective and `upholds` from the strategy to the value. Before Task 3 the same command prints `no serves/upholds edges`, which is how you know it is reading the example rather than failing quietly. If a line is missing, the reference does not match the target's H1.

- [ ] **Step 6: Commit**

```bash
git add example/model/strategic-objectives example/model/strategies
git commit -m "$(cat <<'MSG'
Beacon Systems states an objective and the route it took to it

A type a reader cannot see used is a type they have to imagine, and the example is where the
vocabulary is met before anyone writes against it. The fictional company's vision was a billing
nobody has to explain; it now carries what must become true for that, and the one route it
chose.

The objective carries a horizon and the reference instance's will not, so both readings of an
optional date are on a page somewhere. The strategy upholds one value rather than listing them,
which is the writing rule it is there to demonstrate.

Verified: npm run verify and the prose check pass, and both new edges resolve.
MSG
)"
```

### Task 4: Versions, the workflow ref and the README

**Files:**

- Modify: `core/manifest.json` (version 0.19.0 → 0.21.0)
- Modify: `package.json` (version 0.20.0 → 0.21.0)
- Modify: `.github/workflows/instance-check.yml` (`ref: v0.20.0` → `ref: v0.21.0`, and the example pin in the header comment)
- Modify: `README.md` (the `*-schema.md` line in "What is here", the `example/` line, and the Status paragraph)
- Test: `npm run verify`

**Interfaces:**

- Consumes: nothing.
- Produces: the release number `0.21.0`, which Phase 2 vendors and pins in three places.

- [ ] **Step 1: Move both version strings**

```bash
cd /Users/rob/git/companygraph/meta-model
node -e '
const fs = require("fs");
for (const [f, from, to] of [["core/manifest.json", "0.19.0", "0.21.0"], ["package.json", "0.20.0", "0.21.0"]]) {
  const t = fs.readFileSync(f, "utf8");
  if (!t.includes(`"${from}"`)) { console.error(`${f}: ${from} not found`); process.exit(1); }
  fs.writeFileSync(f, t.replace(`"${from}"`, `"${to}"`));
  console.log(`${f}: ${from} -> ${to}`);
}'
grep -n '"version"' core/manifest.json package.json
```

Expected: both report `0.21.0`, and `core/manifest.json` still reads `"shape": 2`.

- [ ] **Step 2: Move the workflow ref, both occurrences**

In `.github/workflows/instance-check.yml` replace `v0.20.0` with `v0.21.0` in two places: the example line inside the header comment, and `ref: v0.20.0` under the checkout step.

```bash
sed -i '' 's/v0\.20\.0/v0.21.0/g' .github/workflows/instance-check.yml
grep -n "v0.21.0" .github/workflows/instance-check.yml
```

Expected: two lines. The comment in that file states the rule this step keeps — the ref and `version` in package.json are set to the tag together before tagging — and a mismatch makes the checker refuse every instance.

- [ ] **Step 3: Update the README's "What is here" block**

Replace the `*-schema.md` lines so the list reads:

```
  *-schema.md      one per type: identity, vision, profile, experience,
                   experience-kind, skill, proficiency-level, value, source,
                   surface, strategic-objective, strategy
```

and the example line:

```
example/           a fictional company, described in those twelve types
```

- [ ] **Step 4: Update the Status paragraph**

In `README.md`, replace the sentence beginning "The current release is 0.19.0" with:

```markdown
remaining core types still ahead. The current release is 0.21.0, the twenty-fifth tag, and at
that release core holds twelve types, one schema each: identity, vision, profile, experience,
experience-kind, skill, proficiency-level, value, source, surface, strategic-objective and
strategy.
```

Keep the rest of the paragraph as it stands. Confirm the ordinal before writing it:

```bash
git tag | wc -l
```

Expected: `24`. The next tag is the twenty-fifth. If the count differs, write the ordinal the count implies rather than the one printed here.

- [ ] **Step 5: Run everything**

```bash
npm run verify; echo "exit: $?"
npm run test:instance; echo "exit: $?"
npm run test:instance-checks; echo "exit: $?"
npm run test:rules; echo "exit: $?"
sh conventions/conventions-check; echo "exit: $?"
```

Expected: all pass. The `release manifest` check in verify is the one holding core at or behind the package; if it fails, the two version strings are out of step.

- [ ] **Step 6: Commit**

```bash
git add core/manifest.json package.json .github/workflows/instance-check.yml README.md
git commit -m "$(cat <<'MSG'
Core is twelve types, and the release is 0.21.0

Two types are new and no existing type changed, so an instance on an earlier release conforms
without touching a page and takes this one by re-vendoring core. The shape is unchanged: what
moved is what the unit contains.

The instance checker's ref moves with the package version because the checker compares its own
version against the pin in an instance's manifest and refuses when they differ. Setting one
without the other leaves every instance failing its gate for a reason that is not theirs.

Verified: npm run verify, the three test suites and the prose check pass.
MSG
)"
```

### Task 5: Push and open the pull request

**Files:** none.

- [ ] **Step 1: Confirm the branch is clean and complete**

```bash
cd /Users/rob/git/companygraph/meta-model
git status --short
git log --oneline main..HEAD
```

Expected: no uncommitted changes, four commits.

- [ ] **Step 2: Push**

```bash
git push -u origin direction-types
```

- [ ] **Step 3: Open the pull request**

```bash
gh pr create --title "Core gains strategic objectives and strategies" --body "$(cat <<'BODY'
Core states a destination and the values held on the way to it, and nothing between. A decision
could be weighed against the vision and against a value, never against what the company is
currently trying to make true — so whatever route it took was defensible, and the reason it took
that one went unwritten.

Two types open the Direction group the first design named and deferred. An objective says what
must become true and can be failed; a strategy says how, names what it forecloses and names what
would show it working early enough to change course. One edge carries the chain and it points
up, from the strategy to the objectives it serves; a second, optional, names the values that
kept the route honest, which is the citation the value schema has promised since the first
release. The example gains one of each, and the spec records what was dropped from the two
schemas this generalizes and why.

Release 0.21.0. Nothing an existing instance carries has to change; it takes this by
re-vendoring core.

Verified: npm run verify, npm run test:instance, npm run test:instance-checks, npm run
test:rules and the prose check pass.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
)"
```

- [ ] **Step 4: Report the check and stop**

```bash
gh pr checks --watch; echo "exit: $?"
```

Report the pull request number and the check result. **Do not merge.** Phase 2 is blocked until the owner merges and pushes the tag `v0.21.0` with a GitHub Release.

---

## Phase 2 — robertblust/mental-model

Repository: `/Users/rob/git/robertblust/mental-model`. **Blocked until `v0.21.0` exists on `companygraph/meta-model`.**

### Task 6: Re-vendor core at 0.21.0

**Files:**

- Create: `meta/core/strategic-objective-schema.md`, `meta/core/strategy-schema.md` (copied, never edited here)
- Modify: `meta/core/manifest.json`, and any other vendored file whose bytes changed
- Modify: `.companygraph/manifest.json` (`tooling`, `core.version`, `core.source`, and the `files` hashes)
- Modify: `.github/workflows/companygraph.yml` (`@v0.20.0` → `@v0.21.0`)
- Modify: `AGENTS.md` (the line reading "core 0.19.0")

**Interfaces:**

- Produces: `meta/core/strategic-objective-schema.md` and `meta/core/strategy-schema.md`, which Tasks 7 and 8 write against, and which the `companygraph-add-entity` and `companygraph-validate` skills read.

- [ ] **Step 1: Confirm the release exists**

```bash
cd /Users/rob/git/robertblust/mental-model
git checkout main && git pull
gh release view v0.21.0 --repo companygraph/meta-model --json tagName,name | cat
```

Expected: the release is there. If it is not, stop — this phase is blocked.

- [ ] **Step 2: Branch**

```bash
git checkout -b direction-types
```

- [ ] **Step 3: Copy core whole from the tag**

```bash
rm -rf /tmp/cg-0210
git clone --depth 1 --branch v0.21.0 https://github.com/companygraph/meta-model /tmp/cg-0210
rm -rf meta/core && cp -R /tmp/cg-0210/core meta/core
ls meta/core
grep -n '"version"' meta/core/manifest.json
```

`/tmp/cg-0210` is used again by Tasks 7 and 8, which run the instance checker out of it. If the clone is gone by then, run this one line again — the checker refuses a pin it is not, so it must be the one from `v0.21.0` and not whatever is in the working copy of the meta-model repository.

Expected: twelve `*-schema.md` files plus `CONVENTIONS.md`, `LICENSE` and `manifest.json`; the manifest reads `0.21.0` and `"shape": 2`.

- [ ] **Step 4: Rewrite the instance manifest**

```bash
node -e '
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const m = JSON.parse(fs.readFileSync(".companygraph/manifest.json", "utf8"));
m.tooling = "0.21.0";
m.core = { version: "0.21.0", shape: 2, source: "fetched:v0.21.0" };
const files = {};
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)
  .forEach((e) => { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : (files[p] = "sha256:" + crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex")); });
walk("meta/core");
m.files = Object.fromEntries(Object.keys(files).sort().map((k) => [k, files[k]]));
fs.writeFileSync(".companygraph/manifest.json", JSON.stringify(m, null, 2) + "\n");
console.log(Object.keys(m.files).length, "files hashed");'
git diff --stat .companygraph/manifest.json
```

Expected: `15 files hashed`, and the diff shows the two new schema entries plus the changed `manifest.json` hash, `tooling`, `core.version` and `core.source`.

- [ ] **Step 5: Move the workflow pin**

The re-sync hazard here is the pattern: `check.yml@` alone also matches the conventions workflow. Anchor on the file.

```bash
sed -i '' 's|meta-model/.github/workflows/instance-check.yml@v0\.20\.0|meta-model/.github/workflows/instance-check.yml@v0.21.0|' .github/workflows/companygraph.yml
grep -rn "@v" .github/workflows/
```

Expected: `companygraph.yml` at `instance-check.yml@v0.21.0`, and `conventions.yml` still at `check.yml@v1.10.0` — untouched.

- [ ] **Step 6: Update the one line in AGENTS.md that names the release**

Replace `core 0.19.0` with `core 0.21.0` in the "What this is" paragraph.

```bash
sed -i '' 's/core 0\.19\.0/core 0.21.0/' AGENTS.md
grep -n "core 0.21.0" AGENTS.md
```

- [ ] **Step 7: Run the checker at the new release**

```bash
node /tmp/cg-0210/bin/check-instance.mjs .; echo "exit: $?"
sh conventions/conventions-check; echo "exit: $?"
```

Expected: the mechanical checks pass, exit 0, and the report names what it did not check. The two new types will appear under "not checked" only if the vendored core carries no schema for them — if they do appear there, the copy in Step 3 was incomplete.

- [ ] **Step 8: Commit**

```bash
git add meta/core .companygraph/manifest.json .github/workflows/companygraph.yml AGENTS.md
git commit -m "$(cat <<'MSG'
Core 0.21.0, and the model may now state where it is going and how

The release adds strategic objectives and strategies and changes no type this instance already
carries, so nothing on any existing page moves. What arrives is vocabulary: two folders this
repository can now populate, and two schemas the add-entity and validate skills read straight
from the vendored unit.

The workflow pin moves with the manifest because the checker compares its own version against
the pin and refuses when they differ.

Verified: the instance checker at v0.21.0 and the prose check pass.
MSG
)"
```

### Task 7: The objective

**Files:**

- Create: `model/strategic-objectives/README.md`
- Create: `model/strategic-objectives/whoever-decides-about-me-decided-from-the-model.md`

**Interfaces:**

- Consumes: `meta/core/strategic-objective-schema.md` from Task 6; the source entity `Local`.
- Produces: the canonical name **Whoever decides about me decided from the model**, referenced verbatim by both strategies in Task 8.

- [ ] **Step 1: Read the schema and the existing folder README pattern**

```bash
cd /Users/rob/git/robertblust/mental-model
cat meta/core/strategic-objective-schema.md
cat model/values/README.md
```

Expected: the schema as written in Phase 1 Task 1, and a README of one heading and one sentence naming the schema the folder is written against.

- [ ] **Step 2: Write the folder README**

Create `model/strategic-objectives/README.md`:

```markdown
# Strategic objectives

One file per objective, written against `meta/core/strategic-objective-schema.md`.
```

- [ ] **Step 3: Write the objective**

Create `model/strategic-objectives/whoever-decides-about-me-decided-from-the-model.md`:

```markdown
---
source: Local
adopted: 2026-08
---

# Whoever decides about me decided from the model

> A client or an employer arrives having read it, and the decision rests on what the model says rather than on what I said in a room.

## What it makes true

The conversation starts in the wrong place today. Someone deciding whether to hire me or to buy
help spends the first hour establishing what I have done, from a CV I wrote about myself, and
the model — which holds the same facts with their evidence attached, and is public — is reached
only if they go looking. When this holds, that hour goes to their company instead, because the
background question was answered before the call.

It holds when the answer survives the check. A claim in the model names the document it rests
on, so a decider can verify it without asking me, and what they verify is the same thing a
search engine and an agent would have told them. That is the whole of the vision, pointed at the
one moment where being true everywhere costs something if it is not.

What falls outside: how many people arrive, and whether they decide yes. This is not a reach
target and no volume makes it truer — a single decision made from the model and against me
satisfies it, and a room full of people who enjoyed the conversation does not. Also outside: the
decisions I make about them. What I need in order to choose well is a different question and
nothing here serves it.
```

- [ ] **Step 4: Validate**

Invoke the `companygraph-validate` skill. It is the R0 agent pass and this repository's agent file requires it before every commit.

Then the mechanical half:

```bash
node /tmp/cg-0210/bin/check-instance.mjs .; echo "exit: $?"
sh conventions/conventions-check; echo "exit: $?"
```

Expected: both pass. The objective's `adopted` is `2026-08`, which R9 allows as `YYYY-MM`, and `horizon` is absent by design.

- [ ] **Step 5: Commit**

```bash
git add model/strategic-objectives
git commit -m "$(cat <<'MSG'
The model is only true everywhere if something gets decided from it

The vision says whoever asks reaches the same answer. It does not say why that matters, and
without the objective under it the answer could be true everywhere and read by nobody at the
moment it counts.

So the objective is the moment: a client or an employer who arrives having read the model, and
decides on what it says. Its boundary is half the page, because an objective about deciders is
one sentence away from becoming a reach target, and a single decision made from the model and
against me satisfies it.

Verified: the validate skill, the instance checker at v0.21.0 and the prose check pass.
MSG
)"
```

### Task 8: The two strategies

**Files:**

- Create: `model/strategies/README.md`
- Create: `model/strategies/ai-strategy.md`
- Create: `model/strategies/go-to-market-strategy.md`

**Interfaces:**

- Consumes: the objective's canonical name from Task 7; the value entities `Decide well over build fast`, `Model it before you build it`, `Build the alternative before making the point` and `Production is the finish line`.

- [ ] **Step 1: Confirm every name the frontmatter will reference**

```bash
cd /Users/rob/git/robertblust/mental-model
grep -h "^# " model/values/*.md model/strategic-objectives/*.md
```

Expected, verbatim: `# Build the alternative before making the point`, `# Decide well over build fast`, `# Grow the people with the platform`, `# Model it before you build it`, `# Production is the finish line`, `# Whoever decides about me decided from the model`. Use these exact strings; R4 makes a miss an error and the capitalization is part of the name.

- [ ] **Step 2: Write the folder README**

Create `model/strategies/README.md`:

```markdown
# Strategies

One file per strategy, written against `meta/core/strategy-schema.md`.
```

- [ ] **Step 3: Write the AI strategy**

Create `model/strategies/ai-strategy.md`:

```markdown
---
source: Local
adopted: 2026-06
serves:
  - Whoever decides about me decided from the model
upholds:
  - Decide well over build fast
  - Model it before you build it
---

# AI Strategy

> Agents draft everything, inside conventions written down first, and I spend my time on the decisions they cannot make.

## The approach

AI drafts and it checks; it never decides and it never publishes. That is the position, and
everything below exists to hold it: the constraint moved from building quickly to deciding
correctly, so the scarce thing is judgment, and judgment is protected by making every decision
leave a written artifact that a person put their name to. A fact enters the model from a
document, never from a model's recall, and nothing goes out under my name that I have not read
against its sources.

Every change starts as a written thing: a brief naming the audience and the facts it may claim,
a spec that keeps the finding that led to the decision, then a plan. Agents draft against those
and against the schemas; I review on the branch, in the diff and on the rendered page. The
conventions the agents work under are themselves files — how we write, how we work with git,
what each repository is — vendored into every repository at a pinned release, so a rule improves
in one place and reaches all of them. Roles are files too: the writer and the translator are
briefs, invoked as subagents, and neither commits.

Checks carry the load I would otherwise carry by reading. An unresolvable reference is an error
rather than a warning, a pin that drifts fails a build, and every validation pass ends by naming
what it did not check — because the failure mode of an agent-written repository is a green check
over an unread claim.

## What it rules out

No agent commits on its own initiative, and no agent merges at all. Work that leaves no artifact
is not done: a decision reached in conversation and never written to a spec will be re-opened,
so the conversation is not where it lives. Nothing is hand-maintained that could be derived — a
second copy of a fact is the thing this model exists to end. No tool enters the chain before the
convention it works under is written, because a tool adopted first sets the rules by what it
happens to do. And no fact reaches a published surface because a model produced it fluently: a
claim arrives from a document or it does not arrive, and an agent that cannot find the document
says so instead of writing around the gap.

## What would show it is working

A change to a published surface that bypassed the path — hand-edited, no spec, no pull request —
is countable in git, and the count is zero. A correction made twice is countable the same way:
if the same fact has to be fixed in two places, a derivation is missing and the model has grown
a second master. Both are visible the week they happen, which is the point; a strategy about how
the work is done cannot wait for the horizon to be judged.
```

- [ ] **Step 4: Write the go-to-market strategy**

Create `model/strategies/go-to-market-strategy.md`:

```markdown
---
source: Local
adopted: 2026-08
serves:
  - Whoever decides about me decided from the model
upholds:
  - Build the alternative before making the point
  - Production is the finish line
---

# Go-to-Market Strategy

> The meta-model is free and stays free; what costs money is help building one, billed by the time it takes.

## The approach

Core, the packs and whatever tooling gets built for them are Apache 2.0 and stay that way. The
company sells one thing — help building an instance, time and material, priced in the open on a
page anyone can read before talking to me. The proof runs ahead of the pitch: my own company is
described in the vocabulary I am selling, published, and checked by the same gates I would put
on a client's.

The route to a decider is writing rather than outreach. The spec that records a decision, the
film made from the model's own files, the podcast episode, the site: each is the alternative
built before the point is made, and each is also what a search engine and an agent find when
someone asks what this is. Nothing is held back to be revealed in a call, because a fact
revealed in a call is a fact the model did not carry.

## What it rules out

No license change on core, ever, and no feature held back to make a paid tier — an open core
that becomes a funnel teaches every reader to expect the turn, and they are right to. No
fixed-price engagement: the work is deciding what a company's model should say, which is not
estimable, and a fixed price buys a scope guess instead of a decision. No selling tooling before
an instance that is not mine runs on it. And no gated documentation — a schema behind a form is
not a published meta-model, and a reader who has to trade an address for the rules has already
learned what the rules are worth.

## What would show it is working

People reach past the front page. A spec, the example instance or the billing page read without
anyone being sent there is countable in the logs, and it is the earliest sign that the writing is
doing the work outreach would otherwise do. The second sign is a question that stops being asked:
nobody opens by asking what it costs, because the page said. Both move weeks before any decision
does, which is what makes them worth watching — the decision itself is the objective's business,
not this strategy's.
```

- [ ] **Step 5: Validate**

Invoke the `companygraph-validate` skill, then:

```bash
node /tmp/cg-0210/bin/check-instance.mjs .; echo "exit: $?"
sh conventions/conventions-check; echo "exit: $?"
```

Expected: both pass, and the checker resolves six new edges — two `serves` and four `upholds`.

- [ ] **Step 6: Prove every reference resolves before committing**

```bash
node -e '
const fs = require("node:fs"), path = require("node:path");
const names = new Set();
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
  const p = path.join(d, e.name);
  if (e.isDirectory()) return walk(p);
  if (!p.endsWith(".md") || p.endsWith("README.md")) return;
  const h1 = fs.readFileSync(p, "utf8").match(/^# (.+)$/m);
  if (h1) names.add(h1[1].trim());
});
walk("model");
console.log(names.size, "canonical names");
let bad = 0;
for (const f of fs.readdirSync("model/strategies").filter((f) => f.endsWith(".md") && f !== "README.md")) {
  const fm = fs.readFileSync(path.join("model/strategies", f), "utf8").split("---")[1] ?? "";
  for (const ref of [...fm.matchAll(/^\s+- (.+)$/gm)].map((m) => m[1].trim())) {
    const ok = names.has(ref);
    if (!ok) bad++;
    console.log(ok ? "ok  " : "MISS", f, "->", ref);
  }
}
process.exit(bad ? 1 : 0);'; echo "exit: $?"
```

Expected: a count of canonical names in the low hundreds, then six `ok` lines and exit 0 — two `serves` and four `upholds`. A `MISS` means the reference does not match a canonical name exactly; fix the reference, never the target, because the target's H1 is the name every other page already uses.

- [ ] **Step 7: Commit**

```bash
git add model/strategies
git commit -m "$(cat <<'MSG'
Two routes to the same objective, and what each one refuses

The objective says a decider arrives having read the model. Two things have to be true for that
and they are different work: the model has to be good enough to decide from, and a decider has
to reach it at all. So there are two strategies and they name the same objective, which is what
the array on serves is for.

Each says what it forecloses, because that is the half a reader cannot infer. The AI strategy
states its position before its mechanics — AI drafts and checks, never decides and never
publishes — and the mechanics then read as enforcement rather than as tooling preference. The
governance a larger company needs is not claimed here; it sits in the profile's skills with its
evidence, where it is true.

Verified: the validate skill, the instance checker at v0.21.0 and the prose check pass, and all
six references resolve.
MSG
)"
```

### Task 9: Push and open the pull request

- [ ] **Step 1: Push and open**

```bash
cd /Users/rob/git/robertblust/mental-model
git status --short
git push -u origin direction-types
gh pr create --title "The model says where it is going and how it intends to get there" --body "$(cat <<'BODY'
Core 0.21.0 adds strategic objectives and strategies. This takes the release and populates both
folders for the first time.

The objective is the moment the vision pays for itself: a client or an employer who arrives
having read the model, and decides on what it says rather than on what was said in a room. Half
its page is its boundary, because an objective about deciders is one sentence away from becoming
a reach target. Two strategies serve it — the AI strategy, which is how the model becomes good
enough to decide from, and the go-to-market strategy, which is how a decider reaches it at all.
Each names what it rules out and what would show it working early enough to change course.

Nothing on an existing page moves. The vendored core, the manifest hashes and the workflow pin
move together, as they must.

Verified: the validate skill, the instance checker at v0.21.0 and the prose check pass.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
)"
gh pr checks --watch; echo "exit: $?"
```

- [ ] **Step 2: Report and stop**

Report the pull request number, the check result, and the merge commit the owner will need for Phase 3. **Do not merge.**

---

## Phase 3 — companygraph/companygraph.github.io

Repository: `/Users/rob/git/companygraph/companygraph.github.io`. **Blocked until Phase 1 is merged.** It does not wait for Phase 2: this site pins the meta-model, not the instance, so the merge commit is all it needs.

This phase exists because the plan originally left it out, and the omission was load-bearing. `example/` was written so that a reader meets the two new types at companygraph.io/example, which is what the spec says the example is for — and the site draws that page from a pin of its own. Without this phase the example ships invisible.

### Task 10: Re-pin companygraph.io onto the release

**Files:**

- Modify: `source.json` (the `commit`)
- Modify: `example.json` and `model.json` (regenerated, committed)
- Modify: `package.json` and `package-lock.json` (the parser pin)

**Interfaces:**

- Consumes: the merge commit of Phase 1 on `companygraph/meta-model`'s `main`.

- [ ] **Step 1: Read what is about to move**

```bash
cd /Users/rob/git/companygraph/companygraph.github.io
git checkout main && git pull
cat source.json
```

The pin is `238ee354...`, which predates v0.17.0. This is a twenty-four-commit jump, not a one-release one: the `surface` type, the Also-at work, the tagline change and these two types all arrive at once. Treat the artifact diff in Step 4 as something to read, not to wave through.

- [ ] **Step 2: Branch and take the merge commit**

```bash
git checkout -b direction-types
gh api repos/companygraph/meta-model/commits/main --jq .sha
```

Confirm it is Phase 1's merge commit and not a later one.

- [ ] **Step 3: Move both pins**

```bash
node -e '
const fs = require("fs");
const s = JSON.parse(fs.readFileSync("source.json", "utf8"));
s.commit = process.argv[1];
fs.writeFileSync("source.json", JSON.stringify(s) + "\n");
console.log(s);' <THE_SHA>
sed -i '' 's|meta-model#v0\.20\.0|meta-model#v0.21.0|' package.json
npm update companygraph-meta-model
grep -n "meta-model" package.json source.json
grep -A3 '"node_modules/companygraph-meta-model"' package-lock.json
```

Replace `<THE_SHA>` with the sha from Step 2. Both pins move together here, unlike blust.ch: this site parses `core/` as well as `example/`, so the parser and the content it parses should be the same release.

- [ ] **Step 4: Rebuild and read the diff**

```bash
npm ci
npm run build; echo "exit: $?"
git diff --stat example.json model.json
```

Expected: `model.json` gains the two new types and every schema change since v0.17.0; `example.json` gains the objective and the strategy and whatever the intervening releases added to Beacon Systems. Read the diff. A type or an entity appearing that nobody designed a page for is exactly what a jump this size surfaces, and the next step is where it shows.

- [ ] **Step 5: Run the site's checks**

```bash
npm run build:check; echo "exit: $?"
npm run pages:check; echo "exit: $?"
npm run test:build; echo "exit: $?"
npm run og:check; echo "exit: $?"
npm run verify; echo "exit: $?"
npm run pin:check; echo "exit: $?"
sh conventions/conventions-check; echo "exit: $?"
```

All must exit 0. If `pages:check` fails, a committed page no longer matches what the build produces — run `npm run pages` and commit the result with the rest.

- [ ] **Step 6: Look at both pages**

```bash
python3 -m http.server 8000 &
open http://localhost:8000/example/
open http://localhost:8000/model/
```

Confirm by eye: `/example/` shows Beacon Systems with a strategic objective and a strategy, the strategy's `serves` and `upholds` edges drawn; `/model/` shows twelve types. Kill the server when done.

- [ ] **Step 7: Commit, push, open the pull request, report and stop**

Write the commit message in the git register, saying what moved and that the pin had been twenty-four commits behind. Then:

```bash
git push -u origin direction-types
gh pr create --title "The site draws the example the current release ships" --body "..."
gh pr checks --watch; echo "exit: $?"
```

Report the pull request number and the check result. **Do not merge.**

**Not in this phase.** The ideas page's counts and the README's "What is here" block are stale on facts this re-pin does not touch, and they are a writer job with the translator after. The re-pin makes the contradiction visible — a page saying eight types beside a `/model/` drawing twelve — so that sweep is owed soon, and it is still not owed here.

## Phase 4 — robertblust.github.io

Repository: `/Users/rob/git/robertblust/robertblust.github.io`. **Blocked until Phase 2 is merged.**

### Task 11: Re-pin blust.ch onto the instance

**Files:**

- Modify: `source.json` (the `commit`)
- Modify: `model.json` (regenerated, committed)
- Modify: `package.json` (the `companygraph-meta-model` pin, if the owner wants it moved)

**Interfaces:**

- Consumes: the merge commit on `robertblust/mental-model`'s `main` from Phase 2.

- [ ] **Step 1: Branch and take the merge commit**

```bash
cd /Users/rob/git/robertblust/robertblust.github.io
git checkout main && git pull
git checkout -b direction-types
gh api repos/robertblust/mental-model/commits/main --jq .sha
```

Note the sha. Confirm it is the merge commit of Phase 2's pull request, not a later one.

- [ ] **Step 2: Move the pin**

```bash
node -e '
const fs = require("fs");
const sha = process.argv[1];
const s = JSON.parse(fs.readFileSync("source.json", "utf8"));
s.commit = sha;
fs.writeFileSync("source.json", JSON.stringify(s) + "\n");
console.log(s);' <THE_SHA>
```

Replace `<THE_SHA>` with the sha from Step 1. Then confirm the file still reads as one line of JSON in the shape it had.

- [ ] **Step 3: Regenerate the model**

```bash
npm ci
npm run model; echo "exit: $?"
git diff --stat model.json
```

Expected: `model.json` gains three entities and their edges. The diff is reviewable because the file is pretty-printed; read it and confirm the three new entities are the objective and the two strategies and that nothing else moved.

- [ ] **Step 4: Run the site's checks**

```bash
npm run model:check; echo "exit: $?"
npm run pages:check; echo "exit: $?"
npm run test:build; echo "exit: $?"
npm run og:check; echo "exit: $?"
npm run verify; echo "exit: $?"
sh conventions/conventions-check; echo "exit: $?"
```

Expected: all pass. `pages:check` is the one that would catch a page whose committed copy no longer matches what the build produces — if it fails, run `npm run pages` and commit the result with the rest.

- [ ] **Step 5: Look at the stage**

```bash
python3 -m http.server 8000 &
open http://localhost:8000/model/
```

Confirm by eye: the two new type bands appear, the strategy cards show their `serves` and `upholds` edges, and the objective sits where a reader can reach it. Kill the server when done. Nothing on this page was written for these types, which is the claim being checked.

- [ ] **Step 6: Decide the parser pin**

`package.json` pins `companygraph-meta-model` at `github:companygraph/meta-model#v0.20.0`. The parser is unchanged in 0.21.0, so nothing in `model.json` depends on moving it, and a pin that is behind is intent until the owner says otherwise. Moving it keeps the family on one release and costs nothing.

Recommended: move it, in this same commit.

```bash
sed -i '' 's|meta-model#v0\.20\.0|meta-model#v0.21.0|' package.json
npm update companygraph-meta-model
npm ci && npm run model:check; echo "exit: $?"
```

Expected: `model.json` is unchanged by the newer parser — if `model:check` fails after this, the parser did change and that is a finding worth reporting before going further.

If the owner prefers pins to move only when they must, skip this step and say so in the pull request.

- [ ] **Step 7: Commit**

```bash
git add source.json model.json package.json package-lock.json
git commit -m "$(cat <<'MSG'
The site draws the objective and the two strategies

The model gained a strategic objective and two strategies at core 0.21.0. This moves the pin to
the commit that carries them and regenerates the file every page on this site is built from.

No page changed. The stage and the model page are generic over types, which is what a re-pin is
supposed to demonstrate: vocabulary arrives and the site draws it without being told how.

Verified: npm run model:check, pages:check, test:build, og:check, verify and the prose check
pass.
MSG
)"
```

- [ ] **Step 8: Push, open the pull request, report and stop**

```bash
git push -u origin direction-types
gh pr create --title "The site draws the objective and the two strategies" --body "$(cat <<'BODY'
The model gained a strategic objective and two strategies at core 0.21.0. This moves source.json
to the commit that carries them, regenerates model.json and moves the parser pin to the same
release.

No page changed and no rendering code was written. The stage and the model page are generic over
types, so new vocabulary arrives and is drawn — which is the thing worth checking on this pull
request, on the rendered page rather than in the diff.

Verified: npm run model:check, npm run pages:check, npm run test:build, npm run og:check, npm run
verify and the prose check pass.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
)"
gh pr checks --watch; echo "exit: $?"
```

Report the pull request number and the check result. **Do not merge.**

---

## What changed while this ran

A plan is a record of what was intended, and two things here were wrong by the time the work finished. Both are corrected above rather than left for the next reader to discover.

**One strategy, not two.** The plan wrote a go-to-market strategy beside the AI strategy, and the owner removed it before it shipped. Two reasons, both worth keeping. It contradicted its own instance: companygraph.io/billing says "Nothing is being sold today, and it may never be" and "There is no rate, and nobody to ask for one", where the strategy claimed a company that sells and prices in the open, and its earliest measure was traffic in logs that do not exist because nothing in the family runs analytics. And it treated CompanyGraph as the business while GuestGraph is an equally unfinished idea, which is a choice between two ideas that the model had no business making. Task 8's text below still writes both; what shipped is the first.

**`npm install --package-lock-only` does not re-resolve a git dependency.** It leaves the previous commit's sha in the lockfile while `package.json` names the new tag, so the build runs the old parser while every visible pin claims otherwise — and nothing catches it, because `model:check` and `build:check` compare the artifact against what the *current* parser produces, which makes a stale parser produce a self-consistent wrong answer. Caught on companygraph.io. Both re-pin tasks now say `npm update` and both ask for the lockfile to be grepped as proof.

**The surviving strategy was also renamed**, from `AI Strategy` to `Model-First Strategy`: the instance already carries a skill whose H1 is `AI strategy`, and `parseInstance` refuses a name two types carry, so the model built only because of one capital letter.

## What this plan does not do

- **companygraph.io's prose** is untouched. Its ideas page and README carry stale type counts from earlier releases, and correcting them here would put unrelated changes in these pull requests. That sweep is its own work, with the writer and translator roles. Its *pin* is Phase 3 and is not optional: the example exists to be read on that site.
- **No German.** No page in this work carries a `-de` attribute; the translator is not invoked. If the site later renders these types in a page that carries German, that is when the translator runs.
- **`kpi` stays deferred.** A measure earns a type when something reads it on a schedule. Until then the strategy's `## What would show it is working` carries it as prose, which the spec's §9 records as the weaker arrangement it is.
