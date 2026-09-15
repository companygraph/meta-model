# `strategy` and `strategic-objective` — design

> Core says what a company is, what it refuses to trade away and where it is going, then stops.
> How it intends to get there is held nowhere, so a decision can be weighed against a value and
> against a vision but never against the route chosen to reach it. Two types open the Direction
> group: what must become true, and how.

Status: proposed. Decided on 2026-09-15 against this repository at `837ae8b` and against
`robertblust/mental-model` at `95b82a7`. The two schemas the multi-person instance carries were
read on 2026-09-15; its file counts in §2 were counted, not estimated.

---

## 1. The gap

At 0.19.0 core holds ten types. They answer what the company is — an identity, profiles,
experiences, skills, proficiency levels, experience kinds — what it holds to, where its facts
are mastered, and where it publishes. Two of them speak about direction: `value` says what is
not traded away whatever happens, and `vision` says what future is being worked toward.

Between the vision and the work there is nothing, and the vision schema is the file that says
so: it is "not a plan and not a strategy: it says where, never how, and it holds still while the
ways of getting there change." That sentence draws a boundary and leaves the other side of it
empty. **A model that states a destination and no route cannot be used to weigh the decision a
company actually faces, which is never where to go but which way to go next.**

The reference instance shows the cost. Its vision claims that every surface a reader reaches
derives from one model and that a disagreement is settled by correcting the model. The route
chosen to make that true — modeling the thing before building it, agents drafting against
schemas, the meta-model published open source with consulting as the only paid part — is real,
is being followed, and appears in the model nowhere. It survives in the prose of a website and
in its author's head, which is the arrangement this model exists to end.

The first design already named the fix. Its type table has a Direction group holding `strategy`,
`strategic-objective` and `kpi`, all three with empty notes, deferred until a company needed
them. Two of the three ship here. `kpi` stays deferred: a measure is worth a type when something
reads it on a schedule, and nothing does yet.

## 2. What travels from the multi-person instance, and what does not

The multi-person instance carries both types already — five strategic objectives and two
strategies, each with a schema file of its own — and they are the input to this design rather
than its output. They were written for a company with roles, a governance body and a Confluence
space, and most of what they carry is a fact about that company rather than about the type.

| Element | Decision | Why |
| --- | --- | --- |
| Owner, Governance, Supported By | Dropped | Every one points at a role, and `role` is not a core type. R4 makes an unresolvable reference an error, so the fields cannot be written at all yet. They return as optional fields when `role` ships. |
| State: Draft, In Review, Approved, Deprecated | Dropped | R17 makes the model the master, and the reference instance publishes it. A strategy in the model is one the company is following; a draft is a claim not yet made, and a deprecated one is deleted with git holding the history. |
| Approval Date | Dropped | It records a governance event, which is the thing that has no type here. What is kept is `adopted`, the day the strategy began deciding things. |
| `category`: strategic or non-negligible | Dropped | A prioritization marker for a portfolio of five. An objective that is not strategic does not belong in a folder named for strategic objectives. |
| Expectations Matrix, Tool Recommendations, Cost Governance, Component Overview | Dropped as sections | These are one strategy's content, not the shape a strategy has. A hiring strategy has no lifecycle phases and a pricing strategy recommends no tools. They belong inside the prose of the approach. |
| Principles table | Dropped, replaced by an edge | Core already has `value` for what the company holds to. Two vocabularies for nearly the same thing is how a model rots, so a strategy cites values instead of restating them. |
| Outcome Summary | Kept, reshaped | It becomes the section that says what would show the strategy working, written so it can fail. |
| Source | Kept as core's own | Every core type carries `source` and `source-id`. The Confluence link and sync date are what those fields hold in an instance that syncs. |

What is left is small, and that is the finding rather than a compromise: the parts of those two
files that were about strategy rather than about that company fit in three sections each.

## 3. The chain

`vision` says where and holds still. A `strategic-objective` says what must become true for the
vision to be reached. A `strategy` says how one or more objectives get reached, and is expected
to be replaced while the objective stands.

One edge carries the chain, and it points up: a strategy declares the objectives it serves. The
objective declares nothing about the vision. **There is one vision, so an edge from every
objective to it would be identical on every objective and therefore says nothing**; what the
objective owes the reader is prose stating what is different when it holds, which no edge can
carry.

Pointing up rather than down also decides which file changes. A new strategy is a new file and
nothing else; an objective that listed its strategies would have to be edited every time one
arrived, which puts a fact about the strategy in the objective's history.

The ordering this imposes is deliberate. An objective exists before a strategy can serve it,
because R4 rejects a reference that resolves to nothing. A strategy written first has nothing to
point at, which is the correct complaint to raise about it.

## 4. The schemas

