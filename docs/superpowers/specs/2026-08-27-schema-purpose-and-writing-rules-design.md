# Schema purpose and writing rules — design

> Every core schema says the *shape* of an entity and nothing about its *purpose* or *how to
> write one*. The reference instance showed that shape alone does not produce usable
> entities. This proposes one new section per schema, and writes the first one — for
> `skill` — from the rules the instance settled.

Status: proposal. Nothing in core changes until this is agreed; the instance that produced
it (`robertblust/mental-model`) carries the rules in its own spec meanwhile.

Reads against [`2026-08-23-companygraph-design.md`](2026-08-23-companygraph-design.md) §5
(schemas are Markdown, enforced by agents) and `CONVENTIONS.md` R9 (the fixed shape). It
adds to the shape; it changes nothing the fixed-shape reader depends on.

---

## 1. The finding

The reference instance wrote 23 skills against `core/skill-schema.md`, which describes
`## In practice` as "what someone using this skill actually does". Every one of the 23 read
that as *what this person did*: one person's employers, years and numbers, in a file that
many profiles are meant to claim. The schema's shape was satisfied in every file; every file
was wrong.

The same instance then found that the profile's Skills table — level plus evidence, per
person — is where that history belongs, and that a skill file has to be **person-neutral** to
be claimable by a second profile at all. Nothing in the schema said so, because a schema in
the R9 shape has nowhere to say it: it lists fields and sections, and a one-cell Description
per row.

That is a gap in every core type, not only `skill`. A `value` schema that says `## In practice`
is "what following this value looks like, and what breaking it looks like" is already
half-way to a writing rule; a `profile` schema that says Evidence is required "because the
adjective on its own measures confidence rather than skill" is stating a purpose. They are
scattered in Description cells and in the prose under `## File Location`, where the reader
that checks the shape does not look and the agent that writes an entity may not either.

---

## 2. The proposal: two sections, one place

Each schema gains, after `## Sections` and its tables, two prose sections in fixed order:

```markdown
## Purpose

<What this type is for, in one paragraph: what question an entity of it answers, who reads
it, and what it must not become.>

## Writing rules

<A list. Each rule one sentence, checkable by an agent reading the file; the rules that
distinguish a good entity of this type from one that merely has the shape.>
```

Decisions inside that:

- **Fixed position, fixed names.** R9 grows by two optional sections at the end. The
  fixed-shape reader ignores everything after the tables it reads, so nothing in `tooling`'s
  `add` or `check` changes; `companygraph-validate` — the agent pass — reads them, which is
  the point.
- **Purpose is one paragraph.** It is the sentence an adopter needs before writing their
  first entity of the type, not a design rationale; the rationale stays in the spec.
- **Writing rules are checkable.** "Person-neutral: no name, employer, date or number from
  any profile" is checkable by reading; "write well" is not. A rule that cannot fail is not
  written.
- **Rules are about prose, never about shape.** A field being required is the table's
  business; a rule says what goes *in* it.
- **Optional for a type, present for every core type.** An adopter's own pack may omit them;
  core does not, because core is what gets copied.

---

## 3. The first one: `skill`

Written from what `robertblust/mental-model` settled and reviewed row by row over 60 skills.

```markdown
## Purpose

A skill is a capability a person can claim and an experience can evidence — one file, named
once, referenced by every profile that claims it. It answers "what is this, and what does
doing it look like?" for a reader who may claim it, assess it or hire for it. It is not any
one person's history with the capability: that lives in the profile's Skills table, as a
level and an evidence cell, and in the experiences that list the skill.

## Writing rules

- The tagline starts with the thing itself, never with a wrapper — not "The practice of",
  "The discipline of", "The ability to".
- `## In practice` is person-neutral: no name, employer, date or number from any profile.
  A second profile must be able to claim the skill without a word changing.
- `## In practice` is written in the imperative without a subject — "Assess …",
  "Translate …", "Engage …" — never "Someone doing this …" or "They …".
- Products and tools appear only in a closing clause of the form `Typical tools: …`, and
  only where a product is what the skill is done with. A product is not a skill.
- One skill is distinct from its neighbours in what someone doing it does, not in which
  product they use. Two files that differ only by tool are one skill.
- Where a public vocabulary names the same skill, cite it on one final line in the fixed
  form `Reference: SFIA 9 <CODE> — <name> · ESCO <label> <URI>`, with `none` for a source
  that has no match. A broader parent is not a match. Never reproduce the source's text.
```

The reference line is a writing rule and not a field because the meta-model has not decided
what a skill is anchored to — `group` is still "deliberately open". When it decides, the line
becomes fields and the rule says so; the fixed form is what makes that a mechanical change.

---

## 4. The other five, to be written

The instance's build reports carry the material for each; the texts are not drafted here so
that each is written against its own evidence, not by analogy with `skill`:

- **`profile`** — purpose: the one page that says who this is and what they claim; rules:
  Evidence is a concrete fact (a number, a system, a named outcome) and never the level
  restated; a level follows a stated rubric; the summary is the person's, not the
  organisation's.
- **`experience`** — purpose: one dated period evidencing skills; rules: every skill listed
  is one the bullets show; bullets state outcomes, one idea each; a one-off (a talk) has no
  `end` and the tagline says it was one.
- **`proficiency-level`** — purpose: one rung of a ladder every claim shares; rules: `## What
  it means` is written so that two assessors would place the same person the same way; a
  rung may name the levels of an external ladder it spans, never reproduce their text.
- **`value`** — purpose: a value something can cite; rules: the two halves, following and
  breaking, are both concrete situations, not adjectives.
- **`source`** — purpose: where a page's facts are mastered; rules: the description says what
  the source holds and whether anything syncs it.

---

## 5. What changes, and where

- `CONVENTIONS.md` R9: add the two optional sections to the fixed shape, after `## Sections`
  and its tables, in that order, with those names.
- `core/*-schema.md`: each gains the two sections; `skill` from §3, the other five drafted
  against §4 and the instance's evidence.
- `example/`: its three skills rewritten to the `skill` rules — the example is what adopters
  copy.
- `verify/check.mjs`: asserts the two sections exist on every core schema, in order, after
  the tables, and that `## Writing rules` is a list. Does not read the rules — that is the
  agent's.
- `.claude/skills/companygraph-validate` (in the tooling spec §5): reads `## Writing rules`
  per type and reports per rule, the same way it reports R1–R10.
- Release: `0.2.0` — a vocabulary change, minor bump, per the release policy.

---

## 6. Open

- Whether `## Purpose` belongs in the schema or in the README of the type's folder that
  `init` writes. Here: the schema, because the schema is what gets vendored and versioned.
- Whether writing rules that recur across types (person-neutral; concrete over adjective)
  become conventions with R-numbers. Not yet: three types is not a pattern.
