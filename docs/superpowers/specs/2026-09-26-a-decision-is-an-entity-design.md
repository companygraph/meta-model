# A decision is an entity

A company decides things every week and writes the call down, when it writes it down at all, in the spec that carried it, the pull request that merged it, the contract that bound it or the head of whoever made it. The talk "Building fast is solved. Deciding well is not." counted the decisions its specs record and had to say on the slide that the model has no type for one, so the count was a reading of prose. Core gains three types: `decision`, one file per call the company made, holding what was decided, what the question was, the options that lost and why, and what the call committed the company to; `decision-kind`, the instance's own set of sorts of call, as experience kinds are; and `decision-status`, the instance's own set of states a call can be in, because the states carry definitions and a set whose members carry a definition is a type, not an enum (R8). The first decisions are seeded in all three instances: the career break and the architect role in the reference instance, and the architectural and commercial calls the two product instances already argue from.

Status: decided by the owner on September 26, 2026, one question at a time. The seat that made the call is a required reference to a role, never a person, rather than prose or nothing. The state of a call is a type the instance defines, `decision-status`, rather than an enum in the schema or a status derived from what supersedes it; a later decision still names what it replaces. The file is named as an experience is, the year of the call and a chosen slug, so the folder reads as a log, which was the recommendation and stood unopposed. The kinds and the first-round decisions listed under The instances go in as listed.

## Where this comes from

The nearest published shape is the architecture decision record, which since Michael Nygard's 2011 note holds a title, a status, a context, the decision and its consequences, and in its later forms a list of the options considered. Its status is a fixed set, proposed, accepted, deprecated, superseded, and every team that adopts it redefines the set; the proposed state is the one this meta-model keeps in every instance's first round, because a call written before it is made is what lets it be argued. Its scope is architecture. What this meta-model wants is the same record for any call a company makes, a hire, a price, a market, a period of someone's life, with the status set the company's own.

The reference instance holds the value "Decide well over build fast": the decision is written down before the code, with the alternatives that lost and why, so the next person can disagree with a reason rather than a rewrite. That sentence is the schema. The alternatives are required and each carries why it lost, and the reasoning is a section of its own, because a call stated without its reasons is a fact and not a decision.

The meta-model already holds two things a reader might take for decisions, and the type is drawn against both. A strategy is a standing route toward an objective, deleted when replaced because the model states the route currently taken; a decision is a dated call, kept as written for as long as the company exists, because what was decided on a date does not stop having happened. A strategy is usually the outcome of several decisions, and a decision may name the strategy it produced. The achievement kind "Decisions" in the example groups bullets inside a period, a person's claim to have made a call; the decision entity is the company's record of the call itself, and a bullet may say in prose that it made one.

## The types

All three are owned by nothing and sit in the container. A decision bears on entities of every type and owner and belongs to none of them, as a question does. A kind and a status are referenced by every decision, so each sits at the root beside `experience-kinds/`, and the set of each is the instance's own: which sorts of call a company distinguishes, and which states it lets a call be in, are facts about that company, and a kind or a status arriving later is one file in the instance rather than a release of this metamodel.

### The kind

