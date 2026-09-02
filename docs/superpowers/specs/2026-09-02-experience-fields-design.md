# Fields on `experience` — precision, kind and references — design

> Three findings on one type, two of them open since the reference instance was built: a date
> form that coerces a year into a month, a type that holds four different things without saying
> which, and nowhere to put a link. One schema, one version.

Status: proposed, nothing built. Changes `core/experience-schema.md` and one paragraph of
`CONVENTIONS.md`. The first two resolve findings recorded in
[`2026-08-26-reference-instance-design.md`](2026-08-26-reference-instance-design.md) §7; the
third was found while resolving them.

Written from a second pass over a company-of-one instance, a year after its first. Nothing
instance-specific is reproduced here: what follows is the pattern each finding turned out to be.

---

## 1. The findings, as they were recorded

> **Core, `date`** — the CV keeps years; the schema wants months. The coercion to `-01` is a
> false precision the model now asserts.

> **Core, `experience`** — a degree, a certification, a board seat and a conference talk are
> each a dated period with an organisation, and the type holds them […] What stays open is
> whether a talk or a certification is an `experience` at all; the remaining clusters may say
> otherwise.

Both were written down without a fix, as that spec's §7 asks. Both are now decidable, because
the instance has run for a year and the damage each one does is visible rather than predicted.

---

## 2. Date precision

### What the coercion actually costs

The finding names one direction: a source that states a year becomes `YYYY-01`, and the model
asserts a month nobody wrote down. That much was known.

The second direction is what makes the rule wrong rather than merely lossy. **The same form
discards precision that exists.** A talk happened on a day. A certificate names an issue date
and an expiry date. A conference was held on a date its programme states. An employment
reference names the day the period closed. None of that fits `YYYY-MM`, so every one of those
dates ends up in prose — written a second time, inside an achievement bullet, at a precision the
field could not hold. The entry then states its date twice, and only the vaguer of the two is
queryable.

A rule that is wrong in both directions at once is not a rule that needs tightening. It is
measuring the wrong thing: **precision is a property of the source document, not of the field
and not of the kind of entry.**

### The change

`date` is `YYYY`, `YYYY-MM` or `YYYY-MM-DD`.

Stated in `CONVENTIONS.md` R9, beside the type vocabulary, rather than in a schema's Description
column:

> `date` is `YYYY`, `YYYY-MM` or `YYYY-MM-DD`. A date is written at the precision its source
> states and never at more; an author may deliberately record less. A shorter form is an
> interval, not a point: `2002` is the whole year, and comparisons take its earliest instant, so
> `2002` orders before `2002-03`.

`experience-schema.md` then drops the form from its two Descriptions and keeps the meaning.

Two things the wording is careful about:

- **Precision is a ceiling, not a floor.** "Never more than the source" makes a coerced `-01`
  illegal without forcing a day onto every employment period whose reference names one. An
  instance that renders months should be free to record months.
- **A partial date is an interval.** Anything that sorts or compares has to know that `2002` is
  not `2002-01-01`. Naming it in the rule is what keeps two implementations agreeing.

### A smaller finding underneath it

`CONVENTIONS.md` names `date` in the closed type vocabulary and **never says what a date looks
like**. The form lives in the Description column of one field in one schema. Two schemas could
type a field `date` and mean different things, and no rule would be broken. It has cost nothing
so far only because `date` has exactly two uses in core. Fixing the form is the occasion to put
it where it belongs.

---

## 3. `kind`

### The finding, answered

A degree, a certification, a board seat and a talk are all dated periods, and the open question
was whether they are `experience` at all. They are. The alternative is four types, and under R5
and R6 that means four folders inside the owner — where the experience schema's own reason for
its filename rule, that *"the folder then sorts chronologically and reads as a career"*, is
spent. One folder, one timeline, is worth keeping.

But holding four things in one type without saying which is a real loss, and it shows up the
moment an instance imports from a source system that already draws the distinction. A CV filed
in four categories — roles, projects, education, public work — arrives as one flat folder with
the category dropped. "Which of these are jobs?" then cannot be answered without reading every
body and judging, and a graph is built to be read by things that do not judge.

### The change

```
| `kind` | Yes | enum | What sort of period this is: `role`, `project`, `community`, `education` |
```

- **`role`** — a position held in an organisation.
- **`project`** — a delivery inside a role, worth naming on its own.
- **`community`** — work in public: a talk, a board seat, a working group, a published case.
- **`education`** — a degree, a certification, a course.

`role` rather than `experience`, because a token named for its own type says nothing.

### An enum, not four types

R8 draws the line — *"A set whose members carry a definition of their own is not an enum — make
it a type"* — and core holds both sides of it already. `proficiency-level` is a type because
each rung carries a rank and a rubric that every claim would otherwise restate. A kind carries
one line of gloss and nothing that needs a file of its own. Bare tokens.