Both in the shape R9 fixes, both a folder type owned by nothing, both named for the slug of
their H1 by R12's default.

### `core/strategic-objective-schema.md`

File location `model/strategic-objectives/*.md`.

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source |
| `adopted` | Yes | date | When this objective began directing the work |
| `horizon` | No | date | By when it should hold, absent where the objective is a standing one |

| Section | Required | Description |
| --- | --- | --- |
| `# [Objective]` | Yes | The canonical name, the objective stated as a phrase. Everything references it by this exact string. |
| `> [Statement]` | Yes | Single-line statement of what must become true |
| `## What it makes true` | Yes | What is concretely different when it holds, and what it does not cover |

**Purpose.** An objective is what must become true for the vision to be reached — the layer
between a direction that holds still and the strategies that change under it. It is one file per
objective so that a strategy can cite the one it serves, and so that the set of them can be read
as the portfolio it is.

**Writing rules.**

- It says what must become true, never by what means. A means is a strategy, and an objective
  that names one has already chosen a route the model cannot then see being chosen.
- It names something the company could fail at. An objective no outcome could contradict is a
  restatement of the vision in longer words.
- `## What it makes true` is concrete enough that a reader could tell whether it holds today,
  and states what falls outside it, because an objective silent on its boundary is read as
  covering everything.
- `horizon` is written only where a real date exists. A standing objective leaves it absent
  rather than inventing one, and an invented horizon is a claim like any other.
- Written in the company's own first person, the same one throughout the instance.

### `core/strategy-schema.md`

File location `model/strategies/*.md`.

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source |
| `adopted` | Yes | date | When this strategy began deciding things |
| `serves` | Yes | array of ref → strategic-objective | The objectives this strategy pursues — the H1 of a file in `strategic-objectives/` |
| `upholds` | No | array of ref → value | The values that constrain the route chosen — the H1 of a file in `values/` |

| Section | Required | Description |
| --- | --- | --- |
| `# [Topic] Strategy` | Yes | The canonical name, ending in "Strategy". Everything references it by this exact string. |
| `> [Statement]` | Yes | Single-line statement of the approach |
| `## The approach` | Yes | How, concretely enough that someone could follow it |
| `## What it rules out` | Yes | The options this choice forecloses |
| `## What would show it is working` | Yes | What is observable, early enough to change course |

**Purpose.** A strategy is how an objective gets reached — one route among routes that could all
have been taken, written so the choice is visible as a choice. The vision says where and is not
expected to move; a strategy says how and is expected to be replaced, which is why it carries
the date it started deciding things.

**Writing rules.**

- The statement is a choice a reasonable company could have made differently. If no company
  would choose the opposite, it is a description of the work and not a strategy.
- `## The approach` names what is actually done: the tools, the cadence, what is automated and
  what deliberately is not. A strategy that could be pursued by any means at all has not chosen
  anything.
- `## What it rules out` names specific foreclosed options, not their absence. "We do not do bad
  work" rules nothing out; "we do not take fixed-price work" can be broken next week.
- `## What would show it is working` states something observable while there is still time to
  change course. A measure that only arrives at the horizon judges the strategy after it is too
  late to matter, which is a verdict and not an instrument.
- It says how, never where. A strategy restating the vision has skipped the objective that was
  supposed to sit between them.
- Written in the company's own first person, the same one throughout the instance.
- `serves` names at least one objective. A strategy serving none is either an objective that was
  not written down or work that nothing in the model asked for.

## 5. Why this shape

**Two types rather than one.** The obvious economy is a single `strategy` type whose prose
states its own goal, and it fails on the thing the model is for: two strategies pursuing one
objective would each state that objective in their own words, and nothing could tell that they
were the same. An objective is a thing more than one page refers to, which by the first
principle makes it an entity with a canonical name.

**Named for the topic, ending in "Strategy".** The H1 is what `serves` and every future
reference reads. A bare topic word collides with the skill or the concept of the same name —
`byName` in the parser rejects a name carried by more than one type — and "AI" is exactly the
word an instance is likely to want for all three. The suffix costs nothing and the collision
would cost a rename.

**One date word for both types.** An objective is set and a strategy is adopted, and writing it
that way would put two words for one idea in one group of the vocabulary. `adopted` reads
correctly for both, and a closed vocabulary that means the same thing in two schemas is what R9
was written to protect.

**`upholds` optional, not required.** Core has promised since the first release that a strategy
can cite a value: the value schema justifies its file-per-entity shape by exactly that, and
without this field the citation could only be prose, which draws no edge. Requiring it would buy
a decorative citation on every strategy that is genuinely constrained by no value in particular.

