# `process` — design

> Core says what a company is, where it is going, who is in it and what seats it needs filled,
> then stops. Nothing says when a seat acts. A role file can name what it takes and what it
> produces but never what hands it that input or what receives that output, so the model holds
> a company's people and its work and not the path between them. Two types close it: a process
> and the phases it owns, with the gate between phases as the thing the model actually
> enforces.

Status: proposed. Decided on 2026-09-16 against this repository at `c29e8ce` and against `robertblust/mental-model` at `c2fd828`. The multi-person instance's `meta/processes-schema.md` was read on that day for what it carries and what it does not, and the reference instance's five role files were read for the shape a seat already has.

---

## 1. The gap

At 0.24.0 core holds thirteen types. `role-schema.md` names this gap in its own Purpose, in a sentence written when the role shipped: a role "is not a process, which says when the seat acts." The role design's §9 parked `process` by name alongside `kpi`, `rule` and `legal-document`, as one of the types the dropped sections of the multi-person role schema pointed at. This is that type.

The cost is visible in the reference instance. `implementer.md` says the seat takes "a task brief that is the whole of its requirements" and produces "a short status the controller acts on" — and the controller is nowhere. It is referenced twice in that file, in lowercase, as a thing the reader is assumed to know. `reviewer.md` says a finding "is an input to whoever merges", and the model does not say who that is or when. Five seats exist and nothing says what order they act in, what one hands the next, or what has to be true before work moves on.

Worse, the thing the company most reliably does is the thing the model is silent about. **The Owner approves before an agent proceeds** — a design before it is built, a plan before it is worked, a pull request before it is merged. That is the company's central rule, it is enforced on every change, and the model holds no place to write it down.

## 2. What travels from the multi-person instance, and what does not

The multi-person instance carries a process as a folder: a `README.md` with an overview table, a role involvement matrix, terminology and gates, then one file per phase with gate information in frontmatter. The folder shape and the gate frontmatter are the finding and they travel. Most of the rest is one company's furniture.

| Element | Decision | Why |
| --- | --- | --- |
| Folder per process, file per phase | Kept | R5 and R6 already say this: an entity that owns a collection is a folder, and the collection nests inside it. The multi-person instance arrived at the same shape without the rule. |
| Gate frontmatter: `gate_to`, `gate_approvers`, `escalation_authority` | Kept, renamed to hyphens | Machine-readable gates are the point. The reasons given there — precise lookups, names that survive personnel changes, cross-reference checks — are R3 and R4 restated. |
| Role involvement matrix | Dropped, derived | Its columns are the instance's own phase names, so no schema can declare them and no column check can ever run on it. The four levels it encodes become four frontmatter fields on the phase, stated once where the phase is, and a renderer pivots them back into a matrix. A summary table maintained by hand is the thing that goes stale. |
| `process:` and `phase:` in phase frontmatter | Dropped | R2. The H1 is the canonical name and the process is the folder the phase sits in. Restating both is the redundancy R2 exists to prevent, and a phase whose frontmatter disagrees with its folder is a second truth. |
| `State` and `Approval Date` on the process | Dropped | R17 — the model is the master. What is merged is what is true; a `Draft` flag on a merged page says the page is not what it says it is. A company that needs review states to run has a review process, which is a second process, not a field. |
| `## Terminology` | Dropped | Terms belong in the glossary, in one place, not restated per process in whatever words that process happened to use. |
| `## Gates` overview table | Dropped | It explains what a gate is. That belongs in this schema, stated once, not copied into every process file in the instance. |
| `## Target Audience` | Dropped | A table of Role and Benefit is a document about the document. What the process is for is the tagline. |
| `Review Cycle` and `Duration` on a phase | Dropped | A cadence is a fact about one company's calendar. A phase ends when its gate criteria are met, which is what the type is for. |
| `## Automation`, `## Source` as a Confluence link | Dropped | `source` and `source-id` are core's own, and a link to a rulebook is `## References` as on role and experience. |
| Sub-sequence phase letters (`5a`, `5b`) | Dropped | See §10. |

What is left is the shape a reader of the reference instance's role files would recognize, because it is deliberately the same shape: a phase is what it takes, what it produces and what it never does, plus the activities in between and the gate at the end.

## 3. One process, two tracks

