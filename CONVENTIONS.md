# Conventions

> What makes a graph of Markdown files checkable. Portable across companies by design: a rule
> that names an issue tracker, a wiki, a chat tool or a mail domain belongs in the instance,
> not here.

Validation is agent-run. Invoke it in prose — *"check cross-references in this repository"* —
and the rules below are what is being checked. `npm run verify` covers the mechanical subset.

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

### R9 — Schema files have a fixed shape

Named for the type, singular. In order: `# <Type> Schema`, a `>` tagline, an `**Owner:**`
line if the type is owned, `## File Location`, `## Frontmatter`, `## Sections`. Frontmatter
columns are `Field | Required | Type | Description`; sections columns are
`Section | Required | Description`. Required is `Yes` or `No`. Types come from the closed
vocabulary: `string`, `date`, `array`, `object array`, `enum`, `ref → <type>`. A table's
separator row cells are plain dashes — `| --- |` — never alignment colons such as `:---`,
`---:` or `:---:`.

### R10 — An owned type declares its owner

One `**Owner:**` line in the owned type's schema, and the File Location nests inside that
owner. The declaration goes on the owned type because "what does this belong to?" is asked of
the owned thing.

## Working

### R0 — Cross-reference validation runs before committing

Every rule above is checkable. Run `npm run verify` for the mechanical subset and an agent
pass for the rest — whether a schema's prose is portable, and whether a rule that has crept in
is really about modelling rather than about one company's tooling.
