# The checks owed

# 254 moved fourteen norms out of the writing rules and into a sentence in their schema's Purpose, because no single page can break them, and #257 lists the checks they are owed. CONVENTIONS now says such a norm is held by an instance check written in the same change that states it (#260). This design builds the fourteen: eleven read the model as it stands, three read what a pull request changed, and three of all fourteen report without failing.

Status: draft, written on October 3, 2026 against this repository at `f45fa42` (package 0.75.0, core 0.55.0), for companygraph/meta-model#257, with the owner's decisions of the same day. After the final review the owner ruled on October 3, 2026 that a name a decision carries follows the entity it names when that entity is renamed or removed, and that a replaced call is held to carry a status other than the one most calls not superseded carry; the paragraphs below state both rulings.

## Two channels

The checker has had one channel: everything it finds fails. Three of the norms are not errors. A role's required skill a person does not claim is a gap the profile schema says is "never an error"; a profile repeating identity's address is a fact in two places, which is worth seeing and not worth blocking; and a passed `horizon` turns true on a date, not on a change anyone made, so failing on it would break a green `main` overnight.

`checkInstance` returns `notes` beside `failures` and `skipped`. `instanceChecks` takes an optional `note` callback beside `fail`, a no-op where a caller passes none, so the callers that run the checks for their names alone, as the MCP server's snapshot does, keep working unchanged. `companygraph check` prints the notes under `noted:` on both a passing and a failing run, and its exit code stays the failures' alone. `list_checks` in mcp-server and the plugin's pane show notes in their own releases; each gets an issue.

## The checks that read the model

Each check is declared on the type it holds, on the entry `TYPES` or `PACKS` keeps for it, the way `labels` and `rank` already are, so no check names a type and one check serves every type that declares the same shape. The declarations' names are the plan's to settle; the shapes are these.

**No relation written on both sides** (fail). Concept `## Relations`, concept design `## Relations` and bounded context `## Relationships` declare that their reference column is written on one side only. For every two distinct entities each of whose tables names the other, the check fails once, naming both pages. Several rows to one target count as one edge; a row naming its own page passes, since it is not two entities naming each other; a cell that resolves to nothing is R4's finding and is skipped. A concept design's and a bounded context's are read within their own context, as R5 confines them.

**A type cell names a design of its own context exactly** (fail). Concept design `## Attributes` `Type` and domain event `## Payload` `Type` are strings that may name a concept design of the same context. A cell is read with backticks stripped and a leading `list of ` removed. It fails where it equals the name of a design in another context and of none in its own, and where it matches a design of its own context only loosely, by case, slug or plural, since the norm says "exactly". An attribute's `Type` that names a design must name one whose `kind` is `value object`: an entity is a `## Relations` row. A cell equal to no design is a plain type and passes.

**An aggregate's root is an entity** (fail). The concept design `root` names, within the aggregate's context, carries `kind: entity`. A `root` that resolves to nothing is R4's.

**A question kind holds at least two questions** (fail). Counted over questions whose `kind` resolves. A kind with fewer than two fails, zero included, unless the instance holds at most one question.

**A rule binds more than one, or a control enforces it** (fail). A rule fails where its `## Applies to` names exactly one distinct entity and no control's `enforces` names it. A rule with no rows applies everywhere and passes, as the rule schema's sections table says; the Purpose sentence says so too.

**A replaced call carries one status, and not the standing one** (fail). With no schema field marking which status means "replaced", the check infers it: the decisions named in any `supersedes` must all carry one status, and where they carry more than one the check fails once, naming each status and its pages. A decision nothing supersedes may share that status, as a call dropped with nothing to replace it may carry the one a replaced call does. Where the replaced decisions' one status is also the status a strict majority of the decisions not superseded carry, it is the status of a call still standing, and the check fails on each replaced page, naming what superseded it. An instance with no `supersedes` has nothing to check.

**A role's required skill a person does not claim** (note). For every profile whose `nature` is `human`, each skill a role in its `roles` `requires` that its `## Skills` table does not name is noted as `gap <profile>: <role> requires <skill>`, once per role and skill. A profile whose `nature` is `agent` claims nothing and is never noted. The validate skill's paragraph on the gap now reads the note instead of producing it.

