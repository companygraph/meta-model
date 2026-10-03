# A writing rule opens with its subject

CONVENTIONS already says what a writing rule is: one sentence, checkable by an agent reading an entity, one that can fail, and about what goes *in* a field or section, since whether a field is there is the table's business. Nothing holds a rule to that, and the first calibration of `companygraph judge` showed what it costs: most of what the judge flagged were rules that do not meet it. This design makes core meet its own definition and makes it checkable: every writing rule opens with its subject, the judge asks a rule only of a page that has that subject, and a rule that cannot be checked on one page leaves the writing rules.

Status: draft, written on October 3, 2026 against this repository at `4879b8e` (package 0.74.0, core 0.54.0), for companygraph/meta-model#254. It builds on the amendment for #250 in `2026-09-26-the-writing-rules-are-asked-design.md`, which skips a rule whose opening names a section or table column the page lacks, and leaves fields out because a field rule may judge whether the field is there.

## The finding

The judge's second run over the reference instance (v0.74.0, jev-1.13.0) flagged 496 verdicts below 0.60, and each was read against its page by hand. On experiences 22 of 175 held, almost all of them rules about the content of a section: the achievements, the listed skills, the order within a kind. On every other type 13 of 321 held. The false flags fell into four patterns:

- A rule that holds only where its subject is there, where the subject is a field, a kind of row or a state rather than a backticked section: `read-with`, `motivated-by`, a `deprecated` alias, a last phase, a passed horizon. Its wording does not tell the judge so.
- A rule that compares one page with others, which a judge reading one page cannot see: every phase in the folder, a name unique within its process, two questions per kind.
- A rule no existing page can break: what the validation pass reports, "deleted once reached", a rule about another type's pages.
- A rule that predicts agreement between readers: "two readers filing the same bullet would file it the same way".

Each of the four breaks a clause of the definition CONVENTIONS already gives. The first is about presence, which is the table's business; the second and third cannot be checked by an agent reading one entity; the fourth cannot fail on a page. A survey of all 259 rules, 234 in core and 25 in the software pack, sorts them: 58 already open with a declared subject and are about its content, 54 are about the page, its H1 or its tagline, 72 have a clear subject that is not at the opening, 14 govern whether a field is present, 30 need another page, 26 no page can break and 5 predict agreement.

## The rule

CONVENTIONS' paragraph on writing rules gains this: a writing rule opens with its subject, the thing on the page it is about, so a reader and a tool can tell at once whether a page has anything for it to judge. The subject is one of four:

- a section, a frontmatter field or a column of a section's table that the rule's own schema declares, written in backticks as the schema names it: `` `## Ending` ``, `` `read-with` ``, `` `As` ``;
- "The H1";
- "The tagline", or the tagline's label from the schema's sections table where that label is a noun: "The statement", "The definition", "The summary", "The answer";
- "The page", for a rule about the whole file, such as the American English of R14 or "no hex code anywhere".

Every one of these is read from the schema itself; nothing is listed in the tooling. Where a rule today names the tagline by another word than its table's label, it takes the table's word.

A rule about whether a field is there is reworded around something always present, usually the H1 or the tagline, because presence is the table's business and a rule that opened with the field would be skipped exactly where it should fail. The experience schema's first rule is the example: "`role` is filled where the H1 does not already name the part …" becomes a rule about the H1 and `role` together naming the part once.

A rule that cannot be checked on one page leaves the writing rules:

- where a check already holds it, the prose goes and the check stays;
- where no page can break it, or it governs another type's pages, it goes, or moves to the schema it is about, or to CONVENTIONS;
- the five that predict agreement go, and each kind schema keeps its sibling rule that can fail ("says what it excludes as well as what it covers");
- where it could be checked mechanically but no check exists yet, its norm stays as one sentence in the schema's `## Purpose`, and one issue lists the checks owed.

The appendix gives every rule's outcome and, for each rule that changes, its full new text. It is what the build applies.

## The check

`verify`, the repository's own harness, refuses a writing rule in `core/` or in a pack that does not open with a subject from the four above, naming the schema and the rule. Instances are not held to it: a schema an instance writes for a type of its own may have rules that open with anything, and the judge asks such a rule always, as it does now.

## The judge

`subjectsOf` and `subjectOf` read the subject the same way: a backticked section, column or field the schema declares, "The H1", the tagline by either name, or "The page". A rule is asked of a page only when the page has its subject. Fields now count, since no rule opens with a field whose presence it governs; the H1, the tagline and the page are always there. A rule that opens with none of the four, which only an instance's own schema can still have, is asked of every page. The report and the no-key dry run count what was left out per rule, as they do since #250.

## What it does not do

It does not change the shape of a schema, the tables, R0, or any rule's meaning: a rule that stays says what it said, with its subject first. It does not add a mechanical check beyond the one on rule openings; the checks a dropped rule would need are listed for a later release. It does not move the band, which is read off the measuring as before.

## Order

This spec and its appendix are one pull request, the plan a second, the build a third: the core and pack rules first, then the check, then the judge, since the judge may skip a field only once no rule governs a field's presence. A release follows, and each instance takes it with `companygraph upgrade`, which re-vendors the changed schemas.

