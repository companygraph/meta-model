# A model in several languages

R14 makes the names and prose of every instance American English, and the model has no place for a second language. A company whose knowledge is written in German keeps it in a language it does not think in, and a chat answering in Polish from English pages translates on the fly, with nothing to check that translation against. meta-model #195 said so, after the chat answered "The model does not say." An instance now declares the locale it is written in and the locales it is translated into, and every page carries its translations in sections of its own, which the check holds complete and current.

Status: decided by the owner on September 30, 2026, and amended the same day to name the singleton `localization`, since R12 names a singular type's file for the type: a translation decorates the one page and is never a second one, a primary locale per instance, references that resolve in the language they are written in, complete and current locales, the layout of a locale section, what the tools do with a locale, a required `localization` singleton, and the Translator writing into the model while the adoption is left to each instance.

## Where this comes from

meta-model #195 asks for one entity with its name and prose in several languages, each checked, and a reference that resolves in whichever language it was written. It leans on #194, which gave every entity an id no name carries, and the owner split it in two: `2026-09-30-a-schema-keeps-its-id-design.md` gave every element of a schema a path, and this spec keys translations by those paths.

Three shapes were open in the issue: fields, sections, sibling files or an instance per language. A sibling file or a second instance makes one entity two pages, which R18 forbids and the owner ruled out. A field holds a name but not prose. A section holds both, on the page the entity already is.

## The rules

R14 becomes **Names are American English, and prose is in the primary locale**:

> Every name this vocabulary chooses is spelled in American English — a field, a type, a folder, a section heading a schema declares — and so is the prose of `core/`. An instance's content is written in the primary locale its `model/localization.md` declares, and translated into the locales it declares beside it, each in a section of the page it translates (R19).

Its exceptions and its argument stay as they are.

A new rule follows R18:

> **R19 — A translation is a section of the page it translates.** A page carries one `## <locale>` section for every translated locale its instance declares, after every section its schema declares and in the order the locales are declared. The section repeats the page's shape one level down, under the schema's English keys: `### Name` for the H1, `### Statement` for the `>` line, and a `###` for every section the page has, headed as the schema heads it. A table is repeated whole, and every cell that is a reference, a URL, a date or an enum value is the same as the primary's; only free text is translated. A declared locale is complete: every page has its section, and the section has every element the page has. A name in a locale is unique within its type, and within its owner for an owned type, as R2 holds the primary name, and a reference in a locale's prose or grouped headings names the entity by its name in that locale and resolves there (R4). Frontmatter and the primary's tables name an entity by its primary name only.

R2, R3 and R4 gain a sentence each pointing to R19 for names in a locale. R2's is about uniqueness, not reference resolution, and gains no further scope; R3 and R4's pointers cover a locale's prose and its grouped headings, and a repeated table's references stay the primary's, since only free text is translated.

## The singleton

`core/localization-schema.md` declares the type `localization`, with one file, `model/localization.md`, which every instance carries:

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered |

Its sections are the H1, a `>` statement saying who reads the model in which language, and `## Locales`, a required table:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Locale` | Yes | string | A BCP 47 language tag, `de-CH` or `en-US` |
| `Role` | Yes | enum | `primary` or `translated`. The primary is the language the pages are written in; a translated locale is one every page carries a section for. |

Exactly one row is `primary`, and no tag is written twice. An instance written in English only has one row, `en-US | primary`. The file is required for the reason `model/identifier.md` is: every instance says in one place what language it is kept in, and a default would leave that to whoever reads the code.

## A locale section

A feature in an instance whose primary is `en-US` and which declares `de-CH`:

```markdown
## de-CH

### Name

Rechnungszeilen erklärt

### Statement

> Wer eine Rechnung erhält, sieht, woraus jede Zeile besteht.

### Description

Die Funktion …

### References

| What | URL |
| --- | --- |
| Dokumentation | https://example.com/docs/invoice-lines |
```

`### Name` and `### Statement` are the paths `name` and `statement`; every other heading is the path `section/<heading>`. Nobody writes a path by hand; the heading is the path. A section the schema declares as optional and the page does not have is absent from the locale section too.

## What the check holds

A name in prose is not read by a script in the primary either: R3 leaves it to the agent pass, and so does R19. What a script reads of a locale's names is what has structure. A repeated table's reference cells are the primary's, and a grouped section's `####` headings are the locale's names of the entities the primary's `###` headings name, in the same order, so a German list of achievement kinds reads in German and still resolves.

The instance check fails:

- an instance without `model/localization.md`, one with no primary or more than one, and a tag written twice;
- a page with no section for a declared translated locale, a `## <locale>` section for a locale not declared as translated, and one out of the declared order;
- a locale section missing an element the page has, or holding one the page does not;
- a repeated table whose rows, references, URLs, dates or enum values differ from the primary's;
- two entities of a type with the same name in one locale, and a grouped heading in a locale section that is not the locale's name of the entity the primary's heading names.

A pull request that changes an element of the primary and not its translation in every declared locale fails as well. A commit trailer `Translation-unchanged: <file>#<path>` releases one element, for a change that does not touch what the translation says, as `German-unchanged:` releases a site's German today. The check compares the pull request's head with its base, as `design german stale` does.

## What the tools do

The parser returns every entity with `translations`, a map from locale to its name, statement and sections, beside the primary it returns today.

Every MCP tool that returns text takes an optional `locale`. With it, the name, statement and sections come from that locale, and `search` and every lookup by name match that locale's names. Without it, the tool answers in the primary. A locale the instance does not declare is refused with an `error.code` of its own, so a tool never answers in the primary when it was asked for another language.

The chat answers a reader in a declared locale from that locale's text, and never translates the primary for them. A reader whose language the instance does not declare gets the primary, in the primary's language, and the answer says so.

A site's view in a language renders the model's text in that locale where the instance declares it. The sentence that generated model content stays English in both views holds only where the instance does not.

## Who writes a translation

The Translator seat writes locale sections into a model. `conventions/TRANSLATOR.md` loses "never writes German on a page whose note says the model's own words stay English in both views" for an instance that declares the locale, and the German pipeline runs on a model page as it runs on a site's: the translator, the editor, the back-reader, the fidelity pass and the owner's picks. The commit is the Translator's.

## Concept aliases

A concept's alias of kind `translation` stays, for a name in a language the instance does not declare: what a French customer calls a thing, in an instance that is not kept in French. Where the locale is declared, the concept's name in it is its `### Name`, and an alias of kind `translation` that repeats it fails.

## What was left out

Translated labels for schema elements, for the reasons the schema-id spec gives.

A sibling file or an instance per language. One entity would be two pages.

A fallback to the primary for an element a locale lacks. A reader would get two languages on one page with nothing to tell them which is which; a locale that is not finished stays undeclared.

Machine translation at read time. It is what the issue describes as ungrounded.

## Out of scope

Translating any of the family's instances. The release gives an instance the means; each adopts a locale on the owner's word, as a content project of its own.

## What it costs

A new required singleton makes the release breaking in the terms of `WORKING.md`: every instance adds `model/localization.md` with the re-pin. An instance that declares no translated locale changes nothing else. The parser, the instance check, the MCP server, the chat, each site's renderer and `conventions/TRANSLATOR.md` change with it. The work follows the build of the schema id, whose paths it keys by.
