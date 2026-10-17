# One language per model

A model is written in one language. UML, SysML, a DTD and an XML schema are each kept in one, and a reader who wants another reads a rendering of it, not a second copy inside it. `2026-09-30-a-model-in-several-languages-design.md` gave a page a `## <locale>` section for every translated language, and v0.66.0 shipped it as R19. Trying it on the example profile showed the cost: a page carries a second copy of itself under English headings at its foot, every table is repeated whole to keep its rows aligned, and a declared language is all or nothing across every type. No instance had declared a translated language yet, so the rule goes before anyone writes one, and `model/localization.md` keeps the one thing worth saying: the language the model is written in.

Status: decided by the owner on October 1, 2026: a model is written in one language and is never translated inside itself; `model/localization.md` names that language in a `locale` field and nothing else; R19, the locale sections, their checks, the `translations` command and the `Translation-unchanged:` trailer are removed; the Translator writes no German into a model; meta-model #195's call for a model in German is met, and its call for one model in seven languages is declined. Translated labels for the vocabulary, shown read-only in Obsidian, are a possible way forward and not part of this.

## Where this comes from

meta-model #195 asked for two things. A company that thinks in German could not write its model in German, since R14 made every instance's content American English. And a customer keeping the same product knowledge in seven languages wanted one entity carrying all seven, so that a chat answering in Polish answers from Polish. The first is a model's language, and nothing in modeling practice argues against it: the vocabulary stays English, as a metamodel's does, and the content is in whatever language the company thinks in. The second is localization of content, which a documentation system or a translation tool does, and doing it inside the model turned every page into two. This spec keeps the first and declines the second.

## The rules

R14 becomes **Names are American English, and prose is in the model's language**:

> Every name this vocabulary chooses is spelled in American English — a field, a type, a folder, a section heading a schema declares — and so is the prose of `core/`. An instance's content is written in the one language its `model/localization.md` names.

Its exceptions and its argument stay as they are.

R19 is removed, and its number is not given to another rule. The sentences R2, R3 and R4 gained pointing to it are removed with it, and so is R19 from the list in R0 of the rules a script reads in part. R18 is again the last rule.

## The singleton

`core/localization-schema.md` keeps the type `localization` and its one file, `model/localization.md`, which every instance carries. Its frontmatter gains `locale`:

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered |
| `locale` | Yes | string | The language the model is written in, as a BCP 47 language tag: `en-US`, `de-CH` |

Its sections are the H1, a `>` statement saying who reads the model in that language, and an optional `## References` for the standard the tag follows. `## Locales` and its `Role` column are removed: a value there is only ever one, which is a field and not a table.

```markdown
---
id: 01a0f254-3527-78bd-9d78-ee022ef66188
source: Local
locale: en-US
---

# Language

> Beacon Systems writes its model in American English for everyone who reads it, people and agents alike.
```

The file stays required for the reason `model/identifier.md` is: an instance says in one place what language it is kept in, and a default would leave that to whoever reads the code.

## What the check holds

The instance check fails an instance without `model/localization.md`, a localization page without `locale`, and a `locale` that is not shaped as a BCP 47 language tag — a two- or three-letter language, then an optional region, as `en`, `en-US` or `gsw-CH`. It does not hold a list of languages it knows: which tags exist is the registry's, and a check that names the ones it has heard of refuses a company the day it writes in a language the list missed.

Everything R19 added to the check is removed: the locale sections, their order and completeness, the repeated tables, names unique within a locale, and the grouped headings resolved in one. A `## de-CH` heading on a page is again what it was before v0.66.0, a section its schema does not declare.

## What the tools do

The parser stops returning `translations`, and `localizationOf` returns the model's locale and nothing else. The `translations` command is removed from `bin/companygraph.mjs` and its step from `instance-check.yml`; a trailer `Translation-unchanged:` in an old commit is ignored. `init` writes `model/localization.md` with `locale: en-US`, and `upgrade` rewrites an instance's file in the old form: the tag of its `primary` row becomes `locale`, the `## Locales` section goes, and the H1 and the statement stay the instance's own. An instance that declared a translated row — none does — is refused rather than have its translations dropped without a word.

The MCP server and the chat never took a `locale`, and they take none now. A chat asked in another language than the model's answers from the model's text and translates its answer, which is rendering, not the model.

## Who writes a translation

Nobody, into a model. `conventions/TRANSLATOR.md` and `conventions/WRITING.md` lose the sentences that sent a model's German into its `## de-CH` sections, and `EDITOR.md` and `BACKREADER.md` their one sentence each. A site's German stays what it was before v0.66.0, the site's own, made by the German pipeline and kept beside the page it translates.

## Concept aliases

A concept's alias of kind `translation` is again simply what the concept is called in another language. The sentence in `core/concept-schema.md` that sent it to a declared locale's `### Name` is removed.

## What was left out

Translated labels for the vocabulary, shown read-only in Obsidian: a label file per locale keyed by schema id and element path, falling back to English where a label is missing, so that a model in German reads `## Nachweise` where its file says `## Evidence`. It is a possible way forward, for a later spec. The schema-id spec declined such labels because no surface renders a model in another language without chrome of its own; Obsidian showing a German model would be one, and the element paths that spec gave are what the labels would key by.

A model in several languages, in any shape: sections at the foot of a page, a sibling file per language, a mirrored tree, a column per language. Each makes one entity two texts that have to be kept the same, and none of it is what a model is for.

## Out of scope

Writing any instance in a language other than English. Each of the family's instances stays in `en-US`; an instance that wants another changes its `locale` and writes its pages in it, as a content project of its own.

## What it costs

The localization page changes shape, which makes the release breaking in the terms of `WORKING.md`: every instance takes the new form with the re-pin, and `upgrade` writes it. The three family instances also change their statement, since the German their sites and chat offer was "not yet part of the model" and now never will be. In meta-model, `core/CONVENTIONS.md`, `core/localization-schema.md`, `core/concept-schema.md`, `lib/localization.mjs`, `lib/checks.mjs`, the parser, `bin/companygraph.mjs`, `instance-check.yml`, `init` and `upgrade`, the tests, the README and three skills change; in conventions, four role files, then a release and the wave. The Obsidian plugin's scaffold is read against the new form. Issue #195 is answered and closed once the three instances are re-pinned.
