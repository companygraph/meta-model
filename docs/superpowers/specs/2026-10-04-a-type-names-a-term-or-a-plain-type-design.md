# A type names a term or a plain type

The software pack's `## Payload` on a domain event and `## Attributes` on a concept design each have a `Type` column that holds either a plain type, `string` or `date`, or the name of a concept design in the same context. Because a column can be typed only one way, it is typed `string`. A term written there is never resolved as a reference: no edge is drawn, the plugin offers nothing, and a misspelt term passes as a plain type. This design splits the column into a reference and a closed list of plain types, with exactly one of them filled on each row.

Status: draft, written on October 4, 2026 against this repository at `54285b0` (package 0.76.0, core 0.56.0, software pack 0.56.0).

## The finding

In the companygraph instance, `Artifact` in the Payload of `Artifact built` was changed to `Artifact2`, and `check` passed. The `typeCells` check holds this column today, and it fails a cell in three cases only: an exact term of the wrong kind, a near miss such as `Artifacts`, and a term of another context. Any other word is taken for a plain type, so `Artifact2` passes, and so does `strng` in an Attributes row.

To find every column like it, each name-carrying column in core and the pack was broken in a copy of the companygraph instance and checked at v0.76.0, after a near miss on Payload had shown that the check can fail:

| Broken | Result |
| --- | --- |
| Payload `Type`: `Artifacts`, a near miss, as the positive control | fails |
| `## Applies to` `Type` and `Owner`, and a blank `Owner` on a phase | fails |
| `## Bears on` `Type` | fails |
| `## Rests on` `Owner` on an unowned type | fails |
| `## Consumes` `Context` | fails |
| `## Uses` `Context`, `Type`, and an existing context that does not own the entity | fails |
| `## Relations` `Concept`, an ordinary reference column | fails |
| `Cardinality` off its enum list | fails |
| Payload `Type`: `Artifact2` | passes |
| Attributes `Type`: `strng` | passes |

The two `Type` columns are the only holes. The remaining string fields that look like names are free text by their own descriptions: an experience's `role`, a product's `audience`, a skill's `group` and every `As` column.

## The columns

`## Payload` and `## Attributes` each take these columns, in this order, in place of the one `Type`:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Attribute` | Yes | string | The value's name, as the context's people say it (unchanged) |
| `Term` | No | ref → concept-design | A concept design of the same context, by its canonical name. In `## Attributes`, one of kind `value object`, since an entity is a relation. |
| `Type` | No | enum | `string`, `number`, `boolean`, `date`, `timestamp`, `duration`, `version`, `commit hash`, `path`, `id`, `URL` or `file`. A plain type, where the value is not a term: a `date` is a day, a `timestamp` a moment and a `duration` a length of time. |
| `Many` | No | enum | `yes`. The value is a list of what `Term` or `Type` names; blank for one. |
| `Description` | No | string | What the value says, and its unit where it has one (unchanged) |

Exactly one of `Term` and `Type` is filled on a row. A unit is not a type: `input-equivalent tokens` becomes `number`, with "in input-equivalent tokens" in the Description. A `list of` prefix is no longer read anywhere; `Many` says it.

The schemas' Purpose and writing-rule prose that speaks of "a payload type that names a term" is reworded for the two columns, with the meaning unchanged: a payload's term may be of either kind, and an attribute's term is a value object.

## The checks

- `typeCells` is retired. `Term` is a reference column, so R4 resolves it within the page's own context, as it resolves `## Relations`' `Concept`. An unknown name and another context's term both fail there.
- A new declaration on a type's row in `TYPES`, `oneOf: { section, columns }`, fails a row of that section that fills more than one of the columns or none of them, naming the columns. Concept design and domain event each declare it with `["Term", "Type"]`.
- `refKind` gains a table form, `{ section, column, kind }`, beside its field form. Concept design declares `{ section: "Attributes", column: "Term", kind: "value object" }`, which carries over the R16 failure `typeCells` gave.
- Where a `Term` resolves to nothing but matches a term of the same context loosely, by case or by a plural, R4's failure adds the name it matches. The loose comparison moves from `typeCells` to that message.
- `Type` and `Many` are enums, held by the existing enum check.

`verify/software.test.mjs` takes a failing fixture for each of these before the code: both filled, neither filled, an unknown `Term`, a near miss, another context's term, an entity in Attributes, a `Type` off the list and a `Many` other than `yes`. Its two passing fixtures, Invoice and Invoice issued, are rewritten in the new columns. `verify/checks-owed.test.mjs` is brought along where it writes these tables.

## What follows without a change

The plugin, the MCP server and the sites read the vendored schemas. Once an instance takes the release, the plugin offers the context's terms in `Term` and the list in `Type` and `Many`. The export draws a `Payload.Term` or `Attributes.Term` edge for each term, which the MCP's relations and the `/model/` graph then show.

## Rollout

1. This spec, the plan and the build, in this repository: the two schemas, the checks and their tests, and a line in `packs/software/README.md`. A release follows, and it is the owner's.
2. The companygraph instance takes the release with `companygraph upgrade`, and its rows are migrated in the same pull request by a script that writes each cell's value into its new column: a term to `Term`, a listed plain type to `Type`, `list of X` to `X` with `Many: yes`, and a unit to `number` with the unit moved into the Description. A value it cannot place stops the script, and is brought to the owner one at a time with a proposal: the plurals `checks`, `rules`, `schemas`, `entities` and `edges`, and `` `en` or `de` ``, `map of string`, `list` and `hash`. The plugin's completion on `Term` is confirmed in the scratch vault over CDP.
3. robertblust and guestgraph hold no bounded contexts and have nothing to migrate. Each takes the release at its next re-pin.

## What it does not do

It does not add plain types to the list beyond the twelve above, nor a unit vocabulary. It does not change `## Relations`, which already draws its edges, nor the free-text fields above. It does not touch an instance's own schemas.
