# `surface` — design

> The model says what a company is and nothing says how it is shown. Where a script writes a
> surface the script holds that answer; where no script can, it is held in a person's head and
> drifts. One new type, for the second case only, written so an agent can produce the surface
> from it.

Status: proposed. Decided on 2026-09-09 against this repository at `main` and against
`robertblust/mental-model` at `616ff42`. The disagreements in §1 were read off the live
LinkedIn profile on 2026-09-09 and counted.

---

## 1. The finding

The reference instance's vision claims that every surface a reader can reach derives from one
model, and that when a surface and the model disagree the model is corrected and the surface
rebuilt. Core has a schema for what the company is — an identity, profiles, experiences,
skills, values — and none for how it is shown. The derivation rules live outside the model
entirely.

For most surfaces that is correct and should stay. blust.ch is written by a build in its own
repository, and the skill bundle by an export script: the script *is* the projection, it runs
on every change, and a file in the model restating it would be a second copy of a rule that
already executes. Core's own conventions forbid restating what lives elsewhere.

The gap is the surface no script writes. Read the reference instance's LinkedIn profile against
its model in one pass and it disagrees in seven places, none of them recorded anywhere:

| What | The model | The surface |
| --- | --- | --- |
| A talk's date | one day | the other day of a two-day conference |
| A snowboarding job, 1997–1999 | absent | shown |
| A volunteering period, 2001–2008 | absent | shown |
| Two languages | absent | shown |
| Skills | 70, under their own names | 56, and five names of the surface's own above them |
| Deliveries | 12 of kind `Project` | 8 |
| The About text | the profile summary | a rewrite, one sentence of it dropped |

None of those is a defect on its face. Six are decisions somebody made once and never wrote
down, and the seventh is a question. The one that cannot be settled by looking is the last one:
a sentence of the model's summary is missing from the surface, and there is no way to tell
whether that was chosen or forgotten. That is the failure this type addresses. **An omission
with no recorded reason is indistinguishable from drift**, and the reader who has to tell them
apart is always the person with the least time.

There is also a presentation invariant with nowhere to live. The instance's canonical name is
shared with a notable deceased academic, so every unit of a surface that can appear on its own
must pair the name with something that resolves it. That constraint exists as intent, is
satisfied by some units and not others, and is held in no file.

**What the finding does not support.** The brief that started this work asked for the state of
the live surface to be recorded in the model, as markers naming what the surface currently
shows. Between that brief being written and the surface being read, two of its three stated
defects had already been fixed, and a third was fixed while the reading was being discussed. A
file recording what a surface showed on a Tuesday is wrong by Wednesday and nothing in the
repository can see it go wrong — which is the drift this model exists to prevent, reintroduced
one level up. The type therefore holds rules and constraints, which survive a rebuild, and
never observations, which do not.

## 2. What a surface is

A surface is a place the company publishes that **no script writes**. That is the whole test,
and it is the reason the type is narrow.

Where a build writes the surface, the build holds the projection: it is executable, it is
checked by that repository's suite, and it cannot silently disagree with itself. Where no build
can — a network profile with no write API, a document a person assembles, a printed page — the
projection has no home, and every rebuild is somebody reading the model and retyping it. The
file is what that reader needs: an agent producing the surface's content works from it, and a
person checking the result reads the same file.

The test cuts cleanly and it cuts both ways. A surface that becomes scriptable loses its file,
because the script then holds the rules and two copies of a rule is the condition the model
exists to end. A surface file is not a place to record that a surface exists — `## Also at`
already does that, on the identity and on the profile, and the two are separate concerns: one
says the company is reachable there, the other says what that place shows and how it is made.
The address appears in both, and that duplication is accepted; the alternative was to make
every listed presence an entity, which taxes the common case to serve the rare one.

## 3. The schema

`core/surface-schema.md`, in the shape R9 fixes.

**File location.** `model/surfaces/*.md`, one file per surface. Nothing owns a surface and a
surface owns nothing, as with `source`.

**Frontmatter.**

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source |
| `url` | No | string | Where the surface is published, absent where it has no address |

**Sections.**

