# The profile's evidence is rows — design

> A skill claim rests on several engagements and says so in one paragraph, with each period
> typed into the sentence as a year in parentheses. Nothing can count the engagements the level
> was weighed against, and the year resolves against nothing. Evidence becomes a table of its
> own, one row per fact, each row naming the experience it came from.

Status: proposed. Decided on 2026-09-18 against this repository at `ed5b2b0` and against `robertblust/mental-model` at `5040f08`, core 0.28.0.

---

## 1. The gap

`## Skills` gives a claim three cells: the skill, the level and one string of evidence. The string is where every engagement behind the claim goes, and in the reference instance it has grown to hold as many as eight of them. The schema's own rule for reading a level says "evidence that names one engagement supports a lower rung than evidence that names three" — a rule about counting, stated over a column typed `string`, which nothing counts.

Each sentence in that cell ends with the period it belongs to, written as a year in parentheses. That parenthesis is the only thing joining the fact to the experience it came from, and it is a number copied beside a fact the experience already owns. It resolves against nothing, no check reads it, and the day an experience's dates are corrected the copy stays as it was. The model's rule against writing a number that still moves is broken here 216 times.

The cost is already being paid elsewhere. `mental-model-evidence-coverage`, a skill the reference instance carries because no rule can do its work, reads organization names out of evidence prose and matches them against the experiences that list the skill. Its own file gives the reason: the profile schema types `Evidence` as `string`, so R4 never reaches inside it. The join the model wants is being made by a reading pass over sentences.

Measured at `5040f08`: 70 claims, 216 evidence sentences across them and 216 years in parentheses, one to each sentence, against 38 experiences. Every claimed skill is listed by at least one experience and no experience lists a skill that is not claimed, so the join the prose is making is sound today — it is simply being made by hand.

## 2. Why rows and not bullets

The change was asked for as a bullet list per evidence, and that is the wrong shape by a hair. A table cell in this model is one line: `parseTable` splits each line on `|`, so a list inside a cell is unrepresentable, and the bullets would have to move into a grouped section of their own, the shape `## Achievements` uses. A grouped section renders bullets for nothing and reads well. It also carries no references: R16 draws edges from tables, and a bullet is prose.

That is the whole decision. Bullets would separate the facts and leave the year in the sentence doing the joining, which is the part that is broken. Rows separate the facts and give each one a column that resolves. Extending the parser so a bullet could carry a typed reference would buy both and was weighed and dropped: it is new declaration machinery for a shape the table already has.

| Option | Decision | Why |
| --- | --- | --- |
| A table, one row per evidence item | Taken | Separates the facts and resolves the period, on a shape the parser already has. |
| A grouped section, one bullet per item | Rejected | Separates the facts and leaves the year unresolved, which is the gap. |
| Bullets that carry a typed reference | Rejected | Buys both at the price of a new declaration form for a shape tables already have. |

## 3. The schema

`## Skills` loses its third column and becomes the claim alone.

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Skill` | Yes | ref → skill | Must match the H1 of a file in `skills/` exactly |
| `Level` | Yes | qualifier → proficiency-level | Must match the H1 of a file in `proficiency-levels/` exactly |

`## Evidence` is new and optional, one row per fact.

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Skill` | Yes | ref → skill | The claim this row stands under |
| `What it shows` | Yes | string | One sentence: the thing done, concrete enough to check |
| `Experience` | No | qualifier → experience | The period the fact comes from — the H1 of a file in this profile's `experiences/` |

The reference is `Skill`, so the row draws its edge to the skill exactly where the Skills row drew one, and `Experience` qualifies that edge without drawing a second. A table may declare one drawing reference, and this one does.

`Experience` is last because it is the optional column, and it is optional because a claim at the lower rungs can rest on having been near work rather than on having owned a period of it. Such a row keeps its sentence and leaves the cell blank. Where the cell is filled and the year in parentheses is the experience's own period, the year goes: it is read from the experience, and stating it twice is the fault this design exists to remove. A year that marks a shorter period of its own — a practice that ran for two years inside a four-year role — stays, because it is a copy of nothing.

The third column is `What it shows` rather than `Evidence` so that it does not restate the section it sits in, the same move `## References` makes with `What`.

A profile whose `nature` is `agent` carries neither table, for the reason it already carries no Skills table.

## 4. What is checked, and what is not

A column declared `Required: No` with a plain `qualifier → experience` is what this needs, and `qualifier?` is not a form in the declaration grammar: the `?` governs whether a value resolves, and `Required` governs whether there has to be one. `checks.mjs` already reads the pair correctly — it skips a blank cell and holds a filled one to its declared type.

**The parser does not, and one line of it changes.** `parseInstance` resolves every declared cell in a table row whether or not the cell is empty, so the first blank Experience cell throws `R4: "" … names no experience`, which the probe that wrote this section hit on its first run. Frontmatter has had the rule right all along — an empty field yields no value to resolve — and the table loop gains the same guard: a blank cell in a qualifier column keeps its empty value and is not resolved. Requiredness stays the checker's, which is where the schema's `Required` column is already read.