The obvious instinct is one process for software and another for prose — the reference instance holds Implementer and Reviewer on one side and Writer and Translator on the other, under separate rulebooks in separate files. Put the two side by side as they actually run and they are the same five steps: the request is classified, a specification is written and approved, the work is decomposed, it is produced and reviewed, and the Owner merges it. Both refuse to start without a specification. Both park questions for the Owner rather than guessing. Both stop at the pull request.

They part company in two places, and only two. A code review is mechanical — a suite passes or it does not, and findings are held against a brief. A prose review is a **language** review: the Owner reads the English, and the German is reviewed by being back-translated, which no check can perform. And the Translator has no counterpart on the other side; producing a second artifact from an approved first is a step only prose has.

So: **one process, two tracks.** A track is the kind of thing being made. It does not change the phases, the gates or who approves them; it changes which seats execute and what the deliverable is. Corrected after the reference instance was written: it can also change the *shape* of a phase's activities, and in Implement it does — the Code track is a loop that dispatches one brief at a time and the Prose track is a linear pipeline. What the two share there is the rule that nothing goes forward unread, which is what that phase's goal now says. Tracks also run together rather than instead of one another; a change that is both code and prose runs down both in one pass. The process declares its tracks in a table, and a phase whose activities differ by track groups them under a heading per track. A phase whose activities are the same for every track — Shape is one — does not mention tracks at all.

This is the claim the type is worth making: a company has one way of working, and what it is making is a detail of the fourth phase. If a third track ever refuses the spine, that is a finding about the company, and the model will say so by failing to hold it.

## 4. Phases are a chain, and the gate is the edge

Five phases in the reference instance's process. Each ends at a gate, and the gate — not the deliverable — is what the type enforces.

| # | Phase | Accountable | What leaves it |
| --- | --- | --- | --- |
| 1 | Shape | Owner | The request classified, and which phases write a document |
| 2 | Spec | Specifier | A specification that is the whole of the requirements |
| 3 | Plan | Planner | Ordered task briefs, each whole on its own |
| 4 | Implement | Controller | Reviewed commits on a branch, checks green |
| 5 | Integrate | Owner | A merged change, and a release where one is due |

**The artifact scales with the change; the gate never does.** A one-line fix passes the Spec gate the same as a new subsystem: the specification may be two sentences in a conversation rather than a committed document, and the Owner still approves it before anything is built. This is why `State` was dropped and why gates were kept. A model that recorded only documents would say a bounded change skipped three phases, which is false. It passed all five and wrote one of them down.

Order is a chain, not a number on a file. Each phase names the phase its gate leads to, the last names none, and the process's `## Phases` list is the authority the chain must agree with. Two places, checkable against each other, rather than an `order` field that can disagree with both.

## 5. The process schema

`model/processes/<process>/<process>.md`. A process owns its phases and cannot be read without them, so it is a folder, as a profile is.

Frontmatter: `source` (Yes, ref → source), `source-id` (No, string), `owner` (Yes, ref → role) — the seat accountable for the process as a whole — and `supported-by` (No, array of ref → role).

Sections, in this order: `# [Process]`, the canonical name; `> [Purpose]`, one line on what the process is for; `## Tracks`, required, a table; `## Phases`, required, an ordered list linking each phase file in order; `## What it never does`, required, a list, one sentence each, each checkable, holding the rules that bind every phase; `## References`, optional, a table with the columns `What` and `URL` as on role.

`## Tracks` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Track` | Yes | string | The kind of thing this track makes |
| `Produces` | Yes | string | What one pass down this track leaves behind |

It declares no reference column, so by the parser's rule it draws nothing and is data — which is correct. A track is defined by what it makes; which seats make it is answered by the phases.

There is no roles section. The multi-person instance's matrix encodes four involvement levels — accountable, approves the gate, does the work, is consulted — and each of them is already a question about one phase. They become four frontmatter fields on the phase in §6, stated once where the phase is, checkable as references, and a renderer pivots them back into the matrix whenever anyone wants to see one. A matrix in the process file would be a second copy of facts the phases already hold, kept in step by hand, and this model has paid for that kind of copy before.

Purpose: a process is the path work takes through the company's seats — one folder, the phases in order, the gate between each pair — and it answers "what happens next, who does it, and what has to be true before it moves on?" for someone doing the work or waiting on it. It is not a seat, which says what one role takes and produces whenever it acts, and it is not a record of work that happened, which is an experience.

Writing rules:

- Person-neutral, as a role is: a process names seats, never who holds them.
- Named for the work, not for the tool that carries it: `Delivery`, not `The Jira board`.
- Each line under `## What it never does` is a sentence an agent can hold a change against.
- A track is named for what it makes, not for who makes it.

