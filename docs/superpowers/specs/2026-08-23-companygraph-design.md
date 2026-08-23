# CompanyGraph — design

> A meta-model for operating a company: a blueprint you instantiate, published open source.

**Status:** design agreed, not yet built.
**Date:** 2026-08-23

---

## 1. Purpose

CompanyGraph is a **meta-model for operating a company** — the structure a company's own
knowledge takes so that both people and agents can rely on it. It is a template you
instantiate, not a product you run.

It is the generalisation of a model that already works. Two independent instances exist
today: one describing a multi-person company across several hundred files, one describing a
company of one. Neither was written with the other in mind, and both arrived at the same
shape:
**one Markdown file per entity, YAML frontmatter plus a Markdown body, in a folder named
for its type, with a separate folder of schemas defining the structure.**

CompanyGraph is that shape, extracted, with the company-specific parts named as such.

### Non-goals

- **Not a tool.** Tooling and consulting come later and are separate products. The
  meta-model is open source and stays that way.
- **Not a company profile.** A company may one day have a profile of its own. Deferred —
  `profile` in this model belongs to a person.
- **Not a schema language.** See §5: schemas are Markdown, enforced by agents, and that is
  a deliberate position rather than a stage on the way to JSON Schema.

---

## 2. The three layers

| layer | what it is | who owns it |
|---|---|---|
| **Core** | The vocabulary any company can be described in — types, schemas, conventions | CompanyGraph |
| **Pack** | Vocabulary only some kinds of company need — extra types, seed concepts | CompanyGraph |
| **Instance** | A company's actual content, declaring which packs it uses | The company |

Two rules govern the boundary.

**Core defines a type; it does not oblige you to populate it.** A company of one has no
`group`. The type stays in core, unused. The vocabulary is stable across instances even
when the content is not.

**A pack adds vocabulary that only some kinds of company need at all.** Not "types that are
optional" — types that are *absent*. A consultancy has no `feature`, and should not have
an empty folder implying it forgot.

---

## 3. Repositories

```
companygraph/                    ← GitHub org, companygraph.io
  meta-model/                    ← this repo
    core/*-schema.md             ← one schema per core type; core holds nothing else
    packs/<name>/                ← extra types and seed concepts per company type
    CONVENTIONS.md               ← the portable half of AGENTS.md (§6)
    example/                     ← a small synthetic instance, for reading
    README.md
  companygraph.github.io/        ← the landing page, carrying the CNAME
  talks/                         ← serves at companygraph.io/talks/ off that CNAME

robertblust/
  company/                       ← the reference instance: Robert Blust as a company
```

**`core/` is flat; an instance keeps its schemas in `meta/`.** The `meta/` segment belongs to
an instance's layout, where it separates a folder of schemas from the folders of entities
beside it. Core holds nothing but schemas, so inside it that segment separates nothing — and
worse, it was the only place the model said where an instance's schemas live, expressed as a
path nobody had to read. `CONVENTIONS.md` R11 states it instead.

**The repo is `meta-model`, not `core`.** The repo says what the project is; folders say
how it is divided. `core` names the part of the vocabulary every company shares, and it
sits beside `packs/` — so a repo called `core` would hold non-core things from the first
release onward.

Follows the GuestGraph topology: an org, a `.github.io` repo carrying the CNAME, content
repos beside it. Setting the custom domain on the org's Pages site makes every other Pages
repo in the org inherit it, so `talks/` serves at `companygraph.io/talks/` with no
configuration of its own.

**The finished shape is three things, not one.** A landing page saying what the idea is, an
introduction talk carrying the argument, and the model itself. The division of labour is
the point: the page holds the hook and two links, the talk holds everything a visitor would
ask next, and anything a reader could actually check lives in the model and is linked to
rather than restated.

That discipline matters more here than in the project it is copied from, not less. There,
the product is an engine and the prose is the only place the idea is written down. Here the
product *is* prose, so a page and a deck that explain the model in their own words are two
more copies of it, drifting. The rule is the same rule and it has to be held harder: link,
do not restate.

**Packs start inside `core/`, not as separate repos.** A pack earns its own repo when it
gets its own release cycle or its own maintainer. Until then separate repos mean more
sitemaps, more conventions files and more chances to drift.

**The reference instance lives under `robertblust`, not in the org.** An org named for a
product should not hold one person's real client and revenue data. `example/` covers
the adopter's need instead: a small fictional company, honest about being fictional.

**The existing CV repository is not touched.** It keeps building from its own content. The
end state — the CV becoming an output of the instance, the way job applications are already
outputs of that content — is a later, separately scoped project. Naming it here keeps the
duplication temporary by design rather than by neglect.

