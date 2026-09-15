# Typed resolution — design

> A reference is a type and a name, and R2 has said so since the company-of-one case forced
> it. The instance parser still resolves by name alone: it reads no schema, takes any value
> that happens to be a canonical name for a reference, and refuses when two types carry one
> name. The parser catches up to the rule, and three workarounds that existed only because it
> had not go away.

Status: proposed. Decided on 2026-09-15 against this repository at `dd6d2fd` and against
`robertblust/mental-model` at `3e9270c`. The parser, the instance checks and their tests were
read on that day; every consumer named in §6 was found by searching the family for the
parser's import, not recalled.

---

## 1. The gap

R2 says a name identifies an entity within its type. Every schema declares its references as
`ref → <type>`, so a reference carries a type as well as a name, and the pair is what resolves.
R16 says a field typed anything but a reference draws no edge and its value resolves to nothing.
The instance checks in `lib/checks.mjs` hold an instance to exactly that: they read each
schema, find the declared type of every field and column, and fail a value that names an entity
of some other type.

The parser in `lib/instance.mjs` does neither. Its header says "No schema is consulted", and
the resolution block below it builds one index of every canonical name across every type. A
scalar becomes an edge when it happens to match an H1 anywhere; a table row draws its edge from
the first cell that matches one; a name carried by two types is an error wherever it is used,
because the parser has no type to choose with. **The rules describe a typed lookup and the
parser performs an untyped one, and every place the two disagree has grown a rule or a check to
hide the difference.**

Three of those exist today, and each is a constraint on the instance that the vocabulary never
asked for.

The refusal. An instance that is a company of one has an identity and a profile called the same
thing. An experience whose `organization` names the company is declared `ref? → identity`, so
its target is not in doubt — and the parser throws, because the name is carried by two types.
The reference instance avoids this only by luck of its current content.

The accidental edge. A profile's `location` is typed `string`. Write `location: Bergen` in an
instance that also has a skill or a source called Bergen, and the parser draws an edge from the
profile to it. The R16 check forbids the value to stop that from happening: its message says to
declare the field `ref?` or "write something that names nothing". That is the naming workaround
R2 exists to make unnecessary, imposed on a field that was never a reference.

The column order. A row's edge comes from its first resolving cell, so a qualifier column that
happens to stand before the reference column takes the edge from it. R9 therefore requires the
reference column to come first, and the R16 check enforces the order on every schema. The rule
is real only because the parser cannot read which column is the reference.

## 2. What resolves

The parser reads the schemas and resolves by the pair R2 names. What follows is the whole of
the lookup, and nothing outside it decides whether a value is an edge.

A page's type is what it is today: the singular of its folder by R7, or the file's own name for
a singular type by R6. The schema for that type says what each frontmatter field and each
column of each captioned body table is declared as. A page whose type has no schema is an error
— R13 says a folder under `model/` is named by a schema, so a page without one is not content.

A field or column declared `ref → <type>` resolves its value against the entities of `<type>`
and of no other. A value that names one draws an edge to it. A value that names none is the R4
error it has always been, and the message says which type was searched, so a name that exists
under a different type reads as what it is. `array of ref → <type>` does the same for every
entry.

A field or column declared `ref? → <type>` resolves on the same terms and, when its value names
nothing of `<type>`, stays a fact. It never resolves against another type: an `organization`
that names a profile draws no edge to the profile, because the schema said identity.

A column declared `qualifier → <type>` must resolve, exactly as a reference must, and draws no
edge. Its resolved id travels in the attributes of the edge its row drew, which is what R16
says today and what the parser already does for a cell that resolves after the first one.

Everything else — `string`, `number`, `date`, `enum`, `array`, and a field the schema does not
declare — draws no edge and its value stays what was written. An undeclared field is R15's
finding and the checker's business; the parser is not the validator and keeps the fact.

A body table draws its edges from the one column its schema declares as a reference, wherever
that column stands. A table whose schema declares no reference draws nothing and is data. A
table whose schema declares a `ref` column and whose row does not resolve on it is the R4 error
it always was; a `ref?` column that does not resolve leaves its row as data. The parser no
longer needs to guess whether a table is one of references by trying every cell; the schema
says.

Two entities of one type sharing a name is still an R2 error at parse time. Two entities of
different types sharing a name is what R2 permits and what this design makes work.

## 3. The input

`parseInstance(files, { sub, schemas })` takes the schema files as a second map, in the shape
`parseSchemas` already reads: path to text, one `<type>-schema.md` per type. The parser builds
its declaration table from the same rows `parseSchemas` turns into type-level edges — a
Frontmatter row whose Type cell matches `ref`, `ref?` or `qualifier`, and a captioned column
table's row that does the same — so there is one reader of a schema's tables in this file, not
two.

An instance parsed without its schemas is an error, not a fallback to the old behavior. Name-only
resolution is the mode this design retires, and R2 already says why a fallback is wrong: a
fallback chain is what makes a reference unresolvable without running code. A caller that has
the model has the vendored core beside it, because R13 and the manifest put it there; every
consumer in §6 already walks or checks out that folder.

An instance that declares packs passes their schema files in the same map. The manifest names
the packs, the caller reads them, and the parser sees one vocabulary. Nothing here reads the
manifest; the parser stays pure, as its tests require.

## 4. What is retired, and what stays

Retired from the parser: the cross-type name index, the "carried by more than one type" error,
and the first-resolving-cell rule for table rows.

Retired from the instance checks, because the condition they guarded cannot arise:

