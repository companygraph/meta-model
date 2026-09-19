# A name of an owned type is its owner's

R5 nests an owned collection inside its owner, and R2 says a name identifies an entity within
its type. Put together they leave a question open that the owner asked on September 19, 2026,
the day a process's phases became a table: is it guaranteed that the phases a process may name
are the ones in its own folder, and the same for the experience a profile's evidence names?

Status: the first half, the check, is built here, on top of the change that made the phases a
table. That change was released with the evidence table while this was being written, so this
one is a release of its own and not part of that one. The second half, how far an owned name
reaches in the parser, is decided in principle by the owner and designed below; it is not
built, and it is its own change.

## What was true, measured against the example

A process's `## Phases` was held to its own folder by the check that came with the table. A
profile's `## Evidence` was not: with one profile's row naming an experience another profile
owns, every check passed and the parser read it, the qualifier resolved and the edge it
qualifies carried a period that was never the person's. The profile schema says what it wants,
"the H1 of a file in this profile's `experiences/`", and said of it "neither is checked", for a
reason that no longer holds: the rule was thought to need the checker to name a type.

A third case turned up beside the two. Two processes that each own a phase of one name pass
every check and make the parser throw, R2, "two phase entities share the name". The parser
indexes names by type across the whole instance, and the checks list a type's own folder and do
not reach into an owner's. An instance could be green in its CI and fail where a site is built.

## Every reference to an owned type is written inside its owner

Core declares three: a process's `Phase` column, a phase's `gate-to`, a profile's `Experience`
qualifier. The first and third are written in the owner, the second in an entity the same owner
owns. None reaches an owned entity from outside its owner, which is what lets the rule be
stated without new syntax.

## The check

**A name of an owned type is one of its owner's own.** It names no type. Wherever a schema
declares a field, a column or a grouped heading as `ref`, `array of ref` or `qualifier` to a
type that is owned, in an entity that is the owner or is owned by the same owner, the value is
the H1 of an entity in that owner's own folder of the owned type. It cites R5. A `ref?` is held
to nothing, as everywhere. A reference to an owned type written outside every owner of it has no
scope to be held to and is not read; core declares none.

The check that came with the phases table loses the half this one now holds for every such
name, a row that is not the owner's own, and keeps what only a listing has: that it is complete,
says each thing once, and is in the order the owned give. One cause is one finding.

Not built: the other half of the profile schema's rule, that the experience a row names lists
the row's skill. It would name a type, which the checks do not, and it stays the agent pass's.

## How far an owned name reaches: the owner's answer, made generic

The owner's answer is that a name's scope follows ownership: a phase belongs to its process and
an experience to its profile, so two processes may each have a phase called Review. That is R5
read for names, and it replaces the instance-wide reading the parser has today, which no rule
states.

Stated generically, with no type named:

- **R2, amended.** A name identifies an entity within its type; for an owned type, within its
  owner. Two entities of an owned type may share a name where their owners differ.
- **R4, amended.** A reference to an owned type is resolved from where it is written: within
  the owner the referring entity is, or is owned by. Written anywhere else it names nothing,
  since it has no owner to be resolved in. Should a reference from outside ever be needed, it
  names the owner first and the entity within it, and that form is designed when it is wanted,
  not before.

What follows. The parser keeps one index of names per type and, for an owned type, per owner;
`resolve` is given the referring entity and looks in its owner's index; the R2 refusal of a
shared name applies within an owner. Identifiers are paths already and do not change, so a
drawn graph is unchanged. The check above is then not an extra constraint beside resolution but
resolution itself, read from the checks' side, and the two agree by construction. A consumer
that looks an entity up by type and name, as the MCP server's `get_entity` does, meets two
answers for an owned name and has to say whose; it already refuses a name found under two types
and names them, and the same refusal serves. An editor offers, in an owner, only the owner's
own names. It makes an instance that is invalid today valid and none that is valid invalid,
except one that names another owner's entity, which its schema's prose already forbade; it
changes no declared shape, so `shape` stays, and it is a minor.

## What it asks of a release

Core's bytes change in two places, a writing rule of the profile schema that said what is not
checked and R0's account of which rules a script reads, and the package gains a check. An
instance that names only its owners' own entities does nothing. One that names another owner's
was already against its schema's prose and now fails by name. By the release contract that is a
rule corrected and prose fixed, a patch, for core and the package together so that the two
numbers keep agreeing; the workflow's ref moves with the package, in the commit that prepares
the release and not in this one. Which number it takes is the owner's to say at tagging.
