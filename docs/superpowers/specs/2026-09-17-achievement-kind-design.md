# `achievement-kind` — design

> An experience's achievements are one flat list, and nothing says what order it takes. Read
> across a profile, the same kind of claim sits first in one entry and last in the next, and a
> reader looking for what someone designed, or what came of it, reads every bullet of every
> entry to find it. Grouping the list fixes that, but which groups a career needs is a fact about
> that career, not about the meta-model. So the groups are entities an instance defines, and an
> experience's `###` headings reference them.

Status: proposed. Decided on 2026-09-17 against this repository at `4c65e24`, core 0.27.0, and against `robertblust/mental-model` at `eae807a`, where every experience's `## Achievements` was read bullet by bullet for its order and for the groups it falls into.

---

## 1. The gap

`experience-schema.md` says `## Achievements` holds "what was accomplished in this period" and that a bullet states an outcome, one idea each. It says nothing about order, and nothing about structure inside the section.

The reference instance shows what that leaves. Its entries hold 291 bullets at `eae807a`, from two to 38 an entry, and their order follows no one rule. Projects mostly run from what the work was, through what was designed and built, to what came of it, yet several put the design after the build. Roles are ordered by whatever thread the writer followed. The longest entry puts its headline scale seventh, among leadership bullets, and ends on a stack list that is not an achievement at all. None of this is wrong under the schema, which is the gap.

## 2. Why the groups are not core's

A first design wrote seven group names into `experience-schema.md` — the seven that fit every bullet of the reference instance. They fit that career and would not fit most others: a researcher's work groups by publication and grant, a salesperson's by territory and account. Core is the vocabulary every instance shares, and a list that holds one person's career is exactly what `AGENTS.md` keeps out of it.

Core already has the answer twice. `experience-kind` makes "what sort of period is this?" an entity: "the set is deliberately the instance's own … a kind arriving later is one file here, not a change to this metamodel and a release of it." `proficiency-level` makes an ordered set an entity, its order a `rank` field "spaced in tens so a rung can be added without renumbering the others." An achievement kind is both: an instance's own set, in an order.

## 3. The type

`core/achievement-kind-schema.md`, shaped on `experience-kind`:

- **File location** `model/achievement-kinds/*.md`. Nothing owns a kind and it owns nothing; it
  sits at the container root beside `experience-kinds/`, because every profile's experiences
  group by the same set.
- **Frontmatter** `source` (required, `ref → source`), `source-id` (optional, `string`) and
  `rank` (required, `number`): the kind's position in an entry, spaced in tens.
- **Sections** `# [Label]`, the canonical name every heading references; `> [Summary]`, what the
  kind covers in one paragraph; `## What it means`, which achievements belong and which do not.
- **Purpose** a kind answers "what sort of claim is this bullet?", and its value is that the
  answer is a reference: two bullets under the same kind mean the same sort of thing across
  entries, and changing what a kind covers is one edit.
- **Writing rules**
  - `## What it means` is written so two readers would file the same bullet under the same
    kind, and says what the kind excludes, since the boundary with the kind beside it is where
    every disagreement is. How to decide between two kinds lives here, in the instance.
  - A kind is about the sort of claim, never about how important it is. Importance is not an
    order the model can hold.
  - Name it for what the claims are — `Architecture`, `Results` — not for the section.
  - `rank` orders kinds within an entry and nothing else; two kinds never share a rank.

## 4. How an experience references it

A `###` heading is not a field and not a table cell, and today a schema can declare a reference in only those two places (R9, R16). A heading that names an entity needs a declaration of the same standing, or R4 — an unresolvable reference is an error — stops being true for it.

**R9 gains a third declared shape, the grouped section**, on the pattern of `Table.`:

- A section whose content is grouped under `###` headings that name entities says so in the
  sections table: its Description begins with `Grouped.`
- A caption line naming its section follows the sections table, as a column table's does —
  `` `## Achievements` is grouped under these headings: `` — then a table with columns
  `Heading | Required | Type | Description` and one row. The row's `Type` is `ref → <type>`;
  `Heading` names the reference, and is what the edge is called.
- A section marked `Grouped.` with no heading table, and a heading table for a section not so
  marked, are both errors, as with `Table.`.

**R16 gains one sentence**: a heading declared `ref → <type>` draws an edge from the page to the entity each `###` heading in that section names, via `<Section>.<Heading>`, and a heading that names nothing of its type is R4.

`experience-schema.md` then says:

| Section | Required | Description |
| --- | --- | --- |
| `## Achievements` | No | Grouped. What was accomplished in this period, as bullets under `###` headings that name achievement kinds |