## 6. The phase schema

`model/processes/<process>/phases/*.md`, owner declared as `process`. The filename is R12's default, the slug of the H1: `shape.md`, `spec.md`, `integrate.md`.

A position prefix was considered — `1-shape.md`, as an experience carries its start year — and rejected. It would make three places encode the order: the prefix, the `## Phases` list and the `gate-to` chain. That is the duplication the matrix was dropped for two sections ago, and it is worse here, because inserting a phase would rename every file after it. The experience precedent does not carry: a career folder is browsed chronologically and a phase folder is not browsed at all, since the process file lists its phases in order and links each one. The folder sorts alphabetically and nobody reads it that way.

Frontmatter carries the seats, which is where the matrix went:

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered |
| `source-id` | No | string | The identifier this page has in its source |
| `owner` | Yes | ref → role | The seat accountable for the phase's outcome |
| `executed-by` | Yes | array of ref → role | The seats that do the phase's work |
| `supported-by` | No | array of ref → role | The seats consulted, producing nothing the phase is graded on |
| `gate-approvers` | Yes | array of ref → role | The seats that approve passage out of the phase |
| `escalation-authority` | Yes | ref → role | The seat that decides when the gate's criteria cannot be met |
| `gate-to` | No | ref → phase | The phase this gate leads to; absent on the last |

`gate-approvers` is required and non-empty. A phase nobody has to approve is not a phase, it is an activity inside one, and the type refuses to record it as the former. There is no `## Overview` table, because every attribute one would hold is now a reference that R3 and R4 can check, and a key-and-value table is the one table shape that cannot declare a reference column.

Sections, in this order: `# [Phase]`, the canonical name; `> [Goal]`, one line; `## What it takes`, required; `## Activities`, required, a numbered list, or one `### [Track]` heading per track where they differ, each with its own numbered list; `## What it produces`, required, a table of `Deliverable` and `Description`; `## What it never does`, required, a list, one sentence each; `## Gate`, required, the criteria that must be satisfied to leave, as a list, plus what happens when they cannot be.

Purpose: a phase is one step of a process and the gate at its end — what enters, what is done, what leaves, and what must be true for it to leave. It answers "am I done, and who says so?"

Writing rules:

- A gate criterion is a sentence that can fail: "the suite passes on the branch" can, "quality
  is good" cannot.
- A `### [Track]` heading under `## Activities` names a track the owning process declares.
- A phase whose activities are the same for every track carries no track headings.
- `gate-to` names the next phase and the process's `## Phases` list says the same thing; where
  they disagree the model is wrong, not the reader.
- The last phase has no `gate-to`, and its gate is the one that releases the work.
- A phase's name is unique across every phase in the instance, not merely within its process.
  R2 scopes a name to its type and not to its owner, so a company running two processes cannot
  call a phase in each of them `Review`. It may name a phase `Review` while a role of that name
  exists, since a reference carries the type it resolves under and the two never compete. The
  cost falls only between processes, and the fix is to name a phase for what it does in the
  process it belongs to.

## 7. The three seats the process needs

The reference instance holds Owner, Writer, Translator, Implementer and Reviewer. Writing the process out names three seats that have been acting all along without a file.

**Specifier** — takes a shaped request and the model it must not contradict; produces a specification that is the whole of the requirements, with what is explicitly not being done named; never writes the change, never decides scope, never leaves a question unasked because an assumption would be convenient. Requires Requirements engineering, Spec-driven development, Technical writing.

**Planner** — takes an approved specification; produces an ordered set of task briefs, each one the whole of its own requirements, with the interfaces between them named; never re-opens the specification's decisions, never writes a brief that depends on a conversation the implementer did not have. Requires Spec-driven development, Software process engineering, Agile delivery.