The reference column is deliberately left alone. A blank cell there is still the R4 it always was, because softening it would move a real error out of the parser to buy nothing.

What that buys, which the year never could: a row whose Experience names nothing, or names an entity that is not an experience, fails by name against the file it is in.

Two joins are deliberately left unchecked. That the experience is this profile's own, and that its `skills:` lists the skill the row stands under, would both be the first rule in `checks.mjs` to name a type — every rule there today is driven by what the schemas declare, and one change is not worth breaking that. They stay writing rules, and `mental-model-evidence-coverage` keeps them; its work shrinks from reading organization names out of prose to reading a column. The same is true of the rule that every claim has at least one row under it.

Writing rules on `## Evidence`: one sentence per row, stating a fact that can be checked, never restating the level, under forty words. Rows in the order the Skills table lists the skills, and chronological within a skill. A row whose sentence says no more than the experience's own name says nothing and is dropped rather than written.

## 5. The reference instance

Its 70 Skills rows lose a column, and its 216 evidence sentences become 216 rows, each matched to the experience it names. The coverage skill already performs that match, so it drives the migration rather than being run against the result.

Two kinds of row surface once the facts are separated, and both are the point. One is a row whose sentence restates its experience — `Certified SAFe 4 Practitioner` as evidence for a period named `Certified SAFe 4 Practitioner` — which says nothing once the link is beside it and goes. The other is a row whose experience is named by a role rather than an organization: `Co-Founder & CTO` is the H1 of the 3AP period, and a reader of the raw file sees the title without the company. The sentence still names 3AP and the rendered cell is a link, so the reader is carried; it is recorded here as known and accepted, not as a thing to fix in the experience's H1.

## 6. The example instance

Both profiles' Skills tables lose the column and gain an `## Evidence` table. Tomas's Product Discovery shows the gap without anything being staged for it: the claim is Expert, three of his experiences list the skill, and the evidence cell names one of them. Under rows it becomes three — Northwind, the Orbit talk and Beacon — and the Expert rung has three periods beside it instead of one, which is the change this design is for, in the file the schemas ship beside.

Tomas also claims Java Programming, and no experience of his lists it. That row keeps its sentence and leaves `Experience` blank. It is the case the optional column exists for, and the example is where the case is shown.

## 7. Cost

- **Release** core 0.30.0, a minor while core is below 1.0. The notes say the Skills table is
  now two columns, an instance moves its evidence into `## Evidence`, and a consumer reading the
  Evidence column by name reads a section instead.
- **This repository**: `profile-schema.md`, one line of `lib/instance.mjs` with a test for it,
  and the example's two profiles. The fixtures in `verify/instance.test.mjs` declare a profile
  schema of their own and are unaffected by the core schema moving.
- **`companygraph/mcp-server`**: no code change — `findEvidence` names no column and passes
  whatever the schema declares. Its `find_evidence` description and the row for it in the
  README say "Evidence verbatim" and need rewording, and five test assertions name
  `attrs.Evidence` or `attrs.Level`.
- **`robertblust/design`**: no change. `Level` stays in the Skills table, so the proficiency
  marks on skill chips keep finding it, and the generic table renderer draws the new section
  unaided.
- **The reference instance**: §5, then re-vendor core in its three places, regenerate
  `model.json` and the export bundles, and reword the two export files that tell their reader to
  look at "the Evidence cell in Profiles.md".

## 8. Order of work

1. This specification, reviewed by the Owner.
2. A plan, then on a branch here: the parser guard and its test, the schema, the example's two
   profiles.
3. Release 0.30.0.
4. The reference instance, then the MCP server, then the site.

## 9. Open questions

The reference instance's `## Evidence` renders as one table of 216 rows. Grouping rows by their first column at render time belongs to `robertblust/design` and is a follow-on, not a condition of this change.

Whether the two unchecked joins of §4 should become a rule is left open until the column has been lived with. The argument for waiting is in §4; the argument against is that a writing rule kept by a skill is the thing this design just removed one of.

One thing this document got wrong and a whole-branch review then fixed rather than reopening: §7 named `profile-schema.md`, the parser line and the example as this repository's cost, and missed two more — the workflow's own release pin, which a release commit has to move together with `core/manifest.json` and `package.json` and had not been, and four places in `core/skill-schema.md`, `core/CONVENTIONS.md` and `bin/check-instance.mjs` still describing evidence as a cell or column of the Skills table after this design moved it into a table of its own. The review fixed both directly rather than through §7, so a reader of the design sees the cost it shipped with and what a review found missing from it after.

The release number moved as well. While this branch was open, v0.29.0 was tagged for a change to the package alone, with core left at 0.28.0, so the number was taken and core and the package had parted. This change moves both, and both go to 0.30.0: core passes over 0.29.0 so that a release carries one number again. §7 and §8 name the number it shipped with, and the reason is kept here.

The rule on the year was narrowed after the branch was built. Previewed against the reference instance, the first form of it would have erased five periods shorter than the experience they sit in, among them the years Camunda ran inside LIKE MAGIC, and the example had already lost the year that named Tomas's 2023 roadmap to it. §3 and the schema now drop only a copy of the experience's own period, and the example has its year back.
