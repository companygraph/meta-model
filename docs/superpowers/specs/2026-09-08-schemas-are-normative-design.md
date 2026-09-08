# The schemas are normative — design

> `core/` declares a type system and nothing checks an instance against it. `verify/check.mjs`
> gains three assertions comparing `example/` to `core/`, and the two mismatches they find are
> fixed: a table row draws an edge for every reference it names, and a field that becomes an
> edge is declared as one.

Status: proposed. Decided on 2026-09-08 against this repository at `main`, and against the
published `example.json` and `model.json` at `7f58f5e5`. Every number below was counted.

---

## 1. What is true today, measured

`lib/instance.mjs` opens by saying it: **`No schema is consulted.`** The parser reads a fixed
shape — frontmatter, the H1, the tagline, `##` sections, a table by its header row — and infers
edges by resolution. A scalar becomes an edge when it happens to match some entity's H1; in a
table, "the first resolving cell of a row becomes the edge". Both rules are deliberate and
commented. Neither reads what a schema declares.

`verify/check.mjs` says the same from the other side: it "never reads a schema as truth about
somebody's instance", and "does not validate `example/` against the schemas: no file is checked
for the sections its schema requires". It does already read `ref → <type>` to check that
references resolve, so a schema is partly load-bearing already — for one of the seven types in
the closed vocabulary.

So the declarations and the graph agree only where the two rules happen to coincide. Compared
field by field against the published pair, they disagree in three places:

| The schema declares | The instance carries | Why |
|---|---|---|
| `organization` is `string` | an edge to `identity`, drawn on the example page | the value matched an H1 |
| `Level` is `ref → proficiency-level`, required | **no edge**; the id sits in the `Skills.Skill` edge's `attrs` | `Skill` resolved first |
| `rank` is `number` | `"20"` | frontmatter is text and nothing coerces |

Two further facts decide what to do about them.

**A type-blind coercion is not available.** Counted across both published instances, the
frontmatter scalars written as bare digits are `rank` four times and `source-id` twice in the
example, and `rank` four times and **`start` and `end` once each** in `robertblust/mental-model`.
A rule reading "all digits become a number" would turn a year-only date into an integer.

**One edge per resolving reference cell is not a small change.** The tables that would gain an
edge hold 5 rows in `example/` and 70 in `robertblust/mental-model`, so the fix adds 5 and 70
edges. Seventy new profile-to-level lines appear in a drawing that is live today.

## 2. What was decided

**The schemas are normative, and the enforcement is a check rather than a parser.** `core/` is
the standard an instance is held to; `verify/check.mjs` is where it is held. `lib/instance.mjs`
still consults no schema, so no consumer's parse changes and no prose becomes truth about
somebody else's instance — which is what §5 of `2026-08-23-companygraph-design.md` rejected, and
the rejection stands. What that spec anticipated was "a validator built against the tables
later"; this is that, scoped to the repository that owns both halves.

**Three assertions**, all readable from tables the schemas already carry:

A field or column declared `ref → <type>` or `array of ref → <type>` must produce an edge from
every page that carries it. A field or column declared anything else must produce none. And a
field declared `number` must be written as digits.

**The third is about written form, not about a JSON type.** The model is Markdown, where every
value is text; the parser is a serializer and a JSON string is its honest rendering. `number`
says what may be written in the file, and `rank: 20` satisfies it. The alternative was measured
and rejected above: coercing by shape breaks a year-only date. So the third mismatch in section 1
is not a defect — the assertion is what the declaration always meant, and stating it settles a
question the vocabulary left open.

**A table row draws an edge for every reference it names.** `lib/instance.mjs`'s rule that only
the first resolving cell becomes an edge is what leaves `Level` declared and undrawn. A required
`ref → proficiency-level` that produces no edge means nothing walking the graph can reach a level
from a profile; it is reachable only by reading a string out of another edge's `attrs`. The rule
becomes one edge per resolving cell, with the remaining cells still carried as that edge's
`attrs`, so nothing is lost and the declared reference is drawn.

What that rule was protecting survives. It exists so a misspelled cell beside a correct one is
not an R4 error, and it still is not: a row errors only when nothing in it resolves.

**`organization` is declared as what it is.** It becomes an edge when it names the company and
stays a fact when it names a client, which is the parser's documented scalar rule and is what the
example page draws. The schema says `string`, so the check would fail on an edge that is correct.
The closed vocabulary gains one form to say it:

    ref? → <type>    a name that becomes a reference when it resolves, and stays a string
                     when it does not

The `?` is not about whether the field may be absent — `Required` already says that, and the two
are different questions. `Required: No` says the field may be missing; `ref?` says a value that
is present need not resolve. `organization` is both: it may be absent, and when present it
usually names a client rather than an entity.