`kind` would also be the **first `enum` field in core**. R8 has had no subject since it was
written.

### Required

`Yes`. An optional `kind` produces untyped entries and a fifth case every consumer must handle,
which is the situation it was meant to fix. This is the breaking half of the proposal: every
existing instance fills a field on every experience.

### It governs no dates

A one-off keeps `end` equal to `start`, which core already carries as a writing rule and which
the reference instance settled in its own files before core did.

The obvious alternative is worth recording as rejected: let an absent `end` mean "one-off" when
the kind is `community`, and "ongoing" when it is `role`. That makes an absence mean two things
and resolves it by a label, so every reader of a date must first read the kind — and any
instance with a genuinely ongoing period has the collision in front of it, not in theory. Date
semantics stay independent of `kind`.

---

## 4. References

No finding was recorded for this one; it surfaced while filing the other two.

### Two kinds of link

An instance accumulates links, and they are not one thing. The page of a conference **is** the
entry — it is where that event lives on the web. An entry in a public commercial register is
not the company's page; the company's own site is. The register is there so a reader can check
one claim the entry makes.

The test: **does the link identify the entry, or support a claim inside it?**

Core already models the first half. `identity` carries `url`, typed `string`, described as *"The
company's own address on the web"*. An experience wants that field for that reason, and the
description transfers with one word changed.

### The change

```
| `url` | No | string | The entry's own address on the web |
```

and, optional, declared `Table.` in the sections table:

```
| `## References` | No | Table. What a reader can check this entry against |
```

`` `## References` is a table with these columns: ``

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a register entry, a recording, a certificate, a product |
| `URL` | Yes | string | Where it is |

### Why a table and not a list of URLs

R8 decides it: *"A field whose value is a list of records is a table wearing YAML: put it in the
body as a Markdown table and declare its columns in the schema."*

A reference is a record, and the evidence is that the label already exists wherever these links
live today. An entry does not write a bare URL for a recording — it writes "Recording:" in front
of it, because the URL alone does not say what it is. Strip the label to fit an array and that
information is destroyed. It is the same shape as the profile's Skills table, for the same
stated reason: an edge with attributes of its own.

One rule keeps the new column a fact rather than an opinion, and belongs in the writing rules:

> `What` names the kind of document, not its significance. "Commercial register entry" is a fact
> about the link; "proof that the company existed" is a reading of it.

---

## 5. What this does not do

- **`organisation` is untouched.** With `kind` in place it visibly means four things — an
  employer for a `role`, a client for a `project`, a host for `community`, an awarding body for
  `education` — and the schema's writing rules already state the last of those as a stretch
  accepted on purpose. Whether that is one field with four meanings or a modelling smell is a
  question `kind` makes askable for the first time, and it should be asked before anything is
  hung off it.
- **No URI type joins the vocabulary.** Both link shapes here are `string`, so a malformed link
  breaks no rule. `identity.url` has been in that position since the first release and has cost
  nothing. Whether the refusal to validate the outside world is deliberate should be said out
  loud in R9, because silence there reads as an oversight.
- **No conditional requiredness.** "A one-off has a date, not a range" would make `end`
  required-if-kind, and Required is `Yes` or `No`. Giving a schema conditionals is a larger
  change than any of the three above, and it is not needed for any of them.

---

## 6. Version and tooling

**0.5.0 → 0.6.0.** Two breaking changes: a reader that assumes `YYYY-MM` fails on the new date
forms, and a required `kind` fails every existing instance until it is filled.

**No code changes.** `lib/instance.mjs` parses structure — it cites R2, R3, R4, R5, R6, R7, R9
and R13 — and validates neither a date form nor an enum value; `verify/check.mjs` checks this
repository's own files against the same structural rules. Field-level types are agent-enforced
today, and all three changes here land inside that. Whether the parser should learn field types
at all is a real question and this spec does not answer it.

**What an instance does on upgrade**, none of it automatic: fill `kind` on every experience;
correct any `-01` that was a coercion rather than an observation; move links out of prose into
`url` and `## References`.

---

## 7. What no check reaches

Two limits, stated so a clean pass is not read as more than it is.

**Precision is unverifiable after the fact.** Nothing in a file records what its source document
said, so "never more precision than the source" can be enforced when the entry is written, by
whoever has the document open, and never afterwards. That is the same class as every writing
rule, which is where the rule belongs — but it means this change removes a specific false
precision without preventing the next one.

**An absent optional field is indistinguishable from a fact that does not exist.** No pass over
an instance can tell "this entry has no recording" from "this entry's recording was dropped on
import". The second happens: the reference instance had four links its source system states and
its own files do not, and nothing inside the model could have found them. Only a field-by-field
comparison against the source system finds that class of defect.

That generalises past this spec. For every optional field, mastership is enforced by nobody. A
drift check between an instance and the systems that master its pages is a tooling question, it
is larger than all three changes here, and it is the only one of the four that would have caught
that defect.
