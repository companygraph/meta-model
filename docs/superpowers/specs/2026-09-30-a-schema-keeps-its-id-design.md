# A schema keeps its id

An entity keeps its id since R18, and a schema does not. The parser hands out `core/feature` for the feature schema, which is its file name, so the day a type is renamed every link to it breaks: in the MCP server's answers, in a consumer's graph, in anything outside the model that names a type. meta-model #195, a model kept in more than one language, brought the question up, and the owner has settled what this spec takes from it: the meta-model stays American English, an instance may carry other languages, and a translation decorates the element it translates, named by that element's path. Every schema gains an `id` in the form R18 gives an entity, and every element of a schema gains an address built from that id.

Status: decided by the owner on September 30, 2026: an id per schema and none per element, UUID version 7, a backfill from the first commit, element addresses built from the keys the schema already writes, a spec and a pull request of their own after the entity-id build merges, and no translated labels for schema elements.

## Where this comes from

meta-model #194 gave every entity an id that survives a rename, in `2026-09-30-an-entity-keeps-its-id-design.md`. meta-model #195 asks for one entity with its name and prose in several languages, and leans on #194. Talking it through, the owner split #195 in two: this spec, which gives a type an id that outlives its name and every element a path, and a second one for the translations themselves, with a singleton that declares which locales an instance supports. A translation is not a second page of the entity: it decorates the one page, so R18's rule that no two pages share an id stands unchanged.

## The rule

R9 gains a first sentence, before `Named for the type, singular.`:

> A schema file opens with YAML frontmatter holding one field, `id`: a UUID version 7 (RFC 9562), in lowercase, that R18 holds as it holds an entity's.

R18 gains a last sentence:

> A schema keeps its id by the same rule, and an element of a schema — a field, a section, a column or an enum value — is addressed by its schema's id and the key the schema writes it under.

The format is fixed rather than declared. `model/identifier.md` is an instance's, and core has none; nobody but core makes a core schema, so a second format would serve nobody.

## Ids per schema, not per element

A field, a section, a column and an enum value already have a stable key: the one every page writes. `products` is in the frontmatter of every feature in every instance, and `## References` is a heading on every page that has one. Renaming either is a breaking release that every page has to follow, and an id of its own would not keep one of those pages from breaking. A type's name is different: the schema file carries it, and a rename moves it without anything else having to change its meaning. So the schema carries an id, and an element is addressed from it.

## Element addresses

An element's address is its schema's id, a slash and a path:

| Element | Path | Example |
| --- | --- | --- |
| The type itself | none | `<id>` |
| The H1 | `name` | `<id>/name` |
| The `>` line | `statement` | `<id>/statement` |
| A frontmatter field | `field/<key>` | `<id>/field/products` |
| A `##` section | `section/<heading>` | `<id>/section/References` |
| A column of a body table | `column/<section>/<column>` | `<id>/column/References/What` |
| An enum value | `enum/<via>/<value>` | `<id>/enum/format/uuidv7` |

`<via>` is the field's key or `<Section>.<Column>`, the name `via` already gives it in the parser and the MCP server. The values are the backticked tokens `enumTokensOf` reads from the description. A key is written as the schema writes it, so the address reads back to the element it names without a lookup.

When a breaking release renames a key, the addresses under it change with it. An instance's translations follow the rename as its pages do.

The second spec keys an entity's translations by the path alone, `name` or `section/Description`, since a page's type is already known on the page. The schema id matters where a type is named from outside a page.

## What the tools return

`parseSchemas` returns the schema's `id` as the entity's `id`, where it returns `core/<type>` today, and keeps `core/<type>` as the path. A function in `lib/ids.mjs`, `addressOf(schemaId, element)`, builds an address, and `elementOf(address)` reads one back. The MCP server's `describe_schema` and `list_types` accept the id or the type and always return the id, as its entity tools do under R18.

## What the check holds

`verify` in this repository fails a schema with no `id`, an `id` that is not a lowercase UUID version 7, two schemas with the same `id`, and an `id` that differs from the one the same schema carries on the default branch. The last one reuses the history check the entity-id build adds.

The instance check fails a vendored schema with no `id` or a malformed one. It does not compare against history: a vendored schema changes when its core does, and the release the manifest names is what it answers to.

## Backfilling

Each schema's id takes the author time of its file's first commit, followed across renames with `git log --follow`, the way the entity backfill works. The commit that writes them is the Implementer's. A schema made later is given a fresh UUID version 7 by whoever makes it.

## Out of scope

Translations, and the singleton that declares an instance's locales. They are the second spec #195 needs, and it builds on the paths here.

## What was left out

Translated labels for schema elements, «Funktion» for `feature` or «Referenzen» for `## References`. Nothing reads them: a site's headings are its own `data-de` strings, a chat answering in German translates a type's name as it translates any word, an author writes the English keys in every language, and consistent terms already come from a glossary. Every core release that added a field would stall every multilingual instance's re-pin until someone wrote its labels. A surface that renders the model with no chrome of its own, in another language, would need them, and none exists; the addresses here let one add them later without breaking anything.

## What it costs

Every core schema gains three lines of frontmatter. Nothing an instance writes changes, so the release is a minor one: an instance takes the ids when it re-pins and re-vendors its core. The parser, `verify`, the instance check and the MCP server's two schema tools change with it. The work starts once the entity-id build has merged, since it reuses `lib/ids.mjs` and the history check from that build.
