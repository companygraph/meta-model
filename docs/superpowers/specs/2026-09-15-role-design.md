# `role` — design

> Core says what a company is, where it is going and how, and who is in it, then stops at the
> person. What the company needs done, as a seat that reads the same whoever sits in it, is held
> nowhere — so a skill can be claimed but never required, and an agent that drafts every page
> of the family has no place in the model of the company it works for. One type opens the
> Organization group, and the profile learns to say whether a person or an agent holds a seat.

Status: proposed. Decided on 2026-09-15 against this repository at `d0a7d14` and against
`robertblust/mental-model` at `82f41f6`. The two role files the family already keeps,
`conventions/WRITER.md` and `conventions/TRANSLATOR.md`, were read on that day and are the
template; the roles schema of the multi-person instance was read for what it carries and what
it does not.

---

## 1. The gap

At 0.22.0 core holds twelve types. A profile claims skills at a level with evidence; an
experience lists the skills it used. The first design named the other half of the capability
edge in the same sentence — a skill is "claimed by profiles, required by roles" — and
`skill-schema.md` still says so in its File Location paragraph: "a profile claims one and a
role requires one, and it outlives both." The role never shipped, so the sentence describes an
edge nothing can draw.

The reference instance shows the cost twice. The company of one has one seat, and nothing says
what that seat is accountable for or what it has to be able to do; the profile carries thirty
skill claims and nothing says which of them the company actually runs on. And the family's
pages are drafted by an agent under two rulebooks, `WRITER.md` and `TRANSLATOR.md`, that are
role definitions in everything but name — what it takes, what it produces, what it never does
— living in the conventions repository because the model has no type to hold them. **The
company's own model cannot name the roles the company runs on, human or agent.**

## 2. What travels from the multi-person instance, and what does not

The multi-person instance carries twenty-seven roles under a schema of sixteen sections. Most
of them point at types core does not have, and the same rule that shaped `strategy` applies: a
field whose target is not a core type cannot be written, and returns when the type ships.

| Element | Decision | Why |
| --- | --- | --- |
| `owner` (a leadership role) and the two governance tiers | Dropped | A hierarchy of roles is a fact about a company with more than one. It returns as an optional `reports-to` when an instance needs it. |
| Core Responsibilities, Identity (Role, Focus, Philosophy) | Kept, reshaped | These become the tagline and `## What it produces`. |
| `[Domain] Scope` table | Dropped | A scope table is one company's way of bounding a seat; in core the bound is what the seat produces and what it never does. |
| KPIs, Rules, Product Cycle Participation, Legal Documents, Recurring Meetings, Jira Responsibilities, Strategy Ownership | Dropped | Each points at a type core does not have (`kpi`, `rule`, `process`, `legal-document`) or at a tool. They return with their types. |
| Best Practices, Collaboration, Constraints | Kept, reshaped | Constraints become `## What it never does`; the rest is prose inside the three sections. |
| Source | Kept as core's own | `source` and `source-id`. |

What is left is the shape the family's own two role files already have, which is the finding:
a seat is what it takes, what it produces and what it never does, plus the skills it needs.

## 3. The seat, not the person

A role is a seat the company needs filled, written so it reads the same whoever holds it. The
test for a role's name is whether a second holder would still be called that. "Entrepreneur"
fails it, because it describes a person; "Owner" passes. In a company of one the human seat
is one role, Owner, and the roles an agent holds — Writer, Translator, Implementer, Reviewer —
pass the same test, since a person could hold any of them tomorrow.

A role is therefore person-neutral the way a skill is: no name, employer, date or number from
any profile, and never the name of who holds it. **Who holds a seat is the profile's fact, not
the role's.** Every edge core has points from the thing that changes to the thing that stays —
a strategy names its objectives, an experience names its skills — and a hire is an edit to one
profile, not to a role file every holder would touch. So the profile lists the roles it holds,
and a role file names nobody.

## 4. The agent

The seats Writer, Translator, Implementer and Reviewer are held today by an agent. It needs a
profile, because a role is held by a profile and nothing else, and R2 wants one name for it
that people use. That profile is **AI Agent**: it stands for whatever agent runs the roles —
Claude, Gemini, Codex — and does not change when the model behind it does. One profile, four
roles, because the writer and the translator are one session with two rulebooks.

A profile therefore says what kind of thing holds it. A new required field, `nature`, an enum
of `human` and `agent`. Required rather than absent-means-human, because explicit is the
house style and the cost is one line on every existing profile. The name is `nature` and not
`kind`, for two reasons that are the same reason: `kind` on an experience is a reference to an
experience-kind and the parser stamps every entity whose `kind` is set for a renderer to draw
as a period label, so a profile with `kind: human` would be drawn as a period of kind "human";
and a field name that means one thing on one schema and another on the next is the closed
vocabulary R9 argues against.

