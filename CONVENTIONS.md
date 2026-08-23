# Conventions

> What makes a graph of Markdown files checkable. Portable across companies by design: a rule
> that names an issue tracker, a wiki, a chat tool or a mail domain belongs in the instance,
> not here.

Validation is agent-run. Invoke it in prose — *"check cross-references in this repository"* —
and the rules below are what is being checked. Some of them can also be checked by a script,
but whether such a script exists is a property of the repository, not of these rules. R0 says
which ones the CompanyGraph repository checks that way.

## Structure

### R1 — One entity per file

A file describes exactly one entity. A document with a heading per entity is not a
collection: a heading has no canonical name, so nothing can reference it.

### R2 — The canonical name of an entity is its H1

Not the filename, not a frontmatter field, and not the first of several fallbacks. A fallback
chain is what makes a reference unresolvable without running code.

### R3 — Every reference is by canonical name

Never by file path and never by filename. Paths move; a canonical name is the entity.

### R4 — An unresolvable reference is an error

Not a warning. A reference naming an entity that does not exist, or that exists under a
different type, fails the check.

### R5 — An owned collection nests inside its owner

A type that cannot exist without another lives inside that owner's folder and never appears
at the root. Removing the owner then removes what it owned, and an orphan cannot be
represented.

### R6 — An entity that owns collections is a folder

The folder is named for the entity, holds the entity's own file — also named for the entity —
and one folder per owned type beside it. An entity that owns nothing is a file. `README.md`
is never an entity's file.

### R7 — Folders are the plural of the type

The type is singular because it says what one entity is. No folder is shortened for
readability: an abbreviated folder is an exception to the one rule that makes the two names
predictable, bought with nothing.

## Schemas

### R8 — Enum values are listed in the schema

A field typed `enum` states its permitted values. Any other value is an error, which is the
whole reason to type it `enum` rather than `string`.

`enum` is for a closed set of bare tokens. A set whose members carry a definition of their own
is not an enum — make it a type, so the definition lives in one file and everything references
it by canonical name. Otherwise the definitions end up restated on every entry that uses one,
or nowhere at all.

### R9 — Schema files have a fixed shape

Named for the type, singular. In order: `# <Type> Schema`, a `>` tagline, an `**Owner:**`
line if the type is owned, `## File Location`, `## Frontmatter`, `## Sections`. The path under
`## File Location` is written in backticks and begins with the type's own folder. Frontmatter
columns are `Field | Required | Type | Description`; sections columns are
`Section | Required | Description`. A field typed `object array` is followed by a second table
describing that field's keys, with columns `Key | Required | Type | Description`, read on the
same terms as the first. Required is `Yes` or `No`. Types come from the closed
vocabulary: `string`, `date`, `array`, `object array`, `enum`, `ref → <type>`. A reference
names one entity, so the type it points at is singular: `ref → skill`, never `ref → skills`.
A table's separator row cells are plain dashes — `| --- |` — never alignment colons such as
`:---`, `---:` or `:---:`.

### R10 — An owned type declares its owner

One `**Owner:**` line in the owned type's schema, and the File Location nests inside that
owner. The declaration goes on the owned type because "what does this belong to?" is asked of
the owned thing.

### R11 — Schemas live in `meta/`

An instance keeps its schemas together in `meta/`, beside the type folders they describe. Core
ships them flat in `core/`, because core holds nothing but schemas and a folder inside it would
separate nothing; copying them into an instance puts them in `meta/`, where a folder of schemas
and a folder of entities cannot be mistaken for one another.

## Working

### R0 — Validation runs before committing

Nothing is committed without a validation pass over the rules above. The pass is an agent
reading the files against these rules. A repository may also own a script that checks some of
them; nothing here depends on having one.

Which rules that script reaches is worth stating plainly. In the CompanyGraph repository,
`npm run verify` runs `verify/check.mjs`, which mechanically checks part of R4, R6, R9 and
R10 against this repository's own files, plus a meta-check under R0 that fails if any check
cites a rule this document does not define. R1, R2, R3, R5, R7 and R8 have no check of their
own; where a check happens to touch one, it is incidental to the rule that check cites. Treat
all six as agent-enforced — which is by design, not by omission: the claim this model ships
under is that schemas written as prose are enforceable by agents.

That script is this repository's own harness. Copying `CONVENTIONS.md` into a company brings
the rules and not the script — there is no `verify` script there, and this one checks the
files here. The agent pass is the portable part, and it is the only thing that covers what no
script reaches: whether a schema's prose is portable, and whether a rule that has crept in is
really about modelling rather than about one company's tooling.