`` `## Achievements` is grouped under these headings: ``

| Heading | Required | Type | Description |
| --- | --- | --- | --- |
| `Kind` | No | ref → achievement-kind | The kind every bullet below it is chiefly evidence of |

and its writing rules gain what holds for any instance:

- Where an instance defines achievement kinds, every entry with achievements groups them: each
  bullet sits under the heading of the one kind it is chiefly evidence of, headings follow the
  kinds' `rank`, and a kind with nothing in the entry has no heading. An instance that defines
  none writes a flat list.
- Every entry with achievements carries the headings, even one bullet under one heading, so a
  reader finds a kind in the same place in every entry.
- Within a kind the broadest claim comes first, peers follow the order they happened in, and a
  bullet that points back comes directly after what it points to — or names it, where the
  grouping would part them.
- A list of tools or a stack is not an achievement: what was built with a tool says so in the
  bullet that built it.

`Required` is `No` because an instance that defines no kinds has no headings; the first rule is what makes grouping mandatory where kinds exist.

## 5. Parser and checks

- **Parser** (`lib/instance.mjs`). The declaration walk reads a `Grouped.` section's heading
  table beside the column tables, told apart by its caption. The edge walk finds each `### `
  line in that section's text, resolves its name against the declared type and pushes
  `{ from, to, via: "Achievements.Kind", attrs: {} }`. The section's text keeps its headings, so
  every consumer that renders the text is unchanged.
- **Repository suite** (`verify/check.mjs`). R9 accepts the `Grouped.` token and its heading
  table, fails the two mismatches, and the type vocabulary check reads the heading table's
  `Type` cell with the others.
- **Instance checks** (`lib/checks.mjs`). Three shipped, not two: the two named below, plus a
  third the design left implicit — "the instance is held to what the schemas declare" (R16)
  gained the heading-hold, so a `###` heading that names nothing of its declared type is
  reported rather than left for the parser to throw on. The two new checks are both mechanical:
  headings in a grouped section follow the rank order of the kinds they name, and where the
  instance holds any achievement kind, no bullet in `## Achievements` stands outside a heading.
  Whether a bullet is under the right kind stays the agent pass's, because that is a reading.
- **Tests** for each, in the existing suites.

## 6. The example instance

It gains `model/achievement-kinds/` with a set of its own, drawn from its five experiences: `Decisions` (10), `Delivery` (20), `Sharing` (30), `Results` (40). Its bullets fall as: Mira at Northwind — Delivery, Results; Mira at Beacon — Delivery, Results; Tomas at Beacon — Decisions, Results; Tomas at Northwind — Decisions twice; Tomas at Orbit — Sharing. A set that differs from the reference instance's is the point: it shows the kinds are the instance's.

## 7. Cost

- **Release** core 0.28.0, a minor while core is below 1.0. The notes say an instance may define
  kinds and, if it does, groups every entry; one that does not is unaffected.
- **Consumers** that pin the parser — the reference instance's site and the MCP server — see
  a new edge kind on experiences and nothing else changes for them. Where prose about core lists
  its types, the new type is added there without a count.
- **The reference instance**, after its open pull request on claims is merged: re-vendor core in
  its three places; add seven kind files — `Context` (10), `Leadership` (20), `Architecture`
  (30), `Engineering` (40), `Ways of working` (50), `Sharing` (60), `Results` (70) — whose
  `## What it means` carries the definitions and tie rules settled with the Owner; then regroup
  every experience. Measured at `eae807a`: 21 entries change order, six back-references need
  rewording, one stack list goes, and two story-shaped entries trade their order of events for
  the kinds'.

## 8. Order of work

1. This specification, reviewed by the Owner.
2. A plan, then on this branch: the new schema, `experience-schema.md`, R9 and R16, the parser,
   the suite, the instance checks, tests, and the example's kinds and grouped experiences.
3. Release 0.28.0.
4. The reference instance, as §7 says.

## 9. Open questions

None on the design itself. The type name `achievement-kind`, parser resolution of headings, headings on every entry, the removal of stack lists and a minor release were settled with the Owner on 2026-09-17.

One thing this document got wrong and a whole-branch review then fixed rather than reopening: §5 said the instance checks were two, and three shipped — the R16 heading-hold was real work, just work this design did not think to count. The review that followed the branch added a fourth, generic over any type whose schema declares a `number` field named `rank`: two entities of one sharing a rank is a writing rule §3 states and nothing had checked. §5 now says three and names the fourth's origin here rather than in §5 itself, so a reader of the design sees the count it shipped with and the one count added after.
