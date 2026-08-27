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
- Public vocabularies (SFIA, ESCO, O*NET, Lightcast) may be consulted to find the grain and
  to check for gaps; none is cited or reproduced in a skill file. The vocabulary is the
  instance's own.
```

---

## 4. A convention, not a writing rule: lists of references are block sequences

Found while building the same instance. Three of its skill names contain a comma —
`Software modeling (UML, SysML, C4)` — and in a YAML flow list, `skills: [A, B (C, D)]`, such a
name splits into fragments with no parse error. R4 caught it only because the fragments
resolved to nothing; the day `SysML` is a skill of its own, the fragments resolve and the
claim is wrong with nothing to say so. Quoting the entry fixes one file and is a rule people
forget. A block sequence has no quoting hazard at all:

```yaml
skills:
  - API design
  - Software modeling (UML, SysML, C4)
```

Proposed for `CONVENTIONS.md`, as a new rule under Schemas: **an `array` or `array of ref`
frontmatter field is written as a block sequence, one entry per line; a flow list is an
error.** It is a shape rule, so the tooling's `check` enforces it mechanically — any `[` after
such a field — and the agent pass never reasons about commas. A diff then shows one line
per reference added or removed, which is the other reason to want it. The reference
instance already writes its lists this way.

### Filenames: one derivation, written down

The same instance filed `Data protection (GDPR)` as `data-protection-gdpr.md` and `CI/CD` as
`ci-cd.md`. Three documents say "the filename is the kebab-case of the H1" — the tooling spec's
`add`, the instance's spec, the validate skill, which asserts it — and none says what
kebab-case does to a parenthesis, a slash, an ampersand, an umlaut or a comma. R2 and R3
rightly make the filename *not* the name; but once `add` computes it and `check` verifies the
folder form ("an entity's own file is named for its folder"), the derivation must be exact or
two tools disagree about the same file.

Proposed, as the one definition, in the tooling spec's `add` with `CONVENTIONS.md` pointing to
it: **the filename is the H1 lower-cased, with every run of characters outside `a–z` and `0–9`
replaced by a single `-`, and leading or trailing `-` removed; an experience is prefixed with
its start year and `-`.** Examples: `Data protection (GDPR)` → `data-protection-gdpr`,
`CI/CD` → `ci-cd`, `Software modeling (UML, SysML, C4)` → `software-modeling-uml-sysml-c4`,
`Zürich office` → `z-rich-office` — the last is ugly and is the point: a non-ASCII letter
drops rather than being transliterated, so two implementations cannot differ on how. Two H1s
that derive to the same filename are an error, reported by `check`.

---

## 5. The other five, to be written

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
  rung is defined in the instance's own words; no external ladder is cited.
- **`value`** — purpose: a value something can cite; rules: `## In practice` is two
  paragraphs, `Follow:` and `Break:`, each one concrete situation in the imperative — "Follow:
  write the decision down before the code …", "Break: ship a feature in a day and argue about
  it for a quarter …" — never "Following it looks like …"; situations, not adjectives.
- **`source`** — purpose: where a page's facts are mastered; rules: the description says what
  the source holds and whether anything syncs it.

---

## 6. What changes, and where

- `CONVENTIONS.md` R9: add the two optional sections to the fixed shape, after `## Sections`
  and its tables, in that order, with those names.
- `CONVENTIONS.md`: the block-sequence rule of §4, numbered after R10, and a pointer to the
  filename derivation, which lives in the tooling spec's `add`.
- `example/`: its experiences' `skills:` lists rewritten as block sequences.
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

## 7. Open

- Whether `## Purpose` belongs in the schema or in the README of the type's folder that
  `init` writes. Here: the schema, because the schema is what gets vendored and versioned.
- Whether writing rules that recur across types (person-neutral; concrete over adjective)
  become conventions with R-numbers. Not yet: three types is not a pattern.