**A profile repeating identity's address** (note). For every human profile, a `location` equal to identity's, and an `## Also at` URL equal to identity's `url` or to one of identity's `## Also at` URLs, compared without a trailing slash or case, are noted. Mail is excepted: the norm says a mail address is two facts.

**A passed horizon** (note). A strategic objective whose `horizon` period has ended is noted, compared at the horizon's own precision: `2026` from January 1, 2027, `2026-09` from October 1, 2026, a full date from the day after. `checkInstance` and `instanceChecks` take a `today` option, the UTC date where none is given, so tests are deterministic.

## The checks that read a change

These join R18's id check, which `companygraph ids --range <base>..<head>` already runs on every pull request against the pages the range modified or renamed. They are pure functions of those pages beside `idChangesOf`, and the range reads the manifest's packs, so a pack page's type is known.

**A decision is not rewritten and not removed** (fail). Between base and head, a decision page may change its `status` and nothing else: every other frontmatter key and the body compare equal, after an `id` added where the base had none, which is R18's backfill. The one exception is the decision schema's own rule for a dropped call: the change that moves `status` may add one sentence at the end of `## Consequences`, dated, and change nothing else in the body. A decision page deleted in the range fails; the range gains deleted pages for this. `decided` does not move: with no marker for a proposed status, a proposed call made later is a new decision. Whitespace at a line's end and the file's final newline are not a rewrite, as line ends are not. One more change is lawful, so that an entity a decision names can be renamed or deleted at all: a name in a frontmatter field the decision schema declares a reference, or in the reference column of a row of `## Bears on`, follows the entity it names. It may change to the entity's new name where, at the head, no entity carries the old name and the one the new name resolves to carries the R18 `id` the old name resolved to at the base; and it may be removed, with its row, where the entity it named no longer exists at head: no entity carries the old name, and no page carries the R18 `id` the old name resolved to at the base. Nothing else in the field or the row moves with it. The range reads the decision schema the instance vendored, and the model where the branch began and where it ends, to tell.

**A label stays with its rule and is never reused** (fail). For aggregates' `## Invariants` labels and feature designs' `## Scenarios` labels, both already declared as `labels`, a change fails where a label new at head carries the text of a base row whose label is gone (a relabel), where a kept label carries the text another label carried at the base, two that swap or more that rotate, and where a label new at head was carried by the page at any earlier commit (reuse), read from the page's history, which the workflow already fetches whole. A label kept with its text changed passes: that is the rewording the norm allows, and whether a reworded rule is still the same rule is a judgment no comparison makes.

## What changes in core

Two Purpose sentences take the owner's readings. Decision's becomes: a decision is not rewritten and not removed: `status` is the one field that moves, what replaced the call is read from the later decision's `supersedes`, and every call another supersedes carries one status, never the one most calls still standing carry; a name the decision carries follows the entity it names when that entity is renamed or removed, and nothing else moves. Rule's gains that a rule with no `## Applies to` rows applies everywhere and so binds them all. The other twelve sentences stand as written. Core moves to a minor release with them and with the two CONVENTIONS edits of #260 and #261.

## What it does not do

It adds no schema field: the replaced status is inferred, and "proposed" stays unmarked. It does not reach the plugin or mcp-server, which take notes in their own releases. It does not hold a norm whose part no comparison decides: whether a reworded invariant is the same rule, and whether an objective past its horizon was met.

## Today

Run against the three instances on core 0.55.0, the state checks fail nothing. The reference instance's profile is noted twice, its `## Also at` blust.ch and GitHub rows matching identity. No `horizon` has passed and no person lacks a required skill. Run over each instance's merged history, the decision change check would have refused twelve editorial edits to standing decisions, two of them on October 3; under this design such an edit is a new decision that supersedes the old one, and the check reads future pull requests only.

## Order

The spec, then the plan, then the build: the notes channel first, then the state checks, then the change checks, then the core sentences. A release follows, and each instance takes it with `companygraph upgrade`. The issues for mcp-server and the plugin are opened with the build.