**Controller** — takes the plan; dispatches one brief at a time, reads the report as unverified claims, orders review, and sequences what happens next; never writes the change itself, never merges, never lets a failing report move to the next task. Requires Agentic AI development, Context engineering, Software process engineering.

All seven distinct skills these three require — Requirements engineering, Spec-driven development, Technical writing, Software process engineering, Agile delivery, Agentic AI development, Context engineering — already exist in the reference instance, so no skill file is added, which is itself a check on the seats: a seat needing a capability the company cannot name is a seat invented for a diagram. Two edits follow: `implementer.md`'s lowercase "the controller" becomes the seat by name, and the `AI Agent` profile goes from four roles to seven. The human seat stays one — Owner — and it holds the first and the last phase, which is the company of one stated as a fact rather than implied.

One honest note on this: three seats named because three phases exist is the failure mode the role schema warns about, a seat that exists only to fill a cell. They survive the test it sets — a second holder would still be called that, and each has a rulebook of its own that predates this design — but if one of them never appears outside this process's phases, it was a phase wearing a seat's name, and it should be merged into its neighbor.

## 8. The example

Beacon Systems gains `model/processes/delivery/` with two tracks, `Code` and `Docs`, and three phases — `specify.md`, `build.md`, `release.md` — so the seat fields, the gate chain, the track grouping and a phase without track headings all appear once. The gate approvers are the seats it already has. Three phases rather than five, because the example is there to show the type worked and not to propose a way of working.

## 9. What ships

`process-schema.md` and `phase-schema.md` in core. The `TYPES` list in `lib/checks.mjs` gains two entries — `process` as a folder owning `phase`, and `phase` with `owner: "process"` and no `filename` form, since it derives by R12's default.

The instance checks gain exactly one assertion, and it is not about processes: **a required field declared as a list carries at least one item.** R9 already has `## Frontmatter` say whether a field may be absent, and the existing check reads the key's presence and stops, so `gate-approvers:` followed by nothing passes today. The check is general — it holds every required list field on every type — and cites R9, which is why it can exist at all.

The gate chain gets no mechanical check. That `gate-to` agrees with the process's `## Phases` list is a writing rule in `phase-schema.md`, and this repository's own split puts writing rules in the agent pass: every check in `lib/checks.mjs` names a rule `CONVENTIONS.md` defines, a meta-check fails when it does not, and inventing an `R18` to license one type's ordering would be the schema leaking into the conventions. The agent pass reads it, as it reads every other `## Writing rules`.

The README's type list gains the fourteenth and fifteenth types. Core and the package go to 0.25.0.

The parser needs no change at all. Every reference the two types draw — `owner`, `executed-by`, `supported-by`, `gate-approvers`, `escalation-authority`, `gate-to` — is a frontmatter field it already resolves by declared type, and `## Tracks` declares no reference column and is data, as `## References` already is. No new enum, no new table form, no new field shape.

This is additive and breaks nothing: an instance with no `processes/` folder is unchanged, which is every instance today. The reference instance takes it in its three places and writes `Delivery` — five phases, two tracks, every gate approved by the Owner — plus the three seats of §7, with the superpowers skills and `robertblust/conventions` as References. The two sites re-pin the parser only if they want processes on their model page; the graph they draw is unchanged where no process exists.

**Sequencing.** This repository's premise is that it generalizes what already works, so the `Delivery` process and the three seats are written first, as the real thing, and the schemas are lifted out of what writing them actually required. They cannot merge in that order — an instance page whose type has no schema fails the instance check — so both are drafted together, core 0.25.0 merges and releases first, and the reference instance re-pins and adds its process second.

## 10. Not done here

Sub-sequence phases (`5a`, `5b`) and any process that branches rather than chains; a process that names the strategy or objective it serves, which waits until more than one process exists to tell apart; the involvement matrix as a drawn thing, which is a view over the phases and belongs to whatever renders it; an edge from a track to the seats that execute it, since which seat works which track is said in that phase's per-track activities and is not a reference anywhere; `reports-to` and any hierarchy among the seats; the `kpi`, `rule` and `legal-document` types the multi-person role schema still points at; a second process for content, which this design deliberately refuses by making prose a track; rendering processes on any site; and any mechanical check on whether a change actually followed the process, which is a fact about a pull request and not about the model.
