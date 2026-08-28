# Schema purpose and writing rules — design

> Every core schema says the *shape* of an entity and nothing about its *purpose* or *how to
> write one*. The reference instance showed that shape alone does not produce usable
> entities. This proposes one new section per schema, and writes the first one — for
> `skill` — from the rules the instance settled.

Status: done, in `v0.3.0`. §4 landed first as R11 and R12 in `v0.2.0`, with two corrections it
needed and one placement reversed — the note at the end of §4. All six schemas then carried the
pair, one PR each, written against their own evidence: of the five sketches in §5, one was
right in every part, three gained rules the sketch did not have, and one had a rule reversed by
the files it was written about.

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

Written from what `robertblust/mental-model` settled in re-cutting its 23 skills to 75, and
reviewed row by row over all of them. The instance's findings are recorded in
[`2026-08-26-reference-instance-design.md`](2026-08-26-reference-instance-design.md) §7.

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

### What §4 became

Both halves landed in `v0.2.0`, and building them corrected the proposal twice.

- **R11** is the block-sequence rule as proposed, enforced mechanically by `verify/check.mjs`.
- **R12** is the filename derivation, and it is in `CONVENTIONS.md` rather than the tooling
  spec's `add` as proposed here. A filename is written by whoever writes the file, and the
  first instance was written by hand: a rule only a program can consult is not a convention.
  The tooling spec points at R12 instead.
- **An `experience` does not derive from its H1**, which the derivation above assumes of
  everything. `example/` files `2018-northwind-atelier.md` under the H1
  `Rebuilding the order pipeline` — the name is the start year and the organisation, so the
  folder sorts chronologically. R12 therefore defines the *slug*, states the H1 as the
  default, and lets a type declare its own derivation in its own schema.
- **A collision is per folder, not per type.** Scoping it to the type, as this proposed,
  failed the repository's own example: two profiles each hold a 2022 experience at Beacon
  Systems and both files are correctly named.

---

## 5. The other five, to be written

The instance's build reports carry the material for each; the texts are not drafted here so
that each is written against its own evidence, not by analogy with `skill`:

- ✅ **`profile`** — written. The three sketched here held, and the instance's table added
  three the sketch did not have: a level is weighed against the evidence beside it rather than
  against how long the person has done it (two of the instance's levels came down for resting
  on a single role); a skill with no evidence has no row, because the table *is* the claim;
  and the person-neutrality of `skill` has a matching half here — the history lives in this
  table and nowhere else. `example/`'s two profiles already satisfied all six, which the three
  skills did not.
- ✅ **`experience`** — written. The first two sketched rules held. The third was wrong: the
  instance gives a one-off `end` equal to `start` rather than leaving `end` absent, which is
  the only thing that stops a talk reading as still running — a tagline saying it was a talk
  does not reach the field a reader filters on. The tagline rule survives on the other side:
  a period *still running* says "Ongoing." there, because an absent field is not something a
  reader sees. `example/` gains a talk, since a rule its example never shows is a rule adopters
  get wrong.
- ✅ **`proficiency-level`** — written. All three sketched rules held. Two came from reading the
  four rungs themselves: every one is written about "it" rather than about a skill, which is
  what lets one ladder serve every claim — and, incidentally, what would let it serve a type
  that is not `skill` at all. And each rung names what it has that the rung below does not,
  which is the difference between a ladder and four adjectives. Added: a rung is about
  capability and never about seniority, tenure or title.
- ✅ **`value`** — written, and the only one of the five this sketch got right in every part;
  it needed no correcting. Two things it did not have. The statement rule: a statement is a
  sentence someone could disagree with, which is what separates a value from a slogan. And a
  finding — `example/` disagreed with the instance on form and with itself. Its statement line
  read "**We** would rather ship one thing that holds up", while its body dropped the pronoun
  for "Following it looks like … / Breaking it looks like …". That form describes a value
  instead of committing to one, and nothing can be held to a description. Both example values
  are rewritten to the first person the rule states, in the "We" a company of more than one
  uses.
- ✅ **`source`** — written. The sketched rule held and three joined it, one of them answering
  a §7 finding. §7 records that a `source-id` "makes the field a pointer for a person and
  unchecked by anything". Nothing can check it — but the source can say what one *is*, and the
  instance's `rob-cv` already does: "`source-id` is the entry's `id` in its `content/` folder".
  That is now a rule, and `example/`'s Google Workspace source failed it — two profiles carry a
  `source-id` there and nothing said what the number was.

---

## 6. What changes, and where

- ✅ `CONVENTIONS.md` R9: the two sections added to the fixed shape, after `## Sections` and
  its tables, in that order, with those names — as a pair or not at all.
- ✅ `CONVENTIONS.md`: the block-sequence rule of §4 as R11, and the filename derivation as
  R12 — in `CONVENTIONS.md`, not the tooling spec.
- ✅ `example/`: its experiences' `skills:` lists rewritten as block sequences.
- `core/*-schema.md`: each gains the two sections; `skill` from §3 ✅, the other five drafted
  against §5 and the instance's evidence.
- ✅ `example/`: its three skills rewritten to the `skill` rules — the example is what adopters
  copy.
- ✅ `verify/check.mjs`: asserts the two sections sit in that order after the tables, and that
  `## Writing rules` is a list. Required of every core schema as of `0.3.0` — until all six
  were written a missing pair was work not yet done; from here it is a pair that was lost. It
  does not read the rules; that is the agent's.
- `.claude/skills/companygraph-validate` (in the tooling spec §5): reads `## Writing rules`
  per type and reports per rule, the same way it reports R1–R12. Not done: the skill lives in
  the instance and in a tooling repository that does not exist yet.
- ✅ Release: a MINOR bump per the tooling spec's §2 rule — `example/` is rewritten in three
  types and every core schema grows required prose, so an instance vendoring core has files to
  change. `0.2.0` went to §4; this is `0.3.0`, cut once all six schemas carried the sections
  rather than once per schema.

---

## 7. Open

- Whether `## Purpose` belongs in the schema or in the README of the type's folder that
  `init` writes. Here: the schema, because the schema is what gets vendored and versioned.
- Whether writing rules that recur across types (person-neutral; concrete over adjective)
  become conventions with R-numbers. Not yet: three types is not a pattern.
