# A name of an owned type is its owner's

R5 nests an owned collection inside its owner, and R2 says a name identifies an entity within
its type. Put together they leave a question open that the owner asked on September 19, 2026,
the day a process's phases became a table: is it guaranteed that the phases a process may name
are the ones in its own folder, and the same for the experience a profile's evidence names?

Status: the first half, the check, was released as 0.30.1. The second half, how far an owned name
reaches, was open when that was released, with both answers set against each other below. **The
owner decided it on September 19, 2026: a name of an owned type is unique within its owner.** It
reverses the process design of September 16, which chose names unique across the instance. The
decision is built in the change that follows this note: R2 and R4 amended as the last section
states them, the phase schema's rule rewritten, the parser resolving an owned name within the
owner it is written in, and a check that two entities of one name within one owner fail, while
across owners they pass.

## What was true, measured against the example

A process's `## Phases` was held to its own folder by the check that came with the table. A
profile's `## Evidence` was not: with one profile's row naming an experience another profile
owns, every check passed and the parser read it, the qualifier resolved and the edge it
qualifies carried a period that was never the person's. The profile schema says what it wants,
"the H1 of a file in this profile's `experiences/`", and said of it "neither is checked", for a
reason that no longer holds: the rule was thought to need the checker to name a type.

A third case turned up beside the two. Two processes that each own a phase of one name pass
every check and make the parser throw, R2, "two phase entities share the name". The parser is
right by the rules as they stand: R2 scopes a name to its type, and the phase schema draws the
consequence in so many words, that a phase's name is unique across every phase in the instance
and two processes cannot each call a phase `Review`. What is wrong is that the checks do not
say it. They list a type's own folder and do not reach into an owner's, so an instance can be
green in its CI and fail where a site is built. An earlier draft of this note said no rule
states the instance-wide reading; that was false, and the owner was told so.

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

## How far an owned name reaches: two answers, and the owner's to choose

**What core says today.** R2: a name identifies an entity within its type, and two entities of
one type may not share a name. It closes on a warning, that resolving "to the one in the nearest
folder" is the failure the rule makes impossible. The process design of September 16, 2026 met
this very case and decided it: a phase's name is unique across the instance, "the cost falls
only between processes, and the fix is to name a phase for what it does in the process it
belongs to". The phase schema carries that as a writing rule. Under this answer one gap remains,
the one above: the checks should fail two owned entities of one type that share a name, across
owners, as the parser does. It is a small check and names no type.

**What the owner leans toward.** Asked cold, before this history was put to him, he answered
that a name's scope should follow ownership: a phase belongs to its process and an experience to
its profile, so two processes may each have a phase called Review. Stated generically, with no
type named, that is two amendments. R2: a name identifies an entity within its type, and for an
owned type within its owner. R4: a reference to an owned type is resolved from where it is
written, within the owner the referring entity is or is owned by; written anywhere else it has
no owner to be resolved in, and a form that names the owner first is designed if it is ever
wanted. It needs no new syntax because every reference core makes to an owned type is written
inside its owner. The parser would keep a name index per owner for an owned type and give
`resolve` the referring entity; identifiers are paths already, so a drawn graph is unchanged;
a lookup by type and name, as the MCP server's `get_entity` makes, would meet two answers and
have to say whose, as it already does for a name under two types; an editor would offer an
owner's own names only. It makes invalid instances valid and no valid one invalid, changes no
declared shape, and is a minor.

**Set against each other.** For the owner's answer: it is R5 read for names, the way a
person thinks of a phase, and a growing company will want a Review phase in more than one
process; experiences make it sharper, since two people's periods at one client may well carry
one title. Against it: R2's warning is about exactly this kind of resolution, even though an
owner is declared and not guessed; a name stops being enough to find an entity, which every
consumer that looks one up by type and name then has to handle; and the settled decision had a
cheap remedy, naming a phase for what it does where it does it. The cost of staying is one small
check. The cost of changing is the parser, its consumers and two rules.

The check in this change is right under both answers. Whether a name is unique across owners or
within one, a process that lists another process's phase, or a profile whose evidence names
another profile's experience, is wrong.

## What it asks of a release

Core's bytes change in two places, a writing rule of the profile schema that said what is not
checked and R0's account of which rules a script reads, and the package gains a check. An
instance that names only its owners' own entities does nothing. One that names another owner's
was already against its schema's prose and now fails by name. By the release contract that is a
rule corrected and prose fixed, a patch, for core and the package together so that the two
numbers keep agreeing. The owner said so, and the change carries its own preparation: core's
manifest, the package and the workflow's ref all read the patch in one commit, because nothing
holds the three to each other and a tag cut with one of them behind ships a checker that refuses
the instances that ask for it.
