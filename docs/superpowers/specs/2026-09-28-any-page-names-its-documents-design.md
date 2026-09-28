# Any page names its documents

A feature says what someone can do and names no screen, service or vendor, so it cannot say where someone goes to do it. The chat on three sites, the MCP server, the editor plugin's listing and the command line's page are all addresses a reader of *A visitor asks the model* or *Checks while a file is edited* would follow, and the feature schema has nowhere to write one. Six schemas already have that place, a `## References` table with the columns `What | URL`, declared six times in the same words and missing from every other type. This change states the table once, in CONVENTIONS, as a section every type may carry, and removes the six copies.

Status: decided by the owner on September 28, 2026: every type may carry an optional `## References` with the columns `What | URL`, stated once rather than per schema, and the brand keeps it required; the rule as R9 words it, with the parser adding the declaration to every schema and a schema re-declaring the section only to change its `Required` and its description. The rest of this document is proposed and goes to the owner question by question: whether the five optional declarations go, and that no type is exempt.

## Where this comes from

The question was whether a feature could be mapped to the UI component that delivers it, the chat or the graph view, or to the instances that run it. Neither holds. The feature schema's purpose says that "a feature nobody can name the user of is a component and belongs in neither this type nor this folder", so a component is not what a feature points at. An instance is not either: a feature belongs to a product, and a reference cannot cross from one instance into another, so an edge from blust.ch's chat to CompanyGraph's feature would not resolve. What a reader wants is where to use the feature, and that is an address, not an edge.

A reference field from a surface to the features it offers was considered and set aside. It resolves only inside one instance, and it reaches three of CompanyGraph's eight features, because a surface is a place published without asking and the plugin, the command line, the instance check and the profile skill are each handed to whoever installs them.

The six schemas that declare `## References` today are brand (required), decision, experience, kpi, process and role. Every one declares the same two columns, `What` as a `string` giving the kind of document and `URL` as a `string` giving where it is; only the examples in `What`'s description differ. Copying the table into the other schemas would write it about twenty times, and a column renamed in one copy would drift from the rest without a check noticing.

## The rule

R9 gains a paragraph after the one on joins:

> Every schema has one section it does not declare: `## References`, a table of the documents a reader can check the page against, with the columns `What`, a required `string` naming the kind of document — a specification, a recording, a listing — and `URL`, a required `string` saying where it is. It is optional, it declares no reference and so draws nothing (R16), and a page of any type may carry it. A schema that says more about it declares the section itself, with these two columns exactly as written here, and may change only its `Required` and the sentence after `Table.`; a schema that declares it with other columns is an error.

Every reader of a schema then holds the section as if the schema had declared it: the checker holds its columns and its rows, the parser reads it as data, the MCP server's `describe_schema` lists it, and the editor's section picker offers it on every page. Nothing that walks the sections names `References`; the parser adds the declaration to each schema it reads that does not carry one, and every reader after it takes the schema as given.

`## Also at` stays where it is, on identity and profile. A presence is a place the company or person keeps a page of their own; a reference is a document that backs what the page says. The two answer different questions, and identity's and profile's schemas already say that a single post or recording belongs in an experience's `## References` and not in `## Also at`.

## The schemas

Brand keeps its declaration, because its section is required: it is where the tokens, the mark's file and the rulebook are, and a brand without them states values nothing can apply.

Decision, experience, kpi, process and role lose theirs, since an optional table with the shared columns is what the rule already gives them. What each description says beyond the columns becomes one writing rule, where a reader of that type will look for it:

| Schema | Writing rule it gains |
| --- | --- |
| decision | A References row is a document a reader can check the call against: a specification, a contract, a pull request. |
| experience | A References row is a document a reader can check the entry against, and `url` stays the entry's own address. |
| kpi | References say where the definition comes from and where the targets and values are kept. |
| process | References are the rulebooks the process is run by. |
| role | References are the documents the seat works by, a rulebook or a mandate. |

The kpi and brand writing rules that already name "a References row" read the same afterwards.

The feature schema gains one writing rule, since it is the type this started from: a References row says where someone can use the feature, and `What` names the kind of place, a chat, a listing, a command's page, never the surface, product or vendor by name.

No type is exempt. A kind, a status or a proficiency level will rarely carry references, and an exemption would be a second rule to learn for a section nobody has to write.

## Writing the table

Three rules apply on every type and are written once, under R9's new paragraph:

- `What` names the kind of document in a few words, not its title and not an entity's canonical name: the table is data, and a cell that reads like a name invites a reader to look for the entity.
- `URL` is an absolute `https` address to the document itself, not to a search or a feed that happens to contain it.
- One row per document. Two documents of the same kind are two rows.

## The checks

`verify` gains a fixture schema that declares `## References` with a third column, and fails it; the six core schemas and `example/` pass. The instance checks gain a fixture page of a type whose schema declares nothing, carrying a `## References` table with a missing `URL` cell, and fail it under R16; the same page with both cells filled passes. Each fixture is run failing before its passing case is read, so the zero means the check can fire.

The parser's test gains a schema with no References declaration, read back with the section present, optional and drawing no edge, and brand's declaration read back as required.

## What moves downstream

The core release is a minor one: an instance that carries no new table is unchanged, and every page that carries one today stays valid. Both instances and `example/` are run against the branch before it is proposed, and pass unchanged.

The parser change reaches the MCP servers, the editor plugin and the three sites through their usual re-pins, and none of them needs code of its own: each reads sections from what the parser gives it. The cards on blust.ch and companygraph.io already render a References table as links, whichever type carries it.

The first content is CompanyGraph's eight features, one pull request in companygraph/mental-model after the release, each row written from the place itself rather than from memory. It is not part of this change.