## Appendix: every rule

The appendix below is the outcome for each of the 259 rules, by schema: 80 unchanged, 125 reworded, 40 dropped, one moved and 13 kept as a sentence in their schema's Purpose, with 14 checks owed. "Unchanged" rules already open with their subject and are about its content. "Becomes" gives a changed rule's full new text. Where a dropped rule names the check that holds it, the build confirms that check exists before the rule goes.

Classes: S opens with its subject already; P governs whether a field is present; R has one subject, not at the opening; W is about the page, the H1 or the tagline; X needs another page; U no page can break, or it governs another type; A predicts agreement between readers.

### achievement-kind (core)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | A | | Dropped: it predicts agreement between readers; its checkable sibling r2 stays. |
| r2 | R | "It says what the kind excludes…" | `## What it means` says what the kind excludes as well as what it covers, since the boundary with the kind beside it is where every disagreement will be. How to decide between two kinds is written here, in the instance, and nowhere else. |
| r3 | R | "A kind is about the sort of claim…" | `## What it means` is about the sort of claim, never about how important it is. Importance is not an order the model can hold. |
| r4 | R | "Name it for what the claims are…" | The H1 names what the claims are — `Architecture`, `Results` — and never the section they sit in. |
| r5 | X | | Dropped: the instance check that no two entities of a type share a `rank` (R9's ranked-type check) holds "two kinds never share one"; "orders kinds within an entry and nothing else" no page can break. |

### brand (core)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | W | "No hex code, size, weight…" | The page holds no hex code, size, weight, line height or file dimension anywhere. A value moves with a release, and a References row says where it is kept. |
| r2 | S | | unchanged |
| r3 | S | | unchanged |
| r4 | S | | unchanged |
| r5 | R | "A trait is one a draft can fail." | A `Trait` is one a draft can fail. "Plain" fails a sentence with an adjective that sells; "professional" fails nothing. |
| r6 | S | | unchanged |
| r7 | S | | unchanged |
| r8 | R | "Positioning stays out: the promise…" | The promise is one paragraph and keeps positioning out: what the company is, where it is going and what it holds to are the identity's, the vision's and the values' to say. |
| r9 | W | "Names and prose are American English (R14)." | The page writes names and prose in American English (R14). |

### concept (core)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | W | | unchanged |
| r2 | R | "A concept this one hangs off belongs in `## Relations`…" | The definition never carries a concept this one hangs off dressed as a link; that concept belongs in `## Relations`, where it resolves. |
| r3 | X | | → Purpose; check owed: "A relation is written on one side only, so no two concepts each name the other in `## Relations`." |
| r4 | S | | unchanged |
| r5 | X | | Dropped: an alias written as a reference names no entity's canonical name, so R3 and R4 already refuse it. |
| r6 | U | | Dropped: no page can break it; whether anything outside the model still uses the old name is on no page. |
| r7 | R | "An alias of kind `translation` is…" | A `Term` of kind `translation` is the concept's name in a language other than the one the model is written in: what a French customer calls it, in a model kept in English. |

### control (core)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | P | "A control names at least one risk…" | The H1 names a control that mitigates at least one risk or enforces at least one rule, and `mitigates` or `enforces` names that risk or rule. The grammar declares each field on its own, so this rule is the agent pass's to hold. |
| r2 | S | | unchanged |
| r3 | R | "A gate is a control where the phase's gate is one…" | `## Applies to`, on a control that is a phase's gate, names that phase, and the gate's criteria stay the phase's bullets. |
| r4 | P | "`performed-by` names a seat for a manual control…" | `mode` decides `performed-by`: a manual control names a seat there, never a person, and an automated control names none. |
| r5 | S | | unchanged |
| r6 | W | "Names and prose are American English (R14)." | The page writes names and prose in American English (R14). |

### decision-kind (core)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | A | | Dropped: it predicts agreement between readers; its checkable sibling r2 stays. |
| r2 | R | "It says what the kind excludes…" | `## What it means` says what the kind excludes as well as what it covers, since the boundary with the kind beside it is where every disagreement will be. |
| r3 | R | "A kind is about the sort of call…" | `## What it means` is about the sort of call, never about how large it was, how it turned out or who made it. Those belong to the decision. |
| r4 | R | "Name it for what the calls are…" | The H1 names what the calls are, `Architecture`, `Career`, and never the section or the type they sit in. |
| r5 | U | | Dropped: the schema declares no `rank`, and R15 refuses a frontmatter field the schema does not declare. |

### decision (core)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | W | | unchanged |
| r2 | W | | unchanged |
| r3 | S | | unchanged |
| r4 | S | | unchanged |
| r5 | S | | unchanged |
| r6 | S | | unchanged |
| r7 | S | | unchanged |
| r8 | S | | unchanged |
| r9 | S | | unchanged |
| r10 | S | | unchanged |
| r11 | R | "A decision names the objective it serves…" | `serves` names the objective the decision serves, never the strategy it follows: which route a call sits on is read from the strategy that serves the same objective, and a strategy the call produced or changed is a `## Bears on` row. |
| r12 | S | | unchanged |
| r13 | U | "A decision is not rewritten…" | `## Consequences` closes with one dated sentence saying so where a call is dropped and nothing replaced it. Also → Purpose; check owed: "A decision is not rewritten to say something else: `status` is the one field that moves, and `decided` with it once when a proposed call is made, what replaced the call is read from the later decision's `supersedes`, and a call that another supersedes carries the status the instance keeps for a replaced call." |
| r14 | W | "Written in the company's own first person…" | The page is written in the company's own first person, "I" for a company of one, "we" otherwise, and the same one throughout the instance. |
| r15 | W | "Names and prose are American English (R14)." | The page writes names and prose in American English (R14). |

### decision-status (core)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | S | | unchanged |
| r2 | R | "It says how a call leaves the state…" | `## What it means` says how a call leaves the state, which decision or event moves it on, so that a status is never changed by hand without a reason the model can show. |
| r3 | X | "An instance has exactly one status…" | `## What it means`, on every status but the one for a call that holds as written, says which decision or event moves a call into it. (The half "an instance has exactly one status for a call that holds as written" is dropped: no single page can break it.) |
| r4 | R | "A status is about whether the call is made…" | `## What it means` is about whether the call is made and holds, never about how well it went. What came of a call is the next decision's question or a period's result. |
| r5 | R | "Name it for the state of the call…" | The H1 names the state of the call, `Standing`, `Revised`, and never a verdict on it. |

### domain (core)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | W | "The tagline says what the domain covers…" | The scope says what the domain covers and names at least one thing it deliberately leaves to another domain, because a boundary stated from one side only is not a boundary. |
| r2 | R | "A domain is named for the area…" | The H1 names the area, not the team that owns it or the system that implements it. |
| r3 | W | "A domain carries no diagram…" | The page carries no diagram and no list of the domain's concepts or its products. Each is a second copy of what those files already say. |

### experience-kind (core)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | A | | Dropped: it predicts agreement between readers; its checkable sibling r2 stays. |
| r2 | R | "It says what the kind excludes…" | `## What it means` says what the kind excludes as well as what it covers. The boundary between a role and a project, or a project and a community entry, is where every disagreement will be. |
| r3 | R | "A kind is about the sort of period…" | `## What it means` is about the sort of period, never about how it went, how long it lasted or how senior it was. Those belong to the period. |
| r4 | R | "Name it for what the period *is*…" | The H1 names what the period *is*, not the type it belongs to: `Role`, not `Experience`. |
| r5 | R | "`organization` means a different thing under each kind…" | `## What it means` says which one `organization` means under this kind — an employer, a client, a host, an awarding body — since the field means a different thing under each kind. That sentence has nowhere else to live. |
| r6 | R | "A kind carries no dates and governs none." | `## What it means` carries no dates and governs none. How a date on an experience reads is the experience's business whatever kind it is, and a kind claiming otherwise would make an absent `end` mean two things and resolve it by a label. |

### experience (core)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | P | "`role` is filled where the H1 does not…" | The H1 names the part the subject played, or `role` carries it: the field is filled where the H1 does not already name the part, and left absent where it does. An entry named for what it delivered, or for the event it happened at, does not say who the subject was on it. An entry named for a position does, and repeating it in the field would be the same fact twice. Which of those an instance writes is the instance's own convention and no rule here fixes it; the field is what carries the part when the H1 does not. |
| r2 | S | | unchanged |
| r3 | S | | unchanged |
| r4 | S | | unchanged |
| r5 | X | "Where an instance defines achievement kinds…" | `## Achievements`, where an instance defines achievement kinds, groups them: each bullet sits under the heading of the one kind it is chiefly evidence of, headings follow the kinds' `rank`, and a kind with nothing in the entry has no heading. An instance that defines none writes a flat list. |
| r6 | X | | Dropped: held by the instance check that a bullet standing before the first heading of `## Achievements` belongs to no kind, run where the instance holds achievement kinds (R16). |
| r7 | R | "Within a kind the broadest claim comes first…" | `## Achievements` puts the broadest claim first within a kind; peers follow the order they happened in, and a bullet that points back comes directly after what it points to — or names it, where the grouping would part them. |
| r8 | R | "A list of tools or a stack is not an achievement…" | `## Achievements` holds no list of tools or stack, since that is not an achievement: what was built with a tool says so in the bullet that built it. |
| r9 | P | "A period still running has no `end`…" | The tagline of a period still running says so, and the period has no `end` — a reader sees a tagline and does not see an absent field. |
| r10 | P | "A one-off is not a period…" | The H1 of a one-off — a talk, a certification, an award or a publication — comes with `end` set equal to `start`, since a one-off is not a period. Left absent it would read as still running, and no other field says otherwise. The two being equal is what makes it a one-off, and the interval that shared value denotes is how precisely it is placed: `2012-05-04 .. 2012-05-04` is a day, `2016-10 .. 2016-10` a month, `2002 .. 2002` an event known only to its year. A period that genuinely ran a whole year is not written `2002 .. 2002` — it takes the months it ran, `2002-01 .. 2002-12`, which is also the only way to tell the two apart. |
| r11 | S | | unchanged |
| r12 | S | | unchanged |
| r13 | R | "For a one-off, `organization` is…" | The H1 of a one-off comes with `organization` naming whoever hosted, awarded or published it. The field is a stretch there and the alternative — leaving it empty — says less. |
| r14 | S | | unchanged |

### feature (core)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | W | | unchanged |
| r2 | S | | unchanged |
| r3 | R | "A feature is named for the capability…" | The H1 names the capability, not the vendor that supplies it. Where a vendor is what varies, the vendor is a concept the feature names and not a feature of its own. |
| r4 | W | "Nothing about a release, a ticket…" | The page says nothing about a release, a ticket or a delivery date: those move, and a feature outlives all three. |
| r5 | S | | unchanged |

### identifier (core)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | S | | unchanged |
| r2 | W | | unchanged |
| r3 | U | | Dropped: it governs the instance's agent file, which is no page of the model, so no page can break it. |
| r4 | W | "Names and prose are American English (R14)." | The page writes names and prose in American English (R14). |

### identity (core)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | W | | unchanged |
| r2 | W | | unchanged |
| r3 | S | | unchanged |
| r4 | X | | → Purpose; check owed: "A fact lives in one place: where identity and a profile would state the same thing, an address, identity holds it and the profile carries its own only where it differs, and a mail address is two facts, the company's here and a person's own on their profile." |
| r5 | S | | unchanged |
| r6 | R | "The URL in `## Also at` is…" | `URL` in `## Also at` is the page that is the company's own on that place, not a search, a feed or a post. What a reader lands on has to be the company. |

### kpi (core)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | W | "No target, threshold, baseline…" | The page holds no target, threshold, baseline or measured value, ever. Each moves, and a number that moves goes stale in the model without a sound; a References row says where they are kept. |
| r2 | W | "Named for the quantity…" | The H1 names the quantity, not the dashboard or tool that shows it: `Change Lead Time`, not `the lead-time chart`. |
| r3 | W | "Person-neutral, as a role is…" | The page is person-neutral, as a role is: the definition names seats and never who holds them. |
| r4 | S | | unchanged |
| r5 | S | | unchanged |
| r6 | S | | unchanged |
| r7 | S | | unchanged |
| r8 | R | "A value any KPI could cost…" | `can-cost` names no value any KPI could cost, since such a value tells a reader nothing. |
| r9 | S | | unchanged |
| r10 | S | | unchanged |
| r11 | S | | unchanged |
| r12 | S | | unchanged |
| r13 | R | "A KPI that assesses a control says in `## What it can hide`…" | `## What it can hide`, on a KPI that assesses a control, says what the control lets through that the number does not count. |
| r14 | U | | Dropped: it grants a permission (a KPI nothing measures yet is valid, with no values row), and no page can break it. |
| r15 | W | "Names and prose are American English (R14)." | The page writes names and prose in American English (R14). |

### localization (core)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | S | | unchanged |
| r2 | W | | unchanged |
| r3 | W | "Names and prose are in the language `locale` names (R14)." | The page writes names and prose in the language `locale` names (R14). |

### phase (core)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | R | "A gate criterion is a sentence that can fail…" | Each `## Gate` criterion is a sentence that can fail: "the checks pass on the branch" can, "quality is good" cannot. |
| r2 | U | | Dropped: held by the instance check that an activity above the first track heading belongs to no track (R16); "same for every track" no page can break. |
| r3 | U | | Dropped: `## Activities` declares `Numbered.`, and the list-kind check holds it (R16). |
| r4 | X | | Dropped: held by the instance check that the process's `## Phases` table and `gate-to` state one order (R16). |
| r5 | X | | Dropped: held by the same order check, which refuses a `gate-to` on the last phase and on no other (R16); `## If not met` is Required and the required-table check holds it. |
| r6 | X | | Dropped: held by the instance check that a name of an owned type is unique within its owner (R2). |
| r7 | S | | unchanged |
| r8 | R | "An outcome is what the escalation authority decides…" | `Outcome` is what the escalation authority decides, in a word or a few, as a past participle where it can be: `reworked`, `narrowed`, `dropped`. It is not the gate criterion that failed. |
| r9 | X | | Dropped: held by the instance check that a `## If not met` row names this phase or one before it, and the way forward is `gate-to`'s (R16). |
| r10 | S | | unchanged |
| r11 | U | | Dropped: it grants a permission (two rows may lead to one phase), and no page can break it. |
| r12 | R | "The paragraph under the table says only…" | `## If not met` carries a paragraph under the table only for what the rows cannot say, a reason or a hand-off, and a page whose rows say everything carries none. |
| new | — | | Moved here from process r3: `## Activities` treats its `### [Track]` headings as strands of one step and never as alternative routes through it, since tracks run together in one pass rather than instead of one another, and a phase may produce a deliverable per track in the same pass. |

### process (core)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | W | "Person-neutral, as a role is…" | The page is person-neutral, as a role is: a process names seats and never who holds them. |
| r2 | W | "Named for the work…" | The H1 names the work rather than the tool that carries it: `Delivery`, not `The board`. |
| r3 | U | | Moved to `phase-schema.md` writing rules: "`## Activities` treats its `### [Track]` headings as strands of one step and never as alternative routes through it, since tracks run together in one pass rather than instead of one another, and a phase may produce a deliverable per track in the same pass." |
| r4 | S | | unchanged |
| r5 | X | | Dropped: held by the instance check that an owner lists every phase it owns (R5) and the order check between `## Phases` and `gate-to` (R16). |
| r6 | R | "A phase is named in `## Phases` by its canonical name…" | `## Phases` names a phase by its canonical name and nothing beside it (R3). A path to the phase's file is not written there: a path moves, nothing resolves one, and whatever shows the model to a reader can make the name a link. |
| r7 | X | "`## Tracks` lists every track in the folder…" | `## Tracks` names each track by its canonical name and nothing beside it (R3). What a track produces is said once, in the track's own file, and is not repeated here. (The half "lists every track in the folder and nothing else" is dropped: the instance check that an owner lists every track it owns holds it, R5.) |
| r8 | U | | Dropped: `## Tracks` is Required, and the check that a required table section carries at least one row holds it (R16). |

### product (core)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | W | | unchanged |
| r2 | R | "A product is named as the people who use it…" | The H1 names the product as the people who use it name it, not as its repository or its internal project is named. |
| r3 | X | | Dropped: two pages naming one thing is visible on no single page. |
| r4 | R | "A product names one domain…" | `domain` names the one domain whose concepts the product's users came to it for. A product that works across two still names one, and the concepts its features name show the rest. |
| r5 | W | "Nothing about a release, a version…" | The page says nothing about a release, a version or a roadmap: a product outlives all three. |

### proficiency-level (core)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | A | | Dropped: it predicts agreement between readers; its checkable sibling r3 stays. |
| r2 | R | "It describes what someone at this level does…" | `## What it means` describes what someone at this level does with *it* — the thing being claimed — and never what that thing is. Every rung is claimed against every skill, so anything specific to one skill does not belong on a rung. |
| r3 | X | "A rung names what it has that the rung below does not." | `## What it means` names what this rung has that the rung below does not. Working unsupervised, choosing between alternatives, knowing where the thing breaks down: each rung earns its place by a difference someone could observe, or the ladder has fewer rungs than it claims. |
| r4 | R | "The ladder is the instance's own…" | The page cites and reproduces no external scale — SFIA, Dreyfus, a set of HR bands — for the same reason a skill cites none: the ladder is the instance's own, in its own words. |
| r5 | R | "A rung is about capability…" | `## What it means` is about capability, never about seniority, tenure or job title. Those are the organization's business and they move for reasons that have nothing to do with the claim. |

### profile (core)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | W | | unchanged |
| r2 | W | "A tagline may state the claim…" | The tagline may state the claim the person's work makes rather than describe the work. Then the claim is one the model holds elsewhere — a value, or the thread the summary names — and a reader can follow it there. A line with nothing behind it is a slogan, and nothing on the page tells one from the other except what backs it. |
| r3 | S | | unchanged |
| r4 | R | "Evidence never restates the level." | `What it shows` never restates the level. If removing the Level column would lose nothing, the row is describing confidence rather than the work. |
| r5 | R | "A row that says no more than its own `Experience` cell…" | `What it shows` says more than its own row's `Experience` cell; a row that says no more says nothing, and is dropped rather than written. |
| r6 | R | "One sentence per row, under forty words." | `What it shows` is one sentence, under forty words. The sentence does not repeat the period of the experience its `Experience` column names; a period of the fact's own, shorter than that one, stays in it. |
| r7 | R | "Rows run in the order the Skills table lists…" | `## Evidence` rows run in the order the Skills table lists the skills, and chronologically within a skill. |
| r8 | X | | Dropped: weighing a level against the rung's own definition needs the proficiency-level page, so no single page can break it. |
| r9 | U | | Dropped: held by the `Under` check, both ways (R16). |
| r10 | X | | Dropped: held by the `lists` check (R16) and by the owner check that a name of an owned type resolves within its owner (R4). |
| r11 | U | | Dropped: it governs skill pages, and skill r2 already holds the skill file person-neutral. |
| r12 | S | | unchanged |
| r13 | R | "The URL in `## Also at` is…" | `URL` in `## Also at` is the page that is the person's own on that place, not a search, a feed or a post. What a reader lands on has to be the person. |
| r14 | X | | → Purpose; check owed: "A person who holds a role claims the skills the role requires in their Skills table, with evidence, and where they cannot the gap stays visible as a finding the validation pass reports, never an error and never an invented row, while an agent claims nothing, so a seat it holds reports no gap." |
| r15 | R | "The image is the person, recognizably…" | `image` is the person, recognizably, as the tagline is their own voice: not a logo, a team or an illustration standing in for them. A profile whose nature is `agent` may carry one, and then it shows what holds the profile; the rule below that an agent claims no skill does not reach it. |
| r16 | P | | unchanged (it opens with `nature`, a required field, and governs the presence of the two tables, not of `nature`) |

### question-kind (core)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | A | "`## What it means` is written so that two readers…" | `## What it means` says what the kind excludes, since the boundary with the kind beside it is where every disagreement will be. (The reader-agreement half is dropped; this is its checkable sibling.) |
| r2 | R | "A kind is about what the visitor has in mind…" | `## What it means` is about what the visitor has in mind when they ask, never about which entity the answer rests on. |
| r3 | R | "Name it as a visitor would read it…" | The H1 names the kind as a visitor would read it above the questions it holds, `Career`, `Brand`, and never the type or the section the answers sit in. |
| r4 | X | | Dropped: the ranked-type check holds "two kinds never share a rank" (R9); "the first kind is the one most visitors come for" no page can break. |
| r5 | X | | → Purpose; check owed: "A kind holds at least two questions, unless the instance holds only one, and a question alone is filed under the nearest kind until a second arrives." |
| r6 | W | "Names and prose are American English (R14)." | The page writes names and prose in American English (R14). |

### question (core)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | W | | unchanged |
| r2 | W | | unchanged |
| r3 | W | "An answer with no `## Rests on`…" | The answer, where there is no `## Rests on`, is mastered on the question. It states only what no other entity holds: a stance, a boundary, or a claim the model deliberately does not make. A fact that belongs on an entity is written on that entity, and the question rests on it. |
| r4 | R | "Every entity the answer draws on has a row…" | The answer draws on no entity without a row in `## Rests on`, and no row names an entity the answer does not draw on. |
| r5 | U | | Dropped: it governs concept pages, and r1 already holds that the H1 is worded as people ask. |
| r6 | W | "Names and prose are American English (R14)." | The page writes names and prose in American English (R14). A visitor asking in German is matched by the chat, not by a German question. |
| r7 | X | | Dropped: two files holding one question is visible on no single page. |
| r8 | R | "A question has one kind…" | `kind` is the one a visitor would look under first. A question that seems to need two is either two questions or is filed where most visitors would look for it. |

### risk (core)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | R | "A risk is written as an event…" | The H1 is written as an event, not as a feeling or a gap: "a secret reaches a transcript", not "security". |
| r2 | W | "It carries no likelihood…" | The page carries no likelihood, impact or score. Those are assessments that move, and the model holds how things are made and not their state (R17), as a KPI holds its definition and none of its values. Where the company rates its risks, `## References` points at where it does. |
| r3 | S | | unchanged |
| r4 | W | "Names and prose are American English (R14)." | The page writes names and prose in American English (R14). |

### role (core)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | W | "Person-neutral: no name…" | The page is person-neutral: no name, employer, date or number from any profile, and never who holds the seat. Who holds it is the profile's fact. |
| r2 | W | "Named for the seat…" | The H1 names the seat, so a second holder would still be called that: `Owner`, not `Entrepreneur`; `Reviewer`, not the reviewer's name. |
| r3 | S | | unchanged |
| r4 | S | | unchanged |
| r5 | U | | Dropped: it describes the validation pass and governs profiles; folded into the sentence profile r14 adds to profile's `## Purpose` (check owed). |

### rule (core)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | W | | unchanged |
| r2 | U | | Dropped: it grants a permission (a rule no control enforces is still a rule), and no page can break it. |
| r3 | X | | → Purpose; check owed: "A rule binds more than one seat, process or phase, or is what a control checks, and a refusal only one of them makes stays in that page's `## What it never does`." |
| r4 | U | | Dropped: it governs value pages and grants a permission; no page can break it. |
| r5 | S | | unchanged |
| r6 | S | | unchanged |
| r7 | W | "Names and prose are American English (R14)." | The page writes names and prose in American English (R14). |

### skill (core)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | W | "The tagline starts with the thing itself…" | The definition starts with the thing itself, never with a wrapper — not "The practice of", "The discipline of", "The ability to". |
| r2 | S | | unchanged |
| r3 | S | | unchanged |
| r4 | R | "Products and tools appear only in a closing clause…" | The page names products and tools only in a closing clause of the form `Typical tools: …`, and only where a product is what the skill is done with. A product is not a skill. |
| r5 | X | | Dropped: two files that differ only by tool is visible on no single page. |
| r6 | R | "Public vocabularies (SFIA, ESCO, O*NET, Lightcast) may be consulted…" | The page cites and reproduces none of the public vocabularies (SFIA, ESCO, O*NET, Lightcast), which may be consulted to find the grain and to check for gaps. The vocabulary is the instance's own. |

### source (core)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | W | | unchanged |
| r2 | R | "Where the source issues identifiers, the description says…" | The description says what a `source-id` is in the source, where the source issues identifiers — a record key, a directory id, an entry's `id` in a named folder. Without that sentence a `source-id` is an opaque string that only its author can resolve. |
| r3 | P | "`url` is set where the source has an address…" | The page sets `url` where the source has an address a person or a sync could open, and leaves it absent where it has none. A repository with no remote has none, and the empty field says so. |
| r4 | U | "The source is the place with authority…" | The description names the place with authority over the fact, not the place the fact was read. If correcting a page means editing somewhere else first, that somewhere else is the source. |

### strategic-objective (core)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | R | "It says what must become true…" | The statement says what must become true, never by what means. A means is a strategy, and an objective that names one has already chosen a route the model cannot then see being chosen. |
| r2 | R | "It names something the company could fail at." | The statement names something the company could fail at. An objective no outcome could contradict is the vision restated in longer words. |
| r3 | S | | unchanged |
| r4 | P | "`horizon` is written only where a real date exists." | The page sets `horizon` only where a real date exists. A standing objective leaves it absent rather than inventing one, and an invented horizon is a claim like any other. |
| r5 | W | "Written in the company's own first person…" | The page is written in the company's own first person — "I" for a company of one, "we" otherwise — and the same one throughout the instance. |
| r6 | U | | Dropped: whether an objective has been reached is on no page, so no page can break it. |
| r7 | U | | → Purpose; check owed: "A `horizon` that passes with the objective unmet is a decision and not a fact: the objective is restated, re-dated or deleted, and leaving it to age is none of those." |

### strategy (core)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | W | | unchanged |
| r2 | S | | unchanged |
| r3 | S | | unchanged |
| r4 | S | | unchanged |
| r5 | R | "It says how, never where." | The statement says how, never where. A strategy restating the vision has skipped the objective that was supposed to sit between them. |
| r6 | U | | Dropped: `serves` is Required, and the required-field check holds it (R9). |
| r7 | S | | unchanged |
| r8 | W | "Written in the company's own first person…" | The page is written in the company's own first person — "I" for a company of one, "we" otherwise — and the same one throughout the instance. |
| r9 | U | | Dropped: whether a strategy has been replaced is on no page, so no page can break it. |

### surface (core)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | P | | unchanged (it opens with `production`, a required field, and governs the presence of `## Projection rules` and `built-by`, not of `production`) |
| r2 | R | "A surface is named for the page…" | The H1 names the page, never the place that carries it. The place is what a profile's or an identity's `## Also at` lists, and a surface named for it would turn that table's `Where` column from data into references. |
| r3 | S | | unchanged |
| r4 | R | "A projection rule states…" | Each line of `## Projection rules` states what the surface does with the model, not what the model contains. A rule that could be read off an entity is a fact restated, and the entity is where it lives. |
| r5 | X | | Dropped: an omission shows only against the model, so no single page can break it. |
| r6 | R | "A constraint is written as a check…" | Each line of `## Constraints` is written as a check: something a reader looking at the published result can pass or fail. "Every unit that can appear alone pairs the name with a role or a domain" can be failed; "the tone is professional" cannot. |
| r7 | R | "Where the surface imposes a limit, the constraint names…" | `## Constraints` names the number and where it was read wherever the surface imposes a limit. A limit quoted from memory is a claim like any other. |
| r8 | W | "The file never states…" | The page never states what the surface currently shows. That is an observation, true on the day it was written and unfalsifiable here afterwards (R17). |

### track (core)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | R | "A track is named for what it makes…" | The H1 names what the track makes, not who makes it: `Code`, not `Engineering`. |
| r2 | W | | unchanged |
| r3 | X | | Dropped: held by the instance check that a name of an owned type is unique within its owner (R2). |
| r4 | U | | Dropped: the schema declares no order field, and R15 refuses a frontmatter field the schema does not declare. |
| r5 | W | "A track carries its name and what it produces…" | The page carries the track's name and what it produces, and nothing more. R9 lets a page hold sections of its own, so no script refuses one here; what a track would say in it belongs to the phase that does the work or to the process that owns the track. |

### value (core)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | S | | unchanged |
| r2 | R | "It is never addressed at the reader…" | `## In practice` is never addressed at the reader — "You should …" — and never written as an instruction. A value is a commitment the company makes, not advice it gives. |
| r3 | R | "The first half says what we do…" | `## In practice` opens with what we do, in situations that have actually come up. Its second half is one sentence beginning "I never …" / "We never …", and it names the specific way this value gets broken — not its absence. |
| r4 | R | "Both halves name a situation…" | `## In practice` names a situation in both halves, not an adjective. "We write the decision down before the code" can be checked against last week; "We value quality" cannot be checked against anything. |
| r5 | W | | unchanged |

### vision (core)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | W | | unchanged |
| r2 | R | "A vision that could be written as a value…" | The statement could not be written as a value, or it has not said where it is going: a value says what we hold to whatever happens, a vision says what we are trying to make happen. |
| r3 | R | "It says where, not how." | The page says where, not how. A named tool, a named surface or a dated milestone is a plan, and plans move faster than a vision should. |
| r4 | U | | Dropped: it governs strategic objectives, the one-vision count is held by the instance check that a company has one vision, and "carries no date" is r3's dated milestone. |
| r5 | S | | unchanged |
| r6 | W | "Written in the company's own first person…" | The page is written in the company's own first person, as values are: "I" for a company of one, "we" otherwise. |

### aggregate (software)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | X | | → Purpose; check owed: "The root is a concept design of kind entity, since a value object has no identity to reach the rest through." |
| r2 | R | "An invariant is a rule that holds…" | `Invariant` is a rule that holds after every command, stated so a test could check it. |
| r3 | R | "A command is named in the imperative…" | `Command` is named in the imperative, and an event in the past tense, so the two are never confused. |
| r4 | U | | → Purpose; check owed: "A label stays when its invariant is reworded, a new rule takes a new label, and a removed rule's label is not used again." |
| r5 | P | "A page drawn from code names that code as its `source`…" | `source`, on a page drawn from code, names that code, the repository a sync reads, and the module or package is its `source-id`; a page written here that code then follows names the code in `## References` as `Implementation`. |

### bounded-context (software)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | W | "The name is the business's…" | The H1 is the business's name, not a service's or a team's: "Billing", not "billing-service". |
| r2 | W | | unchanged |
| r3 | X | | → Purpose; check owed: "A relationship is written on the downstream context, the side that knows it depends, and a symmetric pattern, a partnership or a shared kernel, is written once, on either side." |
| r4 | U | | Dropped: the context map is drawn, not written, so no page can break it. |
| r5 | R | "An event is consumed where the Consumes table names it…" | `## Consumes` names each event the context consumes, and `## Relationships` names the context it comes from. |
| r6 | R | "A reaction says what happens here…" | `Reaction` says what happens here, not in the context that emitted the event. |
| r7 | P | "A page drawn from code names that code as its `source`…" | `source`, on a page drawn from code, names that code, the repository a sync reads, and the module or package is its `source-id`; a page written here that code then follows names the code in `## References` as `Implementation`. |

### concept-design (software)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | W | | unchanged |
| r2 | R | "The kind follows Evans's test…" | `kind` follows Evans's test: if every attribute changed, would it still be the same one? Then it is an entity. |
| r3 | X | | → Purpose; check owed: "A relation is written on one side only, as core's concept relations are, so no two concept designs each name the other in `## Relations`." |
| r4 | X | | → Purpose; check owed: "An attribute whose type is a value object names that value object's concept design exactly." |
| r5 | P | "A page drawn from code names that code as its `source`…" | `source`, on a page drawn from code, names that code, the repository a sync reads, and the module or package is its `source-id`; a page written here that code then follows names the code in `## References` as `Implementation`. |

### domain-event (software)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | W | "The name is in the past tense…" | The H1 is in the past tense and says what happened, not what should happen next. |
| r2 | X | | → Purpose; check owed: "A payload type that names a term names one of the event's own context, and a consumer translates it into its own language." |
| r3 | P | "A page drawn from code names that code as its `source`…" | `source`, on a page drawn from code, names that code, the repository a sync reads, and the module or package is its `source-id`; a page written here that code then follows names the code in `## References` as `Implementation`. |

### feature-design (software)

| Rule | Class | Today opens | Becomes |
| --- | --- | --- | --- |
| r1 | R | "The operational principle is one scenario…" | `## Operational principle` is one scenario, told as what happens, not a list of capabilities. |
| r2 | R | "A scenario says Given, When and Then…" | Each `## Scenarios` scenario says Given, When and Then, and each step is something a person or the system does or sees. |
| r3 | R | "Every term and event the scenarios mention…" | The page lists in `## Uses` every term and event its scenarios mention, and no row there names one they do not. |
| r4 | U | | → Purpose; check owed: "A scenario's label stays when its title is reworded, since it is what the test that proves it cites." |
| r5 | P | "A page drawn from code names that code as its `source`…" | `source`, on a page drawn from code, names that code, the repository a sync reads, and the module or package is its `source-id`; a page written here that code then follows names the code in `## References` as `Implementation`. |

### Counts

By class (259 rules): S 58, P 14, R 72, W 54, X 30, U 26, A 5. Core 234: S 58, P 9, R 64, W 50, X 25, U 23, A 5. Software 25: P 5, R 8, W 4, X 5, U 3.

By outcome:

| Outcome | Core | Software | All |
| --- | --- | --- | --- |
| unchanged | 78 | 2 | 80 |
| reworded | 110 | 15 | 125 |
| dropped | 39 | 1 | 40 |
| moved | 1 | 0 | 1 |
| → Purpose | 6 | 7 | 13 |

Unchanged counts the 58 S rules, 20 W rules that already open with "The H1" or the tagline's own label (or "The tagline" for a phrasal label), and the two P rules that already open with a required field they do not govern (profile r16, surface r1). Decision r13 is counted as reworded and also adds a Purpose sentence, so 14 checks are owed.

### Checks owed

- concept: no two concepts each name the other in `## Relations`.
- concept-design: no two concept designs each name the other in `## Relations`.
- concept-design: an attribute `Type` naming a value object names that concept design exactly (a value-object design of the same context).
- aggregate: `root` resolves to a concept design whose `kind` is entity.
- aggregate: an invariant `Label` survives a rewording, and a removed label is not reused (read from history).
- feature-design: a scenario label survives a retitle (read from history).
- decision: between commits, only `status` (and `decided` once, when a proposed call is made) changes; a superseded call carries the instance's replaced status.
- bounded-context: no pair of contexts both write the same relationship.
- domain-event: a `## Payload` `Type` naming a concept design names one in the event's own context.
- identity: a human profile repeating identity's address (or another identity fact, mail excepted) is reported.
- profile: a skill a held role `requires` that the holder's Skills table does not claim is reported as a gap, never an error, and not for an agent.
- question-kind: every kind holds at least two questions, unless the instance holds only one.
- rule: a rule names more than one entity in `## Applies to`, or a control `enforces` it.
- strategic-objective: a `horizon` earlier than today is reported.