- the R16 assertion that a non-reference field must not carry a canonical name, since a
  `string` now draws nothing whatever it says;
- the R16 assertion that a schema's reference column stands first, since the parser draws from
  the declared column wherever it is.

Kept in the checks, because they are about what a schema means rather than how a parser reads
it:

- a column table declares at most one drawing reference — a row is one fact and draws one edge;
- a table declaring qualifiers and no reference is a contradiction — a qualifier qualifies the
  edge its row drew, and this table draws none;
- a declared reference must land on its declared type, and a required one must resolve.

Kept in the parser: the same-type name clash under R2, the unresolvable reference under R4, and
the qualifier resolving into the edge's attributes under R16.

## 5. The prose

Three passages in `core/CONVENTIONS.md` describe the untyped parser, and each is rewritten to
say what is now true rather than deleted, because each carries a reason the reader still
needs.

R2's fourth paragraph says what a tool that resolves by name alone must do. It becomes: a tool
resolves a reference by the type its schema declares and the name written, and a name that
exists under another type is unresolvable, not ambiguous. The paragraph keeps its point — that
resolving to the first match, or the nearest folder, is the failure the rule makes impossible —
and drops the refusal, which no longer happens.

R9's paragraph beginning "So a column table declares at most one reference, and it is the first
column" keeps the first half and loses the second. A table declares at most one reference
because a row draws one edge; where that column stands is the schema author's choice, and the
reason given today for putting it first — that a parser taking the first cell to resolve would
otherwise take a qualifier — is a reason about the parser that was, and goes.

R16 keeps every sentence. "A field or column typed `ref → <type>` draws an edge from every page
that carries it" and "typed anything else, a field draws no edge and its value resolves to
nothing" were written for the typed lookup; the parser now does what they say. The comment
block in `lib/checks.mjs` that explains why a file-level check can stand in for an edge — "a
scalar draws an edge exactly when it is the canonical name of some entity" — is rewritten to
the typed equivalence: a declared reference draws an edge exactly when its value is the H1 of
an entity of the declared type.

The parser's own header loses "No schema is consulted" and says which schema it consults and
why: the one for the page's type, because R16 makes the declared type the only thing that
decides what a field is.

## 6. Consumers and release

The parser is imported in two places, found by search: the `example` target of
`companygraph.github.io/build/build.mjs`, and `robertblust.github.io/build/model.mjs`. The
guestgraph organization does not import it, and neither does this repository's checker:
`lib/checks.mjs` reads the schemas itself and imports no parser, which is why it already
resolves by the pair and why its two assertions retire rather than move.

Each site already has the schemas at hand. The companygraph site's example target reads the
meta-model checkout, where `core/` sits beside `example/model/`. The robertblust site reads
the mental-model checkout, where `meta/core/` sits beside `model/`; its `readInstance` is
called a second time for that folder, and `parseInstance` gets both maps.

This is at least a minor release by the family's rule, and it is a breaking one for the two
sites: the call changes and an instance without schemas fails. Meta-model 0.22.0, with notes
that say so and show the new call. Then, in this order, because each step is checked by the
one before it:

1. `robertblust/mental-model` takes 0.22.0 in its three places — re-vendored `meta/core/` with
   fresh hashes, `tooling` in `.companygraph/manifest.json`, and the `instance-check.yml@`
   pin in its workflow — and the instance check goes green on the typed lookup.
2. `robertblust.github.io` re-pins the parser, passes the core, and its `model:check` shows the
   same entities and edges as before, because the reference instance carries no case the
   untyped parser resolved wrongly. A difference in either count is a finding, not a diff to
   accept.
3. `companygraph.github.io` re-pins and passes the core, with the same test on its example
   target.

Each re-pin verifies the lockfile against the tag with `npm update` and a read of the resolved
sha, not a report; the lockfile that names the new tag and carries the old sha is the hazard a
green check does not catch.

## 7. Tests

`verify/instance.test.mjs` feeds the parser fixture maps, and every fixture grows a schema map
beside it — the minimum R9 shape, a Frontmatter table and a Sections table, declaring what the
fixture's fields are. The cases that change or arrive:

- The company-of-one case flips. Today it asserts the refusal; it now asserts that
  `organization: Robert Blust` on an experience draws one edge to the identity and none to the
  profile.
- A `string` field carrying a canonical name draws nothing. `location: Bergen` beside a skill
  called Bergen leaves the profile with no edge to it and the value intact.
- A row whose qualifier column stands before its reference column draws its edge from the
  reference column, and the qualifier's id lands in the edge's attributes.
- A `ref? → identity` whose value names a profile and no identity stays a fact.
- A `ref → skill` whose value names a source and no skill fails under R4, and the message names
  the type searched.
- A table whose schema declares no reference draws no edges even when a cell happens to match an
  H1.
- A call without schemas fails, and a page whose type has no schema fails.
- The same-type clash still fails under R2, unchanged.

`verify/instance-checks.test.mjs` drops the fixtures for the two retired assertions and keeps
the rest. `verify/rule-citations.test.mjs` needs no change, because every rule cited in the
rewritten comments already exists.

## 8. Not done here

Names stay unique per type and not per instance; nothing here moves toward a name that is
unique across the whole model, and R2's reason for refusing that stands. The checks that already
resolve by declared type do not change how they resolve, only what they no longer need to
assert. `kpi` and every other deferred type stay deferred. The manifest's shape does not
change: the parser takes what the caller read, and the caller reads what the manifest names.
