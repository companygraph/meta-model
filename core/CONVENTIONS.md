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

A name identifies an entity within its type, not across the instance. Two entities of one type
may not share a name; two of different types may. Every schema declares its references as
`ref → <type>`, so a reference carries a type as well as a name, and the pair is what resolves
— which is why R4 fails a name that exists under a type other than the one asked for.

The case that requires this is a company of one, where the company and the only person in it
are the same human and are called the same thing. A name unique across the whole instance
would force one of them to be called something nobody calls it, and the graph would then
describe a naming workaround rather than the company.

A tool that resolves by name alone — one that recognizes a reference by the value happening to
be a canonical name, rather than by reading the schema that declares it — cannot use the type
to choose between two entities sharing one. It refuses rather than guesses: such a name is an
error where it is used, naming the types it was found under. Resolving to the first match, or
to the one in the nearest folder, is the failure this makes impossible.

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

A type with exactly one entity is a file too, sitting directly in the container: a company has
one identity and one vision, and a folder that will never hold a second entity is a plural that
never arrives. The filesystem then enforces the cardinality — there is nowhere to put a second
one — which is a constraint no rule has to state and nobody can forget.

### R7 — Folders are the plural of the type

The type is singular because it says what one entity is. No folder is shortened for
readability: an abbreviated folder is an exception to the one rule that makes the two names
predictable, bought with nothing.

A singular type has no folder at all (R6), so there is nothing to pluralise.

### R13 — The instance's content lives in one container

Every entity lives under `model/`, and nothing else does. What sits beside it — the vendored
metamodel, the tooling, the working documents, the packaging — is not content and is never
walked as content.

The container is what makes the rule closed. Without it, whatever walks an instance needs a list
of folders that are *not* content, and such a list is an enumeration: it goes stale the first
time somebody adds a directory, and the walk starts reporting a folder nobody meant to describe.
With it, "is this an entity?" is answered by where the file is.

A folder directly under `model/` is a type's folder and is named by a schema — core's, or any
pack the instance declares. A file directly under `model/` is a singular type's entity (R6).
Numbering follows the age of a rule, not its section: this one is newer than R8 and belongs
here.

### R14 — Names and prose are American English

Every name this vocabulary chooses is spelled in American English — a field, a type, a folder,
a section heading a schema declares — and so is the prose of `core/` and of an instance's
content. `organization`, `modeling`, `license`, `recognize`.

Excepted: proper nouns, quoted matter, and any name fixed by something outside this
vocabulary — a product, a standard, a legal entity, a `LICENSE` file whose name is what the
ecosystem reads. The rule governs what this vocabulary calls things, not what the world has
already named.

*A name is not prose* is the argument for leaving one British spelling in place, and it loses:
a reader meets both in the same file, and a vocabulary that spells its fields one way and its
sentences another has no rule at all, only a habit with an exception.

## Schemas

### R8 — Enum values are listed in the schema

A field typed `enum` states its permitted values. Any other value is an error, which is the
whole reason to type it `enum` rather than `string`.

`enum` is for a closed set of bare tokens. A set whose members carry a definition of their own
is not an enum — make it a type, so the definition lives in one file and everything references
it by canonical name. Otherwise the definitions end up restated on every entry that uses one,
or nowhere at all.

The same test applies to frontmatter. A field whose value is a list of records is a table
wearing YAML: put it in the body as a Markdown table and declare its columns in the schema. It
renders where a reader looks, it has no quoting hazard, and it is checkable on identical terms.
Frontmatter is for short facts.

So a list of *bare names* stays in frontmatter, typed `array of ref → <type>`; a list of
*records* becomes a table in the body. The same reference therefore appears in both places and
that is not an inconsistency — an experience naming the skills it used is a list of names and
nothing more, while a profile's claim on a skill carries a level and its evidence. What decides
the shape is whether the edge has attributes of its own.

### R9 — Schema files have a fixed shape

Named for the type, singular. In order: `# <Type> Schema`, a `>` tagline, an `**Owner:**`
line if the type is owned, `## File Location`, `## Frontmatter`, `## Sections`, and then
`## Purpose` and `## Writing rules` where the type has them. The path under
`## File Location` is written in backticks and begins at the container, `model/` (R13). For a
type with many entities the last folder it names is the type's own, and what comes before it is
where that folder sits: `model/` alone, for a type nothing owns; the owner's path, for a type
that is owned (R10). So `model/skills/*.md`, and
`model/profiles/<profile>/experiences/*.md`. A singular type names its file instead, directly
in the container: `model/vision.md`.

