# CompanyGraph — design

> A meta-model for operating a company: a blueprint you instantiate, published open source.

**Status:** design agreed, not yet built.
**Date:** 2026-08-23

---

## 1. Purpose

CompanyGraph is a **meta-model for operating a company** — the structure a company's own
knowledge takes so that both people and agents can rely on it. It is a template you
instantiate, not a product you run.

It is the generalisation of a model that already works. `magic-mental-model` describes a
26-person hospitality platform in 403 files; `rob-cv` describes a company of one in 142
commits. Neither was written with the other in mind, and both arrived at the same shape:
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
`groups`. The type stays in core, unused. The vocabulary is stable across instances even
when the content is not.

**A pack adds vocabulary that only some kinds of company need at all.** Not "types that are
optional" — types that are *absent*. A consultancy has no `features`, and should not have
an empty folder implying it forgot.

---

## 3. Repositories

```
companygraph/                    ← GitHub org, companygraph.io
  core/                          ← this repo: the meta-model
    meta/*-schema.md             ← one schema per core type
    packs/<name>/                ← extra types and seed concepts per company type
    CONVENTIONS.md               ← the portable half of AGENTS.md (§6)
    example/                     ← a small synthetic instance, for reading
    README.md
  companygraph.github.io/        ← later, when there is something to say

robertblust/
  company/                       ← the reference instance: Robert Blust as a company
```

Follows the GuestGraph topology: an org, a `.github.io` repo carrying the CNAME, content
repos beside it.

**Packs start inside `core/`, not as separate repos.** A pack earns its own repo when it
gets its own release cycle or its own maintainer. Until then separate repos mean more
sitemaps, more conventions files and more chances to drift.

**The reference instance lives under `robertblust`, not in the org.** An org named for a
product should not hold one person's real client and revenue data. `core/example/` covers
the adopter's need instead: a small fictional company, honest about being fictional.

**rob-cv is not touched.** The CV keeps building from its own `content/`. The end state —
the CV becoming an output of the instance, the way job applications are already outputs of
`content/` — is a later, separately scoped project. Naming it here keeps the duplication
temporary by design rather than by neglect.

---

## 4. Types

Marked **S** for singleton (one file) and **C** for collection (a folder of many). Both
instances arrived at singletons independently — `rob-cv/content/profile.yaml`,
`magic-mental-model/values.md` — so the meta-model has two schema shapes, not one.

### Core

| group | type | | notes |
|---|---|---|---|
| Person | `profile` | C | One per person. Carries **skills** and **experience** — attachment open, see §10. |
| Identity | `values` | S | |
| | `brand` | C | |
| Direction | `strategies` | C | |
| | `strategic-objectives` | C | |
| | `kpis` | C | |
| Organisation | `roles` | C | |
| | `groups` | C | Empty in a company of one; the type still exists. |
| Operation | `processes` | C | Nested: `processes/<name>/` |
| | `rules` | C | |
| Market | `customers` | C | |
| Obligation | `legal` | C | |
| Domain | `concepts` | C | Always present, always the company's own vocabulary. |

### Pack: `product`

| type | | notes |
|---|---|---|
| `features` | C | |
| `architecture-decisions` | C | |
| `roadmaps` | C | |

### Notes on the shape

**`profile` is a person, not the company.** Rob is an employee of a company and has a
profile; the profile carries skills and experience. This is the type `magic-mental-model`
has as thin `people/*.md` and `rob-cv` has as its entire content tree — the clearest case
of the core being the *union* of two instances rather than one extended. A 26-person
company never had to model a person's background; a company of one was forced to.

**`concepts` is the company's own domain vocabulary** — `booking`, `folio`, `door-access`
at LIKE MAGIC; engagement, proposal, deliverable at a consultancy. Same schema, entirely
different content. This is where company *type* actually varies, far more than in which
types exist, which is why a pack may seed concepts as well as define types.

**Volume runs inversely to genericness.** `values` is one file and `strategies` two; those
are the most universal things a company has. `customers` is 105 files and `features` 72,
and those are the most specific to what kind of company LIKE MAGIC is. File counts are not
evidence of importance.

---

## 5. Schemas: Markdown, enforced by agents

Each type gets a `meta/<type>-schema.md` with a frontmatter table (field, required, type,
description) and a sections table. Validation is **agent-run**: `CONVENTIONS.md` defines
what makes a graph checkable, and you invoke it in prose — *"check cross-references in this
repository."*