**No `## Principles` and no `## Tools`.** Principles are values under another name and the model
has values. A tool table would make a tool an entity by implication while nothing references one,
and the first thing that genuinely needs to refer to a tool should be what decides the type.

**No state, considered twice.** The argument for keeping a state field is that a strategy is
drafted before it is adopted and survives after it is retired. The argument against is that this
model is published, and every other core type states what is currently true: a value under
review, an experience marked provisional and a vision in draft are all things core has no way to
say either. Consistency wins, and the instance keeps a draft on a branch, where a draft belongs.

## 6. Parser, checks and the example

**No parser change.** A type is a folder name singularized by R7, and both singularize
correctly: `strategies` ends in `ies` and becomes `strategy`, `strategic-objectives` drops its
`s`. The frontmatter references resolve by the rule every other type's already do, and neither
type declares a table, so nothing in the body resolves.

**Two entries in `TYPES`** in `lib/checks.mjs`, which is what `npm run verify` and the eight
instance checks both read. R9's fixed shape, R15's undeclared-field rejection and R16's edge
drawing all follow from the entry and the schema together, with no code written for either type.

**The example.** Beacon Systems gets `example/model/strategic-objectives/` and
`example/model/strategies/`, one entity each, so the type ships with a worked instance as every
other type does and companygraph.io/example draws it. The strategy serves the objective and
upholds one of the example's existing values, so the two new edges are exercised where a reader
meets them.

## 7. The instance

`robertblust/mental-model` re-vendors core at the release, recomputes its manifest hashes and
writes one objective and two strategies. The objective is **Whoever decides about me decided
from the model**: a client or an employer arrives having read it, and the decision rests on what
the model says rather than on what was said in a room. It is what the instance's vision needs in
order to matter — a model true everywhere costs nothing until something is decided from it — and
its boundary is stated in its own file, because an objective about deciders is one sentence away
from becoming a reach target.

Two strategies serve it: the AI strategy, which is how the model becomes good enough to decide
from, and the go-to-market strategy, which is how a decider reaches it at all. Both naming one
objective is what the array on `serves` is for and what a single-strategy instance would leave
unexercised.

The objective carries no `horizon`. It is a standing one — there is no date by which deciders
start deciding from the model and after which they stop — and the writing rule says an absent
horizon is the honest form for that. The example's objective carries one, so the field ships
exercised and both readings of it are on the page somewhere a reader will meet them.

The AI strategy states its position before its mechanics: AI drafts and checks, never decides
and never publishes. Without that first paragraph the page reads as a list of tooling
preferences, and a reader looking for what its author thinks about AI finds a workflow. The
mechanics then read as what they are, which is enforcement. The position itself is not restated
on the page — it is the two values the strategy upholds, reached by the edge, because a model
whose pages repeat what its edges already say is the duplication this design is against.

What the AI strategy does not claim is the governance a larger company needs: an oversight
principle, a guardrail against internal context reaching an external model, a multi-provider
arrangement, a budget. Those are real and they are the instance author's, and they sit in the
profile's skills with their evidence and their dates. A company of one has no internal context
and no AI budget, so a strategy page claiming to govern them would be the model describing a
company that is not this one.

blust.ch then moves `source.json` to the instance commit and regenerates `model.json`. The
stage and the model page are generic over types and need no rendering change; what moves is the
type count the page states about itself.

companygraph.io's prose is deliberately out of scope. Its ideas page and README already carry
stale counts from earlier releases, and folding their correction into this work would put
changes in a pull request that has nothing to do with them.

## 8. Version

Core goes to **0.21.0** and the package with it. Both types are new and no existing type
changes, so every instance on an earlier release conforms without touching a page; an instance
takes the release by re-vendoring `core/` and recomputing its manifest hashes. `shape` stays 2 —
the layout of the vendored unit is unchanged, only its contents. Core sits at 0.19.0 and the
package at 0.20.0 today, and core may be behind the package but never ahead, so a release that
moves core moves both to the same number.

## 9. What no check reaches

**Whether a strategy is a strategy.** Every writing rule in §4 is read by an agent, not by a
program. That a statement is a choice someone could have made differently, that the approach is
concrete enough to follow, that what is ruled out is specific rather than the absence of a vice
— none of it is mechanical, and a file passing every check can still be a slogan with an
`adopted` date.

**Whether the strategy is the one being followed.** The model can say a strategy was adopted in
September and nothing in the repository can tell that the work stopped following it in November.
That is the same limit `surface` has against a live page, and the same answer applies: the
validation pass reads the model against what is true, and its report is not a file.

**Whether an objective is reached.** `horizon` is a date and nothing compares it to anything.
When `kpi` ships, a measure is what closes that gap; until then the objective's own section is
written so a reader can make the judgment, which is weaker and is stated here rather than
implied.