`## Frontmatter` holds one table and only one — a field is a row in it — with columns
`Field | Required | Type | Description`. A type with no fields says `No YAML frontmatter.`
instead, so that "no table" and "forgot the table" stay distinguishable. `## Sections` opens
with the sections table, whose columns are `Section | Required | Description`.

A section whose content is itself a table declares that in the sections table: its Description
begins with `Table.`, and a table naming that section's columns follows, with columns
`Column | Required | Type | Description`, read on the same terms as the frontmatter table
except for the list types below. The column table is introduced by a caption line naming its
section — `` `## Skills` is a table with these columns: `` — and the caption, not the
position, is what says which section the columns belong to. The sections table is then free
to list its rows in whatever order reads best. A section marked `Table.` with no column
table, and a column table for a section not marked `Table.`, are both errors: each half
means nothing without the other.

Required is `Yes` or `No`. Types come from the closed vocabulary: `string`, `number`, `date`,
`array`, `enum`, `ref → <type>`, `array of ref → <type>`. A reference names one entity, so
the type it points at is singular: `ref → skill`, never `ref → skills`.

`date` is `YYYY`, `YYYY-MM` or `YYYY-MM-DD`. A date is written at the precision its source
states and never at more; an author may deliberately record less. A shorter form is an
interval, not a point: `2002` is the whole year, and a comparison takes its earliest instant,
so `2002` orders before `2002-03`.

The form is stated here rather than in the description of whichever field happens to use it,
because a type in a closed vocabulary that means different things in two schemas is not closed.
`date` was the only member whose lexical form was never written down, and while it went unsaid
one schema's description fixed it at `YYYY-MM` — which made an instance invent a month for a
diploma that states a year, and left a talk's known day in prose because no field could hold
it. A rule that forces both an invention and a discard is the wrong rule.

Where each form is legal follows from one distinction: **a frontmatter field may hold one
value or a list; a table cell holds one value.** The whole vocabulary is therefore open to a
frontmatter field, and both `ref → <type>` and `array of ref → <type>` there must resolve. In
a column table the list types — `array` and `array of ref → <type>` — are an error, not
something to be read leniently, because there is nothing for them to mean: a column that
references another entity is typed `ref → <type>`. A list of bare names stays a frontmatter
field (R8); it never becomes a column.

`## Purpose` and `## Writing rules` come last, after every table, and say what the shape above
cannot: what the type is *for*, and what separates a good entity of it from one that merely
has the shape. Purpose is one paragraph — the sentence someone needs before writing their
first entity of the type, not the rationale for the design. Writing rules are a list, one
sentence each, and each one has to be checkable by an agent reading an entity: "person-neutral:
no name, employer, date or number from any profile" can fail, and "write well" cannot. They are
about what goes *in* a field or section; whether a field is required is the table's business,
not theirs.

They come as a pair or not at all: writing rules with no purpose is the same half-a-thing as a
`Table.` section with no column table, since the rules are how the purpose is met. Both are
optional in the shape and neither is optional in core, which is what gets copied — a schema
you write for a type of your own may leave them out, and every schema in `core/` has them. The
reader that checks the shape stops at the tables, so nothing that reads a schema mechanically
sees them; the agent pass does, which is the point of putting them in the schema rather than
in a document beside it.

A table's separator row cells are plain dashes — `| --- |` — never alignment colons such as
`:---`, `---:` or `:---:`.

A schema is not an entity, so it never lives in a folder named for a type: such a folder holds
entities of that type and nothing else, and a schema sitting in one would be read as an entity
by anything walking it. Where the schemas do live is the repository's own business — this says
only where they cannot.

### R10 — An owned type declares its owner

One `**Owner:**` line in the owned type's schema, and the File Location nests inside that
owner. The declaration goes on the owned type because "what does this belong to?" is asked of
the owned thing.

R9 says the path ends with the type's own folder and this says where that folder sits, so an
owned type satisfies both: `experience` is owned by `profile`, its folder is `experiences`,
and its path is `profiles/<profile>/experiences/*.md`. An earlier wording of R9 had the path
*begin* with the type's own folder, which no owned type could satisfy.

### R11 — A list-valued frontmatter field is a block sequence

A field typed `array` or `array of ref → <type>` is written one entry per line:

```yaml
skills:
  - API design
  - Software modeling (UML, SysML, C4)
```