Everything else on the profile works for an agent as it does for a person. The Skills table
claims what the roles require, with the rulebook as evidence. `email` and `location` are
optional and stay absent. An agent owns no experiences until it has a period worth recording.

This is the first `enum` in core. R8 says the permitted values are listed in the schema and
today nothing reads them mechanically; the values stand in the Description cell. So that a
check can read them, the Description of an enum field opens with the values as backticked
tokens — `` `human` or `agent`. `` — and the instance checks gain one assertion under R8: a
value written for an enum field is one of the tokens its Description opens with. The form is
stated in R8, beside the sentence that already requires the values to be listed.

## 5. The schema

`model/roles/*.md`. A role owns nothing and nothing owns it, so it is a file.

Frontmatter: `source` (Yes, ref → source), `source-id` (No, string), and `requires` (No,
array of ref → skill) — the skills the seat needs, each the H1 of a file in `skills/`.
Optional, because a seat can exist before anyone has said what it needs, and because a
required empty list is the noise R9 warns against.

Sections, in this order: `# [Seat]`, the canonical name; `> [Purpose]`, one line on what the
seat is for; `## What it takes`, required, what the holder is handed and what it refuses to
start without; `## What it produces`, required, what leaves the seat and in what form; `## What
it never does`, required, a list, one sentence each, each checkable; `## References`, optional,
a table with the columns `What` and `URL` as on experience, where a role links its rulebook.

Purpose: a role is a seat the company needs filled — one file, named once, held by whichever
profile lists it — and it answers "what does this seat take, produce and refuse, and what must
whoever holds it be able to do?" for someone filling it, holding it or handing work to it. It
is not a person's history in the seat, which lives on the profile and in experiences, and it
is not a process, which says when the seat acts.

Writing rules:

- Person-neutral: no name, employer, date or number from any profile, and never who holds it.
- Named for the seat, so a second holder would still be called that: `Owner`, not
  `Entrepreneur`; `Reviewer`, not the reviewer's name.
- Each line under `## What it never does` is a sentence an agent can hold an output against:
  "never merges" can fail, "acts responsibly" cannot.
- `requires` lists what the seat needs, not what its current holder happens to have.
- A skill the role requires that the holding profile does not claim is a gap the validation
  pass reports, never an error: it says what the holder has to learn or the company has to
  hire, which is information about the person and not a defect in the model. The mechanical
  checker has failures and skips and no third class, and it stays out of this rule.

## 6. The profile

Two fields. `nature` (Yes, enum, `` `human` or `agent` ``): what holds this profile. `roles`
(No, array of ref → role): the seats this profile holds, each the H1 of a file in `roles/`.
Optional, because a profile in a larger instance may be a person without a seat yet.

Purpose and writing rules gain one line each: a profile is "the entity every experience is
owned by, every skill claim is made from and every role is held by"; and a profile that holds
a role claims the skills it requires in its Skills table, with evidence, and where it cannot,
the gap is reported as §5 says.

## 7. The example

Beacon Systems gains `model/roles/` with two seats and one agent. `Backend Engineer` requires
`Java Programming` and is held by Mira Halvorsen, who claims it; `Reviewer` requires
`Domain-Driven Design` and is held by a new profile `AI Agent` with `nature: agent`, whose
Skills table is empty because it has nothing it can evidence yet. Both existing profiles gain
`nature: human`. The example then shows the type worked, the enum written, and the gap rule
with something to report: the Reviewer requires a skill its holder does not claim.

## 8. What ships

`role-schema.md` in core. Two rows and two lines in `profile-schema.md`. R8 gains the form an
enum's Description takes. The `TYPES` list in `lib/checks.mjs` gains `role`; the instance
checks gain the R8 enum assertion; the README's type list gains the thirteenth type. Core and
the package go to 0.23.0. The parser needs no change: `requires` and `roles` are references it
already resolves by declared type, and `nature` is an enum it keeps as a fact.

This is at least a minor release by the family's rule, and it breaks every instance: a profile
without `nature` fails the required-field check. The release notes say so and show the one
line to add. The reference instance takes it in its three places, adds `nature: human` and
`roles` to its one profile, writes five roles — Owner, Writer, Translator, Implementer,
Reviewer — and the profile `AI Agent` holding four of them, with the rulebooks in
`robertblust/conventions` and the superpowers plugin as References. Its validate skill learns
the gap rule. The two sites re-pin the parser only if they want the type on their model page;
the graph they draw is unchanged where no role exists.

## 9. Not done here

`reports-to` and any hierarchy of roles; `group`; the types the dropped sections point at
(`kpi`, `rule`, `process`, `legal-document`); a warning class in the mechanical checker;
experience's `role` string, which stays a string naming the part played at someone else's
company and is a different thing from this type; and any change to what a role a person held
in the past looks like — that is an experience, and `kind: Role` already names it.