---

## 4. Types

**Every type is a collection of entities. There is one mechanism, not two.** An entity is a
**file** when it owns nothing, and a **folder** when it owns collections of its own. Nothing
in the model is a singleton: §1's shape is one Markdown file per entity, and a document
holding many entities as headings breaks it — those headings have no canonical name, so
nothing can reference one.

### Core

| group | type | folder | notes |
|---|---|---|---|
| Profile | `profile` | `profiles/<profile>/` | A folder: it owns experiences. The profile itself is `<profile>.md`. |
| | `experience` | `profiles/<profile>/experiences/` | Owned by a profile. A bounded period. |
| Capability | `skill` | `skills/` | Claimed by profiles, required by roles, owned by neither. |
| | `proficiency-level` | `proficiency-levels/` | The scale a profile claims a skill at. Ranked, so a rung can be inserted. |
| Identity | `value` | `values/` | One file per value, so a strategy or a role can reference one. |
| | `brand-element` | `brand-elements/` | Tone of voice, visual identity. |
| Direction | `strategy` | `strategies/` | |
| | `strategic-objective` | `strategic-objectives/` | |
| | `kpi` | `kpis/` | |
| Organisation | `role` | `roles/` | |
| | `group` | `groups/` | Empty in a company of one; the type still exists. |
| Operation | `process` | `processes/<process>/` | A folder: it owns phases and gates. |
| | `phase` | `processes/<process>/phases/` | Owned by a process. |
| | `gate` | `processes/<process>/gates/` | Owned by a process. Shape confirmed when `process` is built — §10. |
| | `rule` | `rules/` | |
| Market | `customer` | `customers/` | |
| Obligation | `legal-document` | `legal-documents/` | Terms, policies, agreements. |
| Domain | `concept` | `concepts/` | Always present, always the company's own vocabulary. |

### Pack: `product`

| type | folder | notes |
|---|---|---|
| `feature` | `features/` | |
| `architecture-decision` | `architecture-decisions/` | |
| `roadmap` | `roadmaps/` | |

### Naming

Three names get chosen — the type, its folder, and the file holding one entity — and they
follow different rules:

- **A collection type is singular; its folder is plural.** A type says what one entity *is* —
  "a `profile` is a person" is the sentence the model is built on — and the folder holds many
  of them. This holds however deeply the folder nests: a profile has many experiences, so
  `experiences/`, not `experience/`.
- **An entity that owns collections is a folder** named for the entity, holding its own file
  plus one plural folder per owned type. `profiles/robert-blust/` holds `robert-blust.md` and
  `experiences/`. An entity that owns nothing is just a file.
- **An entity's file is named for the entity**, whether or not it nests:
  `skills/java-programming.md` flat, `profiles/robert-blust/robert-blust.md` nested. Nesting
  changes where a file lives, not what it is called.

**Not `README.md`.** The multi-person instance names a nested entity's main document
`README.md`, and core does not follow it. `README` is a host-rendering convention — its one
real benefit is that GitHub shows it when you browse into a folder — and §6's whole argument
is that a convention describing a particular vendor's tooling does not belong in a
vendor-neutral meta-model. It also carries no information: every entity folder's main file
would be called the same thing, so the name cannot distinguish a profile from a process. The
repository's own `README.md` stays, because that one really is a readme.

**No folder is shortened.** `legal-document` lives in `legal-documents/`, not `legal/`;
`brand-element` in `brand-elements/`, not `brand/`. A folder abbreviated for readability is an
exception to the one rule that makes the two names predictable, bought with nothing —
`legal/` is shorter and says less. As it stands, every folder in the model is the regular
plural of its type, with no irregular case anywhere.

**The folder is still declared, never derived.** Every schema file opens with
`## File Location`, which states the folder outright. That is the safety net rather than the
licence: it means a type whose plural is genuinely irregular costs nothing, and it carries
nested paths like `profiles/<profile>/experiences/` that are more than a pluralisation. It is
not permission to pick a folder name freely.

The rules earn their keep by exposing types whose identity was never pinned down. `legal` was
a plural-shaped name for a collection of terms, policies and agreements — one of them is a
`legal-document`. `brand` holds tone of voice and visual identity, and no singular fitted
because `brand` was never the type; the entities are the elements. And `experience/` had been
carried over singular from the company-of-one instance, where it reads as the mass noun a CV
section uses rather than as a folder of many entities.

### Notes on the shape