| Section | Required | Description |
| --- | --- | --- |
| `# [Surface]` | Yes | The canonical name. Everything references the surface by this exact string. |
| `> [Description]` | Yes | Single-line description of what this surface is and who reaches it |
| `## What it shows` | Yes | One line per unit the surface presents, naming the unit and what fills it |
| `## Projection rules` | Yes | How the model becomes this surface: what is carried, what is left out, and why |
| `## Constraints` | No | What the published result must satisfy, each written so a reader can pass or fail it |

**Purpose.** A surface is a place the company publishes that no script writes, and the file is
what somebody needs in order to write it: which of the model's facts reach it, in what shape,
and what the result has to satisfy. It answers "if I had to rebuild this from the model today,
what would I have to know?" — for a person, and for an agent producing the content. It is not a
record of what the surface currently shows.

**Writing rules.**

- A line of `## What it shows` names a unit the surface itself has, in the words the surface uses
  for it, and then what fills it. A reader has to be able to find the unit by that name while
  looking at the surface.
- A projection rule states what the surface does with the model, not what the model contains. A
  rule that could be read off an entity is a fact restated, and the entity is where it lives.
- Every omission is a rule with a reason. Silence about something the model holds and the
  surface does not show is indistinguishable from drift, which is the one thing this type is
  for.
- A constraint is written as a check: something a reader looking at the published result can
  pass or fail. "Every unit that can appear alone pairs the name with a role or a domain" can
  be failed; "the tone is professional" cannot.
- Where the surface imposes a limit, the constraint names the number and where the number was
  read. A limit quoted from memory is a claim like any other.
- The file never states what the surface currently shows. That is an observation, true on the
  day it was written, and it belongs in the report a validation pass produces (R0).
- A surface that a script writes has no file here. The script is the projection, and a second
  copy of a rule is what this model exists to end.

## 4. Why this shape

**A folder type, owned by nothing.** Surfaces are many and each is cited by name. Nothing about
a surface belongs to one profile: a company of one hundred has a careers page and a company of
one has a network profile, and both are the company's decision about what it shows. Making the
type owned would have forced the instance to answer whose it is before it could write one.

**`## What it shows` is a list and not a table, and that is forced twice over.** A table would
want a column naming what fills each unit, and the closed vocabulary in R9 types every reference
at one type — `ref → skill`, never `ref → any`. One unit is fed by entities of several types at
once and rows of one table would point at different types, so no column can carry the reference
and the column would have to be `string`.

A string column is where the second reason bites. The parser reads a table as references the
moment **any** cell of **any** row resolves to an entity, and then a row where nothing resolves
is an R4 error. The natural thing to write in such a cell is a canonical name — `Decide well
over build fast` is what fills a headline — and one cell written that way flips the whole
section to references and fails every other line, with the error naming a row that is not the
one at fault. `## Also at` accepted the same hazard because a place sharing a name with an
entity is rare; here it is the common case, since the content of this section is model entities.

The fix that would make a table safe is the one the `## Also at` design named and deferred: a
table whose declared columns carry no `ref →` type is data by declaration. That fix requires the
parser to read schemas, and the parser's first line still says `No schema is consulted.` Making
it do so is a larger change than a new type should carry, and this design does not make it. A
list has no table for the rule to apply to, needs no parser change and cannot fail this way.

**`## Projection rules` is required and `## Constraints` is not.** A surface with no projection
rules is a link, and a link is `## Also at`. A surface with no constraints is ordinary: not
every place imposes one, and a required section that is empty half the time teaches a reader to
skip it.

**Not `## References`.** An experience's references document the period. A surface’s lines are
not documentation of the surface; they are the instructions for making it.

**Not a `source`.** A source is where a fact is mastered. A surface masters nothing — that is
R17 — and the two would be opposites wearing one name.

## 5. R17

CONVENTIONS.md gains one rule, at the end of `## Structure`. R16 is the highest number in use,
so this is R17 and nothing is renumbered.