```markdown
# Decision Kind Schema

> Required structure for decision kind files.

## File Location

`model/decision-kinds/*.md`

A kind owns nothing and nothing owns it: many decisions claim the same few, and what each kind means lives here rather than being restated on every call. The set is the instance's own, as an experience kind's is.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Label]` | Yes | The canonical name. Every decision references this exact string. |
| `> [Summary]` | Yes | One-paragraph summary of what the kind covers |
| `## What it means` | Yes | Which calls belong to this kind, and which do not |
```

Purpose, as the schema will say it: a kind answers "what sort of call is this?", the question a reader cannot otherwise ask of a folder that holds a hire, a license and a data model side by side. Its value is that the answer is a reference rather than a word, so two decisions of one kind mean the same sort of thing and a page can draw the calls of one kind together.

Writing rules: `## What it means` is written so that two readers filing the same call would file it under the same kind, and it says what the kind excludes, since the boundary with the kind beside it is where every disagreement will be. A kind is about the sort of call, never about how large it was or how it turned out. It is named for what the calls are, `Architecture`, `Career`, and never for the section or the type they sit in. No rank: kinds never order anything inside a page.

### The status

```markdown
# Decision Status Schema

> Required structure for decision status files.

## File Location

`model/decision-statuses/*.md`

A status owns nothing and nothing owns it: every decision carries one, and what each state means lives here rather than in a token whose meaning every reader guesses. The set is the instance's own: which states a company lets a call be in is a fact about the company.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Label]` | Yes | The canonical name. Every decision references this exact string. |
| `> [Summary]` | Yes | One-paragraph summary of what the state means |
| `## What it means` | Yes | When a call is in this state, when it leaves it, and what a reader may rely on while it is |
```

Purpose, as the schema will say it: a status answers "is this call made, and does it still hold?" for someone about to act on it. A decision file is never rewritten to say something else, so the status is the one thing on it that moves, and what each state licenses a reader to do is written once here.

Writing rules: `## What it means` says what a reader may rely on, a proposed call is not acted on, a standing call is, a replaced one is read through the decision that replaced it, and how a call leaves the state. An instance has one status for a call that holds as written, and every other status says which decision or event moves a call into it. A status is about whether the call is made and holds, never about how well it went.

### The decision

```markdown
# Decision Schema

> Required structure for decision files.

## File Location

`model/decisions/*.md`

Nothing owns a decision and a decision owns nothing: a call bears on entities of every type and belongs to none of them. The filename is not the slug of the H1, which is what R12 does by default. It is the year in `decided`, then a `-`, then a slug naming the call, chosen as an experience's is: `2026-architect-role.md`, `2026-vendored-core.md`. The folder then sorts as a log and reads as one. The year must be the year in `decided`, the rest must be a slug by R12, and the two together must be unique in the folder.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |
| `decided` | Yes | date | When the call was made, not when it was carried out. For a call still proposed, when it was put forward. |
| `kind` | Yes | ref → decision-kind | What sort of call this is, the H1 of a file in `decision-kinds/` |
| `status` | Yes | ref → decision-status | Whether the call still holds, the H1 of a file in `decision-statuses/` |
| `by` | Yes | ref → role | The seat that made the call, the H1 of a file in `roles/`. Never the person: who held the seat on that date is the profile's. |
| `serves` | No | array of ref → strategic-objective | The objectives this call was made for, each the H1 of a file in `strategic-objectives/` |
| `upholds` | No | array of ref → value | The values the call was weighed against, each the H1 of a file in `values/` |
| `supersedes` | No | array of ref → decision | Earlier calls this one replaces, each the H1 of a file in `decisions/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Decision]` | Yes | What was decided, stated as a call. Everything references the decision by this exact string. |
| `> [Statement]` | Yes | One paragraph: the call, in the company's own first person |
| `## The question` | Yes | What had to be decided, and why it had to be decided then |
| `## Alternatives` | Yes | Table. The options that lost, one row each; its columns are declared below. |
| `## Why` | Yes | What turned it: the reason the chosen option won, in the terms the call turned on |
| `## Consequences` | Yes | What the call committed the company to, what it gave up, and what has to stay true for the call to stay right |
| `## Bears on` | No | Table. The entities the call made, changed or ended; its columns are declared below. |
| `## References` | No | Table. What a reader can check the call against; its columns are declared below. |

`## Alternatives` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Option` | Yes | string | The option, stated as the call it would have been |
| `Why not` | Yes | string | What taking it would have cost, in one or two sentences |

`## Bears on` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Type` | Yes | string | The type of the entity this row names, as its schema is named: `product`, `experience` |
| `Entity` | Yes | ref → by Type in Owner | The entity the call bears on, by its canonical name |
| `Owner` | No | string | Where `Type` is an owned type, the entity that owns this one, by its canonical name; blank otherwise |
| `How` | No | string | What the call did to it: made it, changed it, ended it |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document, a specification, a contract, a pull request, a slide |
| `URL` | Yes | string | Where it is |
```

Purpose, as the schema will say it: a decision is a call the company made on a date, written with the options that lost, so that whoever arrives after it can disagree with a reason rather than a rewrite. It answers "why is it this way and not the other way, who decided, and does it still hold?" for someone about to re-open a question that was already closed, or about to act on a call that no longer stands. It is not a strategy, which is the route currently taken and is deleted when replaced; a decision is kept as written for as long as the company exists, and its status says whether it holds.

Writing rules:

- The H1 states what was decided, never the topic: "Core is vendored at a named release", not "Core distribution". A reader who sees only the name knows the call.
- The statement is a call a reasonable company could have made differently. If no company would have chosen otherwise, it describes the work rather than deciding anything.
- `## The question` names what had to be decided and what made it have to be decided then, a deadline, an offer, a finding, and states no reason for the answer; the reasons are `## Why`.
- `## Alternatives` carries at least one row, and never the option taken. `Why not` names what the option would have cost, in the terms the call turned on, not that it was worse.
- `## Why` gives the reason the chosen option won, concretely enough that a reader could tell whether it would still win today. A reason that would equally support any of the alternatives supports none.
- `## Consequences` names what the company is now committed to and what it gave up, and states what has to stay true for the call to stay right, because that is what a reader watches for.
- `decided` is the date the call was made, at the precision the source states, never the date it was carried out. A call still proposed carries the date it was put forward, and takes the date of the call when its status leaves the proposed state, the file renamed where the year moved.
- `by` names the seat, never the person, as a role is person-neutral. In a company of one that is one seat; in a company of more it is the seat that answered for the call, and a call that several seats made names the one that would have had the last word.
- `upholds` names a value only where it actually turned the call. A value that would be cited by any call the company makes tells a reader nothing.
- `serves` names an objective only where the call was made for it; a call that serves no written objective is still a decision, and gains no invented one.
- A decision names the objective it serves, never the strategy it follows: which route a call sits on is read from the strategy that serves the same objective, and a strategy the call produced or changed is a `## Bears on` row.
- Every row of `## Bears on` names an entity the call made, changed or ended. An entity the call merely mentions is not borne on.
- A decision is not rewritten to say something else. `status` is the one field that moves, and `decided` with it once when a proposed call is made; what replaced the call is read from the later decision's `supersedes`, and a call that another supersedes carries the status the instance keeps for a replaced call. Where a call is dropped and nothing replaced it, one dated sentence closing `## Consequences` says so.
- Written in the company's own first person, "I" for a company of one, "we" otherwise, and the same one throughout the instance.
- Names and prose are American English (R14).

`## Alternatives` and `## Why` are required, because they are what tells a decision from a fact, and a decision without them is the announcement the type exists to replace. `## Bears on` is optional, because a call about the company as a whole, its license, its market, may bear on no single entity, and a table forced onto it would name whatever was nearest.

## What was left out

A status derived from `supersedes`, which was the first proposal: taken where nothing supersedes a call, revised where something does. The owner chose a status the instance defines instead, because a company's states are its own, a call can stop holding without being replaced, and a set whose members need a sentence each is a type by R8. `supersedes` stays, because which decision replaced this one is a reference and a status cannot carry it.

A `decided-by` profile. The seat is what answers for a call, and naming the person would make every decision a claim about someone that outlives their holding the seat.

A strategy field, `follows` or `under`. The `## Bears on` table names a strategy where a call produced or changed one, and a field beside it would state the same edge twice.

An objective field was left out of the first round on the same reasoning, and came back the same day as `serves`, optional, mirroring a strategy's: the reference instance's proposed first CAS is made for the objective of a master's in AI leadership, and `## Bears on`, which names what a call made, changed or ended, could not say so without bending its rule. A decision names the objective and never the strategy, for the reason above.

A `## Since` section for what happened after. What happened after a call is the next decision, or the period that carried it out, and both are entities that can name this one.

## The tooling

Every field is written in vocabulary that exists, `ref`, `array of ref`, `date`, `string`, a `ref → by Type in Owner` column as a question has one, a What and URL table as an experience has one, so the parser, the Obsidian plugin, the MCP server and the chat read the three types from their schemas. `array of ref → decision` is a type referencing its own, as a KPI's `read-with` does.

The one list that names the types is `TYPES` in `lib/checks.mjs`, which states each type's folder rather than deriving it; it gains three rows: `{ type: "decision-kind", folder: "decision-kinds" }`, `{ type: "decision-status", folder: "decision-statuses" }`, and `{ type: "decision", folder: "decisions", filename: { year: "decided", rest: "chosen" } }`. The filename form is the one `experience` states with `start`; the checker reads the field the row names, and the plan verifies that it does rather than assuming it, because `experience` has been the form's only user.

`core/decision-kind-schema.md`, `core/decision-status-schema.md` and `core/decision-schema.md` are new and `core/manifest.json` moves by a minor. `verify/` gains a test with one fixture per failure the type can make: a `decided` whose year is not the filename's, a `kind` naming no kind, a `status` naming no status, a `by` naming no role, a `supersedes` naming no decision, a `## Bears on` row whose `Type` names no type, an `## Alternatives` table with a column the schema does not declare, and a missing `## Why`; an `## Alternatives` table written as its header row alone passes the mechanical checks, as every table does, and the writing rule is what refuses it; and one clean instance. `verify/check.mjs` holds the three schemas to the fixed shape as it holds the others. `init` writes the three folders' READMEs from the folder names, as it does for every type, and the README's schema list gains the three.

The example instance under `example/` gains two kinds, Architecture and Product, two statuses, Standing and Revised, and one decision, "Billing leaves the monolith", by the seat that made it in the example, with the question "Who split billing out of the monolith?" gaining a row that rests on it, so the instance checks exercise a `ref → by` row pointing at a decision on a real tree.

## The Obsidian plugin

The plugin takes its types and their folders from the package's `TYPES` and every reference's candidates from the schema, so re-pinning `companygraph-meta-model` to this release is what makes New entity offer the three types and create each in its folder, completion offer the kinds for `kind`, the statuses for `status`, the roles for `by`, the values for `upholds` and the decisions for `supersedes`, and the references pane list a decision under its kind, its status, its seat and each decision it supersedes. The one thing to prove is the filename form: New entity writes an experience's filename from `start`, and the plan verifies it writes a decision's from `decided` rather than assuming it. The e2e suite proves it against the reference instance at a pinned commit once that instance is seeded, and the README gains a paragraph on the type, as it has for a question. The plugin takes a minor release, planned in its own repository once this release is tagged.

## The instances

Each instance upgrades its core and seeds its kinds, its statuses and its first decisions in the same pull request. Every instance keeps the same four statuses in the first round, Proposed, Standing, Revised and Dropped, each defined in the instance's own words: Proposed is a call put forward and not yet made, written with its alternatives so it can be argued, and not acted on; Standing is a call that holds as written; Revised is a call another decision supersedes, and is read through that decision; Dropped is a call no longer pursued that nothing replaced, which a proposed call becomes when it is declined. Every decision in the first round is Standing. The seat is `by: Owner` in all three, because the Owner role in each says it produces decisions, recorded where they bind. Each decision's `decided` is read from the entry, the strategy or the spec that records the call, at the precision it states, and the plan names the source for each.

The reference instance, a company of one, defines two kinds. Career: a call about my own path, what to do next, for whom, on what terms. Portfolio: a call about what I build and publish in my own name. Its first four decisions:

- Take four months to answer what I want to do next. Career. The alternatives that lost are applying straight from the last role without the question, and consulting while looking. Bears on the experience Career break.
- An 80% architect role in a product company, chosen over pay. Career. The alternatives are the ones the career-break entry states: two senior engineering roles in finance, one a day from an offer; a hands-on lead role at a higher salary range; and the pure development track, which agents change fastest. Upholds "Decide well over build fast". Bears on the experience Career break, and its `## Consequences` carries the fifth day kept for formal education from 2027.
- Hold the question open on two tracks and let the market answer. Career. The alternative that lost is applying for architect roles only.
- Build the two products in the open during the break. Portfolio. The alternatives are building privately and showing a result, and applying only. Bears on the experiences CompanyGraph and GuestGraph, the two periods the break produced.

The CompanyGraph instance defines three kinds. Vocabulary: what enters core and in what form. Architecture: how the tooling that reads a model is built. Terms: what adopting the meta-model costs and under which license. Its first six decisions, each read from the spec that records it:

- Core is vendored into an instance at a release its manifest names. Architecture. Against resolving core at read time, and against a git submodule.
- The schema written as prose is the only schema. Vocabulary. Against a JSON Schema beside it, and against a schema only a script reads.
- A section is open and a field is closed. Vocabulary. Against both closed, and against both open.
- A reference resolves by its declared type, never by name alone. Vocabulary. Against the first match across types, and against the nearest folder.
- The server only reads, and answers at one named commit. Architecture. Against a write path, and against an embedding index as the way in. Bears on the Read-Only Server Strategy.
- Everything under Apache 2.0, consulting billed by the day. Terms. Against a per-seat license, a per-entry price, and a hosted-only edition. Upholds "Adoption is not taxed".

The GuestGraph instance defines three kinds. Architecture: how the engine and what runs beside it are built. Product: what is built first and for whom. Business: how the project earns. Its first six decisions, each read from the strategy or spec that records it:

- A source record is never edited; the guest is derived from it. Architecture. Against a master record edited in place, and against a CRM-style golden record. Upholds "Store what happened, derive who it was".
- The probabilistic matcher ships switched off. Architecture. Against on by default under a threshold, and against no probabilistic matcher at all. Bears on the Safety-First Strategy.
- Each source system gets its own one-direction connector. Architecture. Against integration code inside the engine, and against a bidirectional sync. Bears on the One-Direction Connector Strategy.
- Apaleo is the first connector. Product. Against a generic PMS adapter, and against a booking engine first. Bears on the product Apaleo Connector.
- Open core under Apache 2.0, paid hosting later. Business. Against a closed SaaS, and against a source-available license. Bears on the Open Core Strategy.
- Billing per arrival. Business. Against per room, per seat, and per profile. Bears on the Per-Arrival Billing Strategy.

The dates, the exact wording of each alternative's cost and each `## Why` are written from the sources at implementation, and each pull request goes to the owner entry by entry, as every editorial change to a model does. Each pull request passes the instance checks with the new core.

## Out of scope

A page on any site that draws the decisions, and the German it would need; a chat index of them; a check that a superseded decision carries the replaced status, which is a join across two types the vocabulary does not declare and the agent pass holds; the 1,360 decisions the talk read out of the specs, which are the specs' and stay there until one is worth a file. Each is a change of its own once something asks for it.

## What it costs

A release of meta-model that every consumer re-pins, as any new type asks, and one row per type in the checker. The order is meta-model's release; then the reference instance upgrades its core and is seeded, because the plugin's e2e vault is that instance; then the plugin re-pins, proves the type in its e2e suite and is released; then the other two instances upgrade and are seeded; then the sites and the MCP hosts re-pin to the seeded commits as they do for any model change. companygraph.io's `/model/` page lists the core vocabulary term by term and gains three rows in that re-pin. A decisions page on the sites is the follow-up the talk asked for, and it is designed on its own once the entries exist to draw.

Verification at the end is the instance checks green on all three instances with the first round seeded, and `get_entity` on one decision from each MCP host returning its `kind`, `status`, `by` and `upholds` edges and the `Bears on` rows resolved.