`organization` becomes `ref? → identity`, `Required: No`. The check reads `ref?` as permitting an edge rather
than requiring one, and asserts that any edge it does produce lands on the declared type.

This is the vocabulary's first addition, and the tooling spec's release table calls a change to
the closed vocabulary a MAJOR that moves `shape` with it. **The release is a minor, 0.15.0, and
`shape` moves to 2 anyway.** The two halves of that rule are separated here on purpose, once,
for reasons that will not generalize.

The version tier answers one question — what must an instance do about it? A MAJOR's answer is
"be read by a newer tooling", and `companygraph/tooling` does not exist; nothing reads
`manifest.json` at all. Both instances consume this repository through `parseInstance`, which
never opens the manifest. So the honest answer today is that an instance must do nothing about
the vocabulary, and a MAJOR would be a number with no consequence behind it — in a repository
that reserves `1.0.0` for a different milestone and so has no obvious pre-1.0 number for one.

`shape` is not that kind of number. It states which vocabulary a core uses, and the vocabulary
changed. Left at 1, the first tooling built against `supportedShapes: [1]` would accept a core
carrying a form it cannot read — a silent misread, which the tooling design forbids in the same
breath as R4. So it moves, and the coupling in that table is what gives way.

The addition earns its place because the behaviour already exists in the parser and on the page,
and only the declaration was missing.

## 3. What each change touches

```
core/CONVENTIONS.md          the ref? form, in the closed vocabulary; R16
core/manifest.json           version 0.15.0, shape 2
package.json                 version 0.15.0, which check.mjs holds against the tag
core/experience-schema.md    organization becomes ref? → identity
lib/instance.mjs             one edge per resolving cell in a table row
verify/check.mjs             the three assertions
example/                     unchanged — no file is edited
```

`R16` states the rule the three assertions enforce, in the numbering the conventions already use,
so a citation in `check.mjs` has something to cite. `lib/instance.mjs` cites its rules by number
and its own repository fails if it cites one `CONVENTIONS.md` does not define.

**The check reads the schema files, not the parsed graph.** That matters for one thing: a column
table is bound to its section by a caption line, which `CONVENTIONS.md` states is "the caption,
not the position". The Markdown carries those captions and the parser drops them, so
`model.json` cannot express which columns belong to which section while `core/*-schema.md` can.
`check.mjs` already reads files, so it has what it needs; nothing here changes the parser's
output in that respect, and the gap is recorded in section 5.

## 4. What this costs the two instances

`lib/instance.mjs` is pinned by tag in both sites, so neither moves until it is re-pinned. When
they are:

`companygraph.io`'s `example.json` gains 5 edges and its `/example/` drawing gains 5 lines.
`robertblust/mental-model` gains 70, and `blust.ch`'s `/model/` drawing gains 70 profile-to-level
lines. Both sites' stage cards re-render, because a card's recipe hashes the artifact the page
names.

That is the change's real price and it is visible rather than incidental: a drawing that did not
show how a skill was rated now shows it. It is also the reason the fix is in this spec rather
than left as a note — an undrawn required reference is a modelling loss, and the drawing is where
the model is read.

## 5. What this does not change

`lib/instance.mjs` consulting a schema: it still does not, and the parse is schema-blind exactly
as before, apart from the table rule above. The example's content: no file under `example/` is
edited, because both mismatches are fixed in the schema or the parser rather than in the data.
`parseSchemas`, the fences, the packs, the site pages.

Three things are deliberately left. The parser **drops a column table's caption**, so the
published `model.json` cannot say which columns belong to which section even though the Markdown
does; that is a loss for a consumer of the artifact, and its own work. The `education` and
`project` kinds are defined and unused, which the model permits and an example exercising every
kind would be less honest for. And `rank` reaching a consumer as text remains true — a consumer
sorting the ladder coerces first — which is a question about what the parser emits rather than
about whether the instance conforms.

## 6. How it is verified

The three assertions are run against `example/` and must pass, which is the point: the check
lands green because the two mismatches it would otherwise report are fixed in the same change.

Each is then proved by breaking what it holds: a schema retyped from `ref → skill` to `string`
must fail the first assertion, a field retyped to `ref → source` that names nothing must fail the
second, and a `rank` written as a word must fail the third. Each break must fail its own
assertion and no other.

The parser's new table rule is proved on a fixture: a row naming two references produces two
edges, each carrying the row's other cells as `attrs`; a row naming one produces one; a row
naming none is still the R4 error it was.

And the edge counts above are re-measured after the change rather than predicted: 5 more in
`example/`, and 70 more when `robertblust/mental-model` is parsed at the same commit.