**The group column is editorial and no group is named after a type in it.** Identity covers
`value` and `brand-element`; neither is called "identity". The Person group was the exception
— a second word for what `profile` already names — and a model whose central rule is one
canonical name per thing should not carry two words for a person at two levels of its own
table. Hence **Profile**, which is the same word as its root type.

That rename is what moved `skill` out. A group called Profile holds the profile and what
hangs off it, and a skill hangs off nobody: it is claimed by a profile and required by a role,
and outlives both. **Capability** holds it alone. A group of one is not a problem — Obligation
already holds only `legal-document` — and the alternative was a table implying an ownership
the Edges section explicitly denies.

**`profile` is a person, not the company.** A person is an employee of a company and has a
profile; the profile claims skills and owns experience. The multi-person instance has this as
a thin file per person — name, contact, roles — under a folder it calls `people`. The
company-of-one instance has it as the entire content tree. That is the clearest case of the
core being the *union* of two instances rather than one extended: a company with a payroll
never had to model a person's background, and a company of one was forced to.

The union is why `skill` and `experience` are types at all. Neither appears in the
multi-person instance. Both appear in the company-of-one instance, and not in the same shape:
`content/experience/` is already a collection of Markdown files there, while skills are a single
grouped YAML file of names. Core promotes a skill to an entity — one file, its own H1 — so
that a profile can claim it and a role can require it, both by canonical name. As a list of
strings a skill is unverifiable; as an entity it is the thing cross-reference checking exists
to check.

`proficiency-level` is the third promotion, and the one that showed the pattern has a name. A
level has a label, a rank and a definition, and many profiles claim the same few — so its
definition belongs in one file that everything references, not restated on every assessment or
left in a schema's prose where nothing can reach it. That was `level: senior` as an `enum`,
which is why `enum` now ships with a rule saying what it is not for: a closed set of bare
tokens, never a set whose members carry a definition of their own.

The promotion paid twice. The checker had held the legal levels as a hardcoded list beside the
schema's enum — the only mechanical enforcement R8 had anywhere, and a duplicate that could
drift in both directions. As entities, levels are resolved by the same reference machinery as
skills, and the duplicate is gone.

`value` is promoted for the identical reason, and it is the change that removed the last
singleton. Both instances keep their values in one document with a heading per value. A
heading has no canonical name, so no strategy, role or process can cite the value it serves —
which is the one thing a company's values are for.

### Edges

The person cluster produced two kinds of reference, and they fail differently:

| kind | example | what removing the target means |
|---|---|---|
| **Plain reference** | `profile → skill`, `experience → skill` | The referring file stays valid. It points at a name nothing defines. |
| **Ownership** | `experience → profile` | What was owned becomes garbage. An experience without its person is not a fact about anything. |

Ownership is **carried structurally, by nesting, and stated once in the schema.** An owned
collection lives inside its owner's folder, so removing a person is one operation and an
orphan is unrepresentable rather than merely detectable. And because the shape alone cannot
say *which type* owns the folder — `profiles/<profile>/experiences/` has to be read as a path
to find out — the owned type's schema names its owner outright:

