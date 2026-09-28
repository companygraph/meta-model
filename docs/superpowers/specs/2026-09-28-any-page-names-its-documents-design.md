# Any page names its documents

A feature says what someone can do and names no screen, service or vendor, so it cannot say where someone goes to do it. The chat on three sites, the MCP server, the editor plugin's listing and the command line's page are all addresses a reader of *A visitor asks the model* or *Checks while a file is edited* would follow, and the feature schema has nowhere to write one. Six schemas already have that place, a `## References` table with the columns `What | URL`, declared six times in the same words and missing from every other type. This change makes every schema declare the table, and a rule in CONVENTIONS says each one must, with the same two columns.

Status: decided by the owner on September 28, 2026: every type carries `## References` with the columns `What | URL`, and brand keeps it required. Every schema declares the section itself, because a declaration written in the schema is explicit where one a parser adds is not, and R9 requires the declaration of every schema, so none is exempt. An earlier draft had the parser add the section to every schema from a rule in CONVENTIONS; the owner preferred the explicit form. The rule's wording and the writing rules below are proposed and go to the owner with the pull request.

## Where this comes from

The question was whether a feature could be mapped to the UI component that delivers it, the chat or the graph view, or to the instances that run it. Neither holds. The feature schema's purpose says that "a feature nobody can name the user of is a component and belongs in neither this type nor this folder", so a component is not what a feature points at. An instance is not either: a feature belongs to a product, and a reference cannot cross from one instance into another, so an edge from blust.ch's chat to CompanyGraph's feature would not resolve. What a reader wants is where to use the feature, and that is an address, not an edge.

A reference field from a surface to the features it offers was considered and set aside. It resolves only inside one instance, and it reaches three of CompanyGraph's eight features, because a surface is a place published without asking and the plugin, the command line, the instance check and the profile skill are each handed to whoever installs them.

The six schemas that declare `## References` today are brand (required), decision, experience, kpi, process and role. Every one declares the same two columns, `What` as a `string` giving the kind of document and `URL` as a `string` giving where it is; only the examples in `What`'s description differ. Writing the table into every schema repeats it in each, and a column renamed in one copy would drift from the rest unless a check holds them to one shape. R9 is that check.

## The rule

R9 gains a paragraph after the one on joins:

> Every schema declares `## References`, a table of the documents a reader can check the page against, with the columns `What`, a required `string` naming the kind of document — a specification, a recording, a listing — and `URL`, a required `string` saying where it is, written exactly so. It declares no reference and so draws nothing (R16). A schema chooses its `Required`, `No` unless the type cannot be applied without its documents, and says in the sentence after `Table.` what its references are for. A schema without the section, or with other columns, is an error.

Nothing that reads a schema changes. The parser, the checker, the MCP server's `describe_schema` and the editor's section picker already read a declared table section, so each reads `## References` on every type the moment the schema declares it. No parser release is needed.

`## Also at` stays where it is, on identity and profile. A presence is a place the company or person keeps a page of their own; a reference is a document that backs what the page says. The two answer different questions, and identity's and profile's schemas already say that a single post or recording belongs in an experience's `## References` and not in `## Also at`. Identity and profile carry both.

## The schemas

The six that declare it keep their declarations as they are: brand's required, the other five optional.

Every other schema in `core/` gains the row in `## Sections`, optional, and the column table after its last one. The sentence after `Table.` says what the type's references are for, in the type's own terms. For a feature: "Where someone can use the feature: a chat, a listing, a command's page." For a concept: "Where the term is defined outside the model: a standard, a glossary." Each is written when the schema is, and the pull request lists them for the owner.

The feature schema also gains one writing rule, since it is the type this started from: `What` names the kind of place, never the surface, product or vendor by name.

## Writing the table

Three rules apply on every type and are written once, under R9's new paragraph:

- `What` names the kind of document in a few words, not its title and not an entity's canonical name: the table is data, and a cell that reads like a name invites a reader to look for the entity.
- `URL` is an absolute `https` address to the document itself, not to a search or a feed that happens to contain it.
- One row per document. Two documents of the same kind are two rows.

## The checks

`verify` holds every schema to the rule: a fixture schema with no `## References` fails, one that declares it with a third column fails, and one whose `URL` column is optional fails; every schema in `core/` and `example/` passes. Each fixture is run failing before the passing case is read, so the zero means the check can fire. The instance checks already hold a declared table's columns and rows under R16 and need no change; a fixture page carrying a `## References` row with an empty `URL` cell shows they hold it on a type that newly declares the section.

A pack's schema is held to the same rule, so a pack written before the release fails `verify` until it declares the section. No pack exists yet.

## What moves downstream

The core release is a minor one: every type gains an optional section, no page loses anything, and both instances and `example/` are run against the branch before it is proposed and pass unchanged. The package release carries the new check.

Each instance re-pins its vendored core, which is where the schemas live. The MCP servers, the editor plugin and the three sites read the schemas the instance vendored, so they show the section with their next content re-pin and need no code. The cards on blust.ch and companygraph.io already render a References table as links, whichever type carries it.

The first content is CompanyGraph's eight features, one pull request in companygraph/mental-model after the release, each row written from the place itself rather than from memory. It is not part of this change.

## Left for later

That a `URL` cell is an absolute `https` address to the document itself is a writing rule, held by the agent pass and by no script. A script could hold it only through a new column type, `url`, in R9's closed vocabulary, which would then hold every `url` column and the `url` fields of experience, identity, source and surface as well. That is its own change and its own release, and the owner asked for it to be recorded here rather than made now.
