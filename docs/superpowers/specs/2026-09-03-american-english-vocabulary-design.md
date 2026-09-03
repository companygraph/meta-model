# American English in the vocabulary — design

> One field name is British in a family whose every instance mandates American prose, and the
> rule that would have caught it was never written. Two rules, one renamed field, one release —
> and a validator gap that made the rename unsafe until it was closed.

Status: proposed. Changes `core/CONVENTIONS.md` (two new rules), `core/experience-schema.md`
(a renamed field), four other schema files' prose, the reference instance, and
`verify/check.mjs` (one new check). Lands on every instance as core **0.13.0**.

---

## 1. The finding

`organisation` is declared in the `experience` schema's frontmatter table and appears in the
prose of four other schema files. It is the only British spelling in the vocabulary's
identifiers, and it sits in a family where every instance's `AGENTS.md` opens its house style
with *"American English — `organization`, `modeling`, `color`"* and then, in the same
paragraph, exempts the thing that motivated this:

> (The schema fields are British — `organisation` — and are spelled as the schema spells them;
> a field name is not prose.)

That parenthetical is not a compromise anyone chose. It is a description of a spelling that
arrived unexamined, was noticed, and then had to be defended in the one place a reader would
go looking for the rule. The defense is even correct as far as it goes — an instance genuinely
cannot spell a field differently and stay conforming — which is precisely why the fix belongs
upstream and not in the sentence explaining why it cannot be fixed locally.

## 2. Where the rule belongs

In `core/CONVENTIONS.md`, not in each instance's `AGENTS.md`. Three reasons, in the order they
matter:

- **A field name is the vocabulary's, not the instance's.** An instance restating this rule
  could restate it differently, and two instances disagreeing about how the vocabulary is
  spelled is the same failure one repository up.
- **`CONVENTIONS.md` is vendored verbatim**, with a sha256 per file in
  `.companygraph/manifest.json`. A rule written there reaches every instance on that core and
  cannot drift from it silently — which is more than any of the `AGENTS.md` copies can say.
- **The validator can only enforce what `CONVENTIONS.md` states.** `verify/check.mjs` holds the
  discipline that every check names the rule it enforces, *"and a meta-check fails if that rule
  is missing — so the script and the prose cannot drift apart silently."* A rule living in
  `AGENTS.md` is invisible to that mechanism.

## 3. R14 — Names and prose are American English

The rule binds two things that are usually kept apart, and deliberately:

- **Identifiers**: field names, type names, folder names, and the section headings a schema
  declares. These are machine-visible; a disagreement here is a broken reference, not a style
  nit.
- **Prose**: the writing in `core/` and in an instance's content.

Excepted: proper nouns, quoted matter, and any name an external system fixes — a product, a
standard, a legal entity, a `LICENSE` file whose name is fixed by the ecosystem that reads it. The rule governs what this vocabulary chooses to call things, not what the
world has already called them.

Placed in **Structure**, beside R2, R3, R7 and R12 — the rules that already govern how a thing
is named.

## 4. `organisation` becomes `organization`

The rename is breaking: an instance on 0.13.0 whose experiences still say `organisation` is
writing a field the schema does not declare.

**No alias, no deprecation window.** Accepting both spellings would make the inconsistency
permanent and add a rule to explain it — the outcome this spec exists to remove, with extra
steps. The family is two instances and three sites in one pair of hands; there is no consumer
to break who cannot be renamed in the same afternoon.

Also renamed, under R14 and in the same release: `recognises` and `modelling` in
`CONVENTIONS.md` — the vocabulary's own prose, and the only other British spellings in `core/`.

## 5. R15 — A page's frontmatter fields are the ones its schema declares

The rename above is unsafe today, and the validator says so in its own opening comment:

> no file is checked for the sections its schema requires, **an unknown frontmatter field
> passes**

`organisation` is optional. So an instance file left un-renamed stays green, keeps parsing —
the parser reads every frontmatter key it finds — and renders `organisation` on one card beside
`organization` on the next. The failure is invisible to every check the family has, and visible
to every reader of the site.

R15 closes it: for a page under a folder that maps to a type, every frontmatter key must appear
in that type's `## Frontmatter` table. The check cites R15, as every check must.

**What this costs**, stated plainly because it is a real constraint: an instance can no longer
carry a local frontmatter field of its own. That is acceptable, and close to already true — a
field nothing declares is a field nothing renders, validates or resolves. It is already
invisible to the model, and the one thing it can still do is look like a typo of a real field.
Which is exactly the failure mode this rename introduces.

**What R15 does not reach.** A file whose folder maps to no type keeps its frontmatter unread,
as it is today: `profiles/<profile>/notes/x.md` is reachable and nothing declares what it may
hold. R15 binds typed pages, and inventing a rule for untyped ones is a separate question this
spec does not open.

## 6. What changes, and in what order

| # | repository | change |
|---|---|---|
| 1 | **companygraph/meta-model** | R14 and R15 in `CONVENTIONS.md`; the field renamed in `experience-schema.md`; prose in `experience-kind-schema.md`, `profile-schema.md`, `proficiency-level-schema.md` and `CONVENTIONS.md`; `recognises` and `modelling`; the R15 check in `verify/check.mjs`; the reference instance — 5 experience files' key and 4 experience-kind files' prose; `README.md`. Release **0.13.0** (`package.json`, `core/manifest.json` and the tag move together — `verify` fails a tag that disagrees with the manifest). |
| 2 | **robertblust/mental-model** | Re-vendor `meta/core` and its 12 sha256s, from 0.11.0 to 0.13.0 — two versions, so 0.12.0's changes arrive with it. Rename the key in 23 experience files; prose in 5 experience-kind files; and the `AGENTS.md` parenthetical quoted in §1, which R14 makes false. Three existing British spellings in published content — `README.md`, `model/skills/open-source-stewardship.md`, `model/proficiency-levels/competent.md` — come into line under R14. |
| 3 | **blust.ch**, **companygraph.io** | Regenerate the model data blocks; no code changes. `companygraph.io` also has `README.md` and `CLAUDE.md` prose. |
| 4 | **@robertblust/design** | Nothing. Zero occurrences — no rendering code names the field, which is what makes step 3 a regeneration rather than an edit. |

The order is forced: the instance cannot rename before a core that declares the new name, and
the sites regenerate from the instance.

## 7. What this does not do

- **Historical records are not rewritten.** `docs/superpowers/` specs and plans in every
  repository keep the spelling they were written with. A spec written in August recorded a
  decision made in August; editing it to match a rule adopted in September falsifies the
  record for no reader's benefit.
- **rob-cv and guestgraph.io keep their own house style.** Their occurrences are application
  prose and one README line, not the vocabulary. R14 is the model's rule and reaches what the
  model reaches.
- **No spell-checking is automated.** R14 binds identifiers, which R15's check now covers, and
  prose, which it does not. Prose stays a matter for review, as the `AGENTS.md` rule it
  replaces always was.

## 8. What no check reaches

R15 makes a *missing* rename fail. It does not make a *wrong* one fail: rename the field in an
instance and in the schema to two different American spellings and both halves agree with
themselves. Nothing here compares an instance's field names against the master vocabulary it
vendors — the same gap that already lets a copied field drift from rob-cv unnoticed, and the
same answer: it is caught by a person reading two files, or not at all.