A flow sequence — `skills: [API design, Software modeling (UML, SysML, C4)]` — is an error,
because an entry may contain a comma and nothing there is malformed when it does. That line
holds three fragments, no parser complains, and R4 catches it only for as long as the
fragments resolve to nothing: the day `SysML` is a skill of its own, the claim is wrong and
every check agrees it is fine. Quoting the entry fixes one file and is a rule people forget;
a block sequence has no quoting hazard to remember. It also gives a diff one line per
reference added or removed, which is the other reason to want it.

A field holding one value stays on the key's own line. This is about lists.

### R12 — A filename is derived, and the derivation is stated

**Slugging a string means: lower-case it, replace every run of characters outside `a–z` and
`0–9` with a single `-`, and drop any leading or trailing `-`.**

| string | slug |
| --- | --- |
| `Data protection (GDPR)` | `data-protection-gdpr` |
| `CI/CD` | `ci-cd` |
| `Software modeling (UML, SysML, C4)` | `software-modeling-uml-sysml-c4` |
| `Zürich office` | `z-rich-office` |

The last is ugly and that is the point. A non-ASCII letter drops rather than being
transliterated, because transliteration is where two implementations differ — `ü` becomes `ue`
in one and `u` in another — and then whatever writes the file and whatever checks it disagree
about the same file. Dropping is the rule nobody has to look up. An instance that dislikes the
result renames the entity, which is the honest fix: R2 makes the H1 canonical and R3 keeps the
filename out of every reference, so a filename is free to be ugly.

**By default a file is named for the slug of its H1**, and a folder entity's folder likewise
(R6). A singular type's file is named for the type — `vision.md`, `identity.md` — which leaves
its H1 free to be a sentence. A type whose files are named some other way says so in its own schema, and one is:
`experience` is named for its start year, a `-`, and a slug the author chooses to identify the
period — `2018-northwind-atelier.md` for an experience whose H1 is
`Rebuilding the order pipeline`.

That one is *chosen* rather than derived, and the schema says so rather than naming a field to
derive it from. An experience's H1 says what happened, which neither sorts nor scans in a
folder listing; `organization` is optional, so it cannot be what a required filename comes
from; and the same organization recurs across periods, so it does not identify one anyway. What
a stated form still fixes is everything worth fixing: the prefix is the year in `start`, the
rest is a slug by the definition above, and the whole is unique in its folder.

Two entities in one folder that end up with the same filename are an error. The folder, not the
type: an owned type shares a folder only with its owner's other entities, so two profiles may
each hold an experience named the same way and both files are correctly named.

This is here rather than in a tooling document because a filename is written by whoever writes
the file, and the first instance was written by hand. A rule only a program can consult is not
a convention.

### R15 — A page's frontmatter fields are the ones its schema declares

A frontmatter field its schema does not declare is an error. This binds a page whose folder
matches a type's stated File Location; a file matching none has no schema, so nothing declares
what its frontmatter may hold and nothing reads it.

What the rule costs is the local field: an instance cannot carry one of its own. What it buys
is that a rename cannot half-happen. An undeclared field resolves no reference and satisfies no
requirement — but it still renders, which is how a field left behind by a rename survives on
the page under the old name while every other check reports green.

## Working

### R0 — Validation runs before committing

Nothing is committed without a validation pass over the rules above. The pass is an agent
reading the files against these rules. A repository may also own a script that checks some of
them; nothing here depends on having one.

Which rules those scripts reach is worth stating plainly. In the CompanyGraph repository,
`npm run verify` runs `verify/check.mjs`, which mechanically checks part of R4, R6, R9, R10,
R11 and R12 against this repository's own files, plus a meta-check under R0 that fails if any
check cites a rule this document does not define. `npm run test:instance` exercises the
instance parser's implementation of the rules it cites — R2, R3, R4, R5, R6, R7, R9 and R13 —
against fixtures rather than files, and `npm run test:rules` extends that meta-check to the
rules the parser cites in its comments and error messages. No file is checked against R1, R2,
R3, R5, R7 or R8; where a check happens to touch one, it is incidental to the rule that check
cites. Treat all six as agent-enforced — which is by design, not by omission: the claim this
model ships under is that schemas written as prose are enforceable by agents.

Those scripts are this repository's own harness. Copying `CONVENTIONS.md` into a company
brings the rules and not the scripts — there is no `verify` script there, and what these run
against is this repository's own files and its own parser, not yours. The agent pass is the
portable part, and it is the only thing that covers what no script reaches: whether a schema's
prose is portable, and whether a rule that has crept in is really about modeling rather than
about one company's tooling.