```
core/experience-schema.md

# Experience Schema
> Required structure for experience files.

**Owner:** profile

## File Location
`profiles/<profile>/experiences/*.md`
```

**The declaration goes on the owned type, not the owner.** "What does an experience belong
to?" is asked of experience, and it is answered by the file an agent is already reading. The
reverse — what a profile folder contains — is a scan for schemas claiming `Owner: profile`,
which is cheap and, more importantly, derived rather than stated twice. Two declarations of
one fact is the drift these conventions exist to prevent.

That choice pays for itself in the frontmatter tables. Because ownership lives in the path and
the Owner line, the tables need only one reference marker, `ref → <type>`, and a reference has
only one way to fail: not resolving. A flat layout with an `owner:` frontmatter field would
need two markers, two failure modes, and a field that can disagree with the path it sits in.

Shared vocabulary stays flat for the same reason: nothing owns `skill`, and a skill outlives
every person who ever claimed it.

**`concept` is the company's own domain vocabulary** — a hotel operator models booking and
folio; a consultancy models engagement, proposal and deliverable. Same schema, entirely
different content. This is where company *type* actually varies, far more than in which
types exist, which is why a pack may seed concepts as well as define types.

**Volume runs inversely to genericness.** In the multi-person instance the values fit in one
file and `strategies` is barely more — and those are the most universal things a company has.
The folders holding by far the most files are `customers/` and `features/`, which are the two
most specific to what kind of company it is. File counts are not evidence of importance.

---

## 5. Schemas: Markdown, enforced by agents

Each type gets a `meta/<type>-schema.md` with a frontmatter table (field, required, type,
description) and a sections table. Validation is **agent-run**: `CONVENTIONS.md` defines
what makes a graph checkable, and you invoke it in prose — *"check cross-references in this
repository."*

This is not a compromise pending real tooling. It is the working architecture of the
multi-person instance across several hundred files, and it is the position the talk this
model comes from actually argues:
*"Today AI understands natural language. With the right meta-model I describe the facts as
Markdown."* A formal schema language would contradict the thesis the model is published
under.

### The fixed shape

Each schema file is named for its type — so `skill-schema.md`, singular — and carries an
`**Owner:**` line if the type is owned, then `## File Location`, then a frontmatter table,
then a sections table, in that order, with these columns and no others:

```
Frontmatter table:  | Field   | Required | Type | Description |
Sections table:     | Section | Required | Description |
```

`## File Location` is load-bearing, not decorative: it is what lets a type be named singular
while its folder is plural, and it carries nested paths that are more than a pluralisation.
Nothing derives a folder from a type name — though as it stands every folder *is* the regular
plural of its type, because no folder is shortened for convenience (§4, Naming).

Type vocabulary, closed for the first release: `string`, `number`, `date`, `array`, `enum`,
`ref → <type>`. A reference names one entity, so the type it points at is singular:
`ref → skill`, never `ref → skills`.

**The canonical name of an entity is its H1**, and everything references it by that exact
string. The multi-person instance resolves a display name through a four-step fallback —
nickname, then filename, then email prefix, then `full_name` — and a fallback chain is
precisely what makes a reference unresolvable without running code. Core drops it, which also
removes the `name` frontmatter field that would otherwise duplicate the heading.

`object array` was invented here and has since been removed, which is worth recording because
the reasoning was wrong in an instructive way. A person's skill carries a proficiency and its
evidence, so the edge has attributes — a list of records. That was expressed as a frontmatter
`object array` with a second table declaring its keys, because "a level in the Markdown body is
where nothing can check it."

That objection stopped being true once the fixed shape existed. A body table with declared
columns is checkable on identical terms to a frontmatter field, and it renders where a reader
actually looks, with no quoting hazard around a colon or a wrapped line. So the assessment is a
Markdown table under `## Skills`, its columns declared in the schema's own `## Sections`, and
`object array` leaves the vocabulary along with the frontmatter keys-table rule that existed
only to serve it.

The lesson generalises and is now a rule: a frontmatter field whose value is a list of records
is a table wearing YAML. Frontmatter is for short facts.

**Write the tables to a fixed shape from the first commit** — same columns, same type
vocabulary, same word for "required" — so a validator can be built against them later
without a rewrite. That validator is the first thing the tooling business sells, and it
should arrive when someone other than the author has adopted the model and drift has
started to cost something.

Deliberately rejected: a validator that *parses* the Markdown schemas as its source of
truth. That makes prose load-bearing before anything enforces the prose's shape — a failure
mode that costs a silent, invisible break rather than an error, every time.

---

## 6. Splitting the agent instructions

The schemas are the easy half and are already isolated. The valuable extraction is the
repository's agent-instruction file, where portable and company-specific rules currently sit
in one table. Three kinds live there:

| kind | shape of the rule | goes to |
|---|---|---|
| Modelling conventions | Cross-reference validation is required before committing; names must match their canonical definitions exactly; no abbreviations; link by canonical name rather than by file path | **`CONVENTIONS.md`** |
| Operational rules | Anything naming a particular issue tracker, wiki, chat tool or MCP server, and what to do in it | **Instance** |
| House style | The company's own writing and output standards | **Instance** |

The first group is what makes a graph of Markdown files checkable by an agent at all. Exact
name matching is not a style preference — it is the only reason a cross-reference can be
resolved without a database. That group is genuinely vendor-neutral and it is the substance
of the meta-model. The rest describes whatever tools a particular company happens to run on,
and does not survive contact with a second company.

Doing this rule by rule is the main work of the first release. It is also the point where
publishing goes wrong most easily: shipping a folder structure and calling it a standard,
while the conventions that make it operable stay behind in a private repository.

## 7. Distribution: an instance ships as a skill

The multi-person instance publishes itself as a loadable agent skill: a README carrying name
and description frontmatter, and a command that packages the tree. Consumption is not "read
these files"; it is "load this company as context."

CompanyGraph should generalise that: **the core defines how an instance packages itself as
a skill**, so any company's model is loadable by the same mechanism. It is the part of the
multi-person instance most worth generalising, and the one with no equivalent in the
company-of-one instance.

Open: whether the packaging script belongs in core (shared, versioned) or in each instance
(copied, divergent). Leaning core.

---

## 8. Declaring packs

An instance declares which packs it uses in a root file. Exact format deferred to
implementation; the requirement is that it is machine-readable, human-obvious, and that an
agent validating the instance can tell an intentionally absent type from a forgotten one.

---

## 9. First release: a slice, not the whole vocabulary

The first release describes **one person completely** rather than thirteen types partially.
A vocabulary is only worth publishing once something has been said in it end to end, and the
person cluster is the half of the union that neither instance shares — so it is the half most
likely to be wrong.

1. `core/` — `profile-schema.md`, `experience-schema.md`, `skill-schema.md`,
   `proficiency-level-schema.md`, `value-schema.md`. Schema files are named for the type, so they are singular too. The four
   cover every shape the one mechanism has: an entity that is a folder (`profile`), an entity
   that is owned (`experience`), and two that are plain files (`skill`, `value`).
2. `CONVENTIONS.md` — the portable half of `AGENTS.md`, extracted rule by rule (§6).
3. `example/` — a small synthetic instance that reads end to end.
4. `README.md` — what it is, how to instantiate, what a pack is.

Then, in this order and not before: `companygraph.github.io`, and `talks/intro/`. The landing
page's only job is to send a visitor to the talk or the code, so it cannot be built first
without making a promise the repository cannot keep.

`experience` gets its own schema file even though it nests inside `profiles/` on disk. The
`processes/<name>/` precedent buries phase files inside the process schema because a phase is
not a type — it is a part of one. Experience is a type, and burying it would hide it from
anyone reading `core/` to learn what vocabulary exists.

**No pack ships in the first release.** The candidate was a bundle for companies that sell
expertise rather than a product — `credentials`, `projects`, `community`, the three folders
present in the company-of-one instance and absent from the multi-person one. It does not
survive inspection: a product company runs projects too, so `projects` is not evidence of a
boundary between kinds of company at all. It is either core vocabulary or `experience` seen
from the other end (§10). With the strongest example gone, what remains does not justify
inventing the mechanism yet.

That cost is accepted knowingly: §2's claim about packs ships as prose with nothing
demonstrating it, and §8's declaration format stays undesigned until a second kind of company
asks for it.

The reference instance under `robertblust/company` follows once the slice exists, and is the
first real test of whether the extraction worked.

Not in the first release: the validator, any tooling, the company profile, `packs/product/`,
and the remaining eleven core types.

---

## 10. Open questions

- **`education`** — a person has degrees, a company has certifications. Generalise as
  `credentials` in core, or hold it for a pack? Note that a pack is named for a *kind of
  company*, not for a subject: there is no "person pack", because every company has people.
- **`projects`** — a distinct type, or the same thing as `experience` seen from the other
  end? A company would call these case studies. Not pack material either way — a company that
  builds a product runs projects exactly as a company that sells expertise does.
- **`community`** — talks and open source. Core, or wait for a second instance to ask?
- **`gate`** — the multi-person instance keeps one gate checklist per process rather than a
  gate per file. Whether a gate is an entity or a section of the process is confirmed when
  `process` is built, not now.
- **Who assessed a skill, and when it last moved** — a proficiency assessment currently
  assumes self-assessment and records no date. If both self- and peer-assessment exist, the gap
  between them is the useful output rather than either column alone, which argues for the
  assessor being an attribute of the assessment. Likewise a level should move because something
  moved it — a project, an outage — not on a review schedule, which argues for recording what
  changed it. Deferred: with one profile there is no gap to measure.
- **Skill grouping** — the company-of-one instance groups its skills into ten named
  categories. Core carries that as a free-text `group` field for now. Whether a skill group
  becomes an entity of its own is a question for the second instance, not the first: one more
  type to check a string against is not worth it while one person maintains the list.
- **Skill packaging** — core or instance (§7).
- **Versioning** — how a pack declares which core version it needs, and what an instance
  does when core moves. Not urgent with one instance; urgent on the first outside adopter.

### Settled since first draft

- **How skills and experience attach to a profile.** Answered by the ownership distinction in
  §4: `experience` is owned and therefore nests, `skill` is shared vocabulary and therefore
  stays flat. The original question assumed both attached the same way, which was the mistake.
  What forced it was asking what happens when a profile is removed — the flat layout leaves an
  experience pointing at nobody, valid-looking until something checks it.