> ### R17 — The model is the master
>
> Everything made from the model — a page, a profile, a document, a bundle — shows the model's
> facts and none of its own. Where a made thing and the model disagree, the model is corrected
> and the thing rebuilt; the made thing is never edited on its own. A fact that lives only on
> something made from the model is a fact no reader of the model can find, and the next rebuild
> deletes it.
>
> A file in the model therefore records the rules by which something is made, and never the
> state of the thing made. "The published page currently shows June" is an observation: true on
> the day it was written, and unfalsifiable afterwards by anything in the repository. It belongs
> in the report a validation pass produces (R0). What belongs in a file is what stays true after
> the next rebuild.

The rule names no type, which is why it is a convention rather than a writing rule on the new
schema. It is the claim the model already makes about itself, and the surface type is the first
thing that leans on it.

## 6. Parser, checks and the example

**No parser change.** A surface is an ordinary entity: frontmatter, an H1, a tagline and
sections, and it declares no table at all. The `source` field draws its edge as on every other
type, and nothing else on the page resolves. §4 says why the absence of a table is deliberate
rather than incidental.

**Shape checks.** `npm run verify` holds the new schema to R9, and to R15 and R16 against the
example, the same as every other type. What it cannot check is whether a projection rule is
true of the surface, or whether a constraint is met: both need something outside the repository
to be read.

**The example.** Beacon Systems gets `example/model/surfaces/` with one file, so the type ships
with a worked instance as every other type does. Its surface is one no script writes and its
constraints are generic.

## 7. The instance

`robertblust/mental-model` re-vendors core, recomputes its manifest hashes and creates
`model/surfaces/` with one entity, `linkedin.md`. The validate skill runs before the commit, as
the instance's agent file requires.

Two surfaces get no file, by the test in §2: blust.ch is written by a build in its own
repository, and the skill bundle by `companygraph-export`.

The LinkedIn entity carries, as rules and constraints:

- The About section is a rewrite of the profile summary, in the surface's register, and one
  sentence of the summary is not carried. The rule states which and why.
- The surface's Projects section is not the model's kind `Project`: it also carries the open
  tools of the career break, which the model holds as kind `Community` because their audience
  is public. The two words collide and the rule is what keeps them apart.
- Deliveries shown are a subset, and the rule names the basis for the subset.
- The top skills are five names of the surface's own, each a grouping of model skills; the rule
  carries the mapping.
- A project entry can state one period, so a project run inside another period carries that
  period's dates.
- The name is shared with a notable deceased academic, so every unit that can appear alone —
  the headline, a search snippet, a share card — pairs the name with a role, a domain, a project
  or a location. This is a constraint, and the current headline does not meet it.
- The platform's limits on the headline and the About section, read off the editor and written
  down.

**Open, for the model's owner.** Whether the CV is a surface of this kind or an artifact a
script writes decides whether it gets a file. Whether the model gains the snowboarding job, the
volunteering period and the two languages, or the surface drops them, is a question about the
model and not about this type.

## 8. Version

Core goes to **0.16.0**, a minor. The type is new and no existing type changes, so every
instance on 0.15.x conforms under 0.16.0 without touching a page; an instance takes it by
re-vendoring `core/` and recomputing its manifest hashes. The parser is unchanged, so a
consumer moves its pin and reads the same shape.

## 9. What no check reaches

**Whether a projection rule is true.** Nothing in the repository can open the surface. A rule
saying the About section is a rewrite of the summary is checkable only by reading both, and the
reading is an agent's or a person's. This is the type's central limitation and it is inherent:
the surfaces that need the type are exactly the ones no script can reach.

**Whether a constraint is met.** The same, and worse, because a constraint is about the produced
text rather than about the model. The type's contribution is that the check is now written
down and can be run; it does not make it automatic.

**Whether `## What it shows` names anything that exists.** Its lines are prose, so an entity
renamed out from under one leaves a line pointing at a name nothing answers to, and no check
sees it: R4 reaches references and this section has none, by the decision in §4. The agent pass
is what catches it, and the writing rules are phrased so that it can. This is the price of the
list, and it is paid knowingly: the alternative failure — one cell flipping a table to
references and failing every other line — is louder but lands on the wrong line and stops the
whole instance parsing.

**Whether a surface should have a file at all.** The test in §2 is a judgment about whether a
script could write the surface, and a judgment is not checkable. The cost of getting it wrong is
a rule in two places, which is the condition the test exists to prevent.