This is not a compromise pending real tooling. It is the working architecture at LIKE MAGIC
across 403 files, and it is the position the talk this model comes from actually argues:
*"Today AI understands natural language. With the right meta-model I describe the facts as
Markdown."* A formal schema language would contradict the thesis the model is published
under.

**Write the tables to a fixed shape from the first commit** — same columns, same type
vocabulary, same word for "required" — so a validator can be built against them later
without a rewrite. That validator is the first thing the tooling business sells, and it
should arrive when someone other than the author has adopted the model and drift has
started to cost something.

Deliberately rejected: a validator that *parses* the Markdown schemas as its source of
truth. That makes prose load-bearing before anything enforces the prose's shape, and this
codebase has two fresh examples of what that costs — a slide parser keyed on the literal
string `<section class="slide`, and an attribute in the wrong position silently removing a
slide from the build.

---

## 6. Splitting `AGENTS.md`

The schemas are already isolated in `meta/`. The valuable extraction is `AGENTS.md`, where
portable and company-specific are currently fused. Three kinds of rule sit in one table:

| kind | example | goes to |
|---|---|---|
| Modelling conventions | *"Cross-reference validation is always required before committing"*, *"Role names must match canonical definitions exactly"*, *"No internal markdown links — use canonical names"* | **`core/CONVENTIONS.md`** |
| Operational rules | *"Always ask before creating a Jira work item"*, *"Use Atlassian MCP, never WebFetch"* | **Instance** — LIKE MAGIC's tools |
| House style | The AI Output Style section, pointing at an internal AI Strategy | **Instance** |

The first group is what makes a graph of Markdown files checkable by an agent at all —
exact name matching, no abbreviations, canonical names instead of links. It is genuinely
vendor-neutral and it is the substance of the meta-model. The rest is what LIKE MAGIC
happens to run on.

Doing this rule by rule is the main work of the first release. It is also the point where
publishing goes wrong most easily: shipping a folder structure and calling it a standard,
while the conventions that make it operable stay behind in a private repo.

---

## 7. Distribution: an instance ships as a skill

`magic-mental-model` publishes itself as a loadable agent skill — `skill-README.md` carries
name and description frontmatter, `.claude/commands/dist-skill.md` packages the tree into a
ZIP. Consumption is not "read these files"; it is "load this company as context."

CompanyGraph should generalise that: **the core defines how an instance packages itself as
a skill**, so any company's model is loadable by the same mechanism. This is the part of
LIKE MAGIC's setup most worth generalising and the one with no equivalent in `rob-cv`.

Open: whether the packaging script belongs in core (shared, versioned) or in each instance
(copied, divergent). Leaning core.

---

## 8. Declaring packs

An instance declares which packs it uses in a root file. Exact format deferred to
implementation; the requirement is that it is machine-readable, human-obvious, and that an
agent validating the instance can tell an intentionally absent type from a forgotten one.

---

## 9. First release

1. `core/` with `meta/` schemas for every core type, singleton and collection shapes marked.
2. `CONVENTIONS.md` — the portable half of `AGENTS.md`, extracted rule by rule.
3. `packs/product/` — the first pack, three types.
4. `core/example/` — a small synthetic instance that reads end to end.
5. `README.md` — what it is, how to instantiate, what a pack is.

The reference instance under `robertblust/company` follows once the core exists, and is the
first real test of whether the extraction worked.

Not in the first release: the validator, the site, `companygraph.github.io`, any tooling,
and the company profile.

---

## 10. Open questions

- **`education`** — a person has degrees, a company has certifications. Generalise as
  `credentials` in core, or leave to a person pack?
- **`projects`** — a distinct type, or the same thing as `experience` seen from the other
  end? LIKE MAGIC would call these case studies.
- **`community`** — talks and open source. Core, or wait for a second instance to ask?
- **How skills and experience attach to a profile** — nested under the person
  (`profile/rob/experience/*.md`, the shape `processes/<name>/` already uses), or flat
  collections keyed by a `person:` field. `rob-cv`'s flat `experience/` works only because
  there is one person, so it is not evidence. Leaning nested.
- **Skill packaging** — core or instance (§7).
- **Versioning** — how a pack declares which core version it needs, and what an instance
  does when core moves. Not urgent with one instance; urgent on the first outside adopter.
