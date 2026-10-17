# An entity keeps its id

The id the parser and the MCP server hand out today is the entity's folder and the slug of its H1, `features/checks-while-a-file-is-edited`, so it changes the day the entity is renamed and differs in every language the entity is written in. Inside an instance nothing is lost, because R3 keeps references by name and R4 fails the ones a rename leaves behind. Outside, every link to the old id breaks: a task in a tracker that names the feature it delivers, a commit that names the decision it carries out, a node in another graph loaded from the page. An adopter said so in meta-model #194, after the chat answered their question with "The model does not say." Every entity gains an `id` in its frontmatter that is set once and never changed or reused, in a format the instance declares in a new singleton, and every tool returns it.

Status: decided by the owner on September 30, 2026: the field, the singleton and its two formats, no `formerly`, no sequence, the backfill from the first commit, what the tools accept and return, and the split between page addresses and the JSON-LD `@id`.

## Where this comes from

meta-model #194 asks for a link that survives a rename, and for one entity with names in several languages. Both instances the owner keeps are written in English and German, so an entity already has two names in each of them and no id either name could share. The issue proposed a field every schema declares, which the check holds unique and unchanged, and a `formerly` list so an old name could still resolve. The field is taken as proposed; `formerly` is not (see What was left out).

## The rule

`core/CONVENTIONS.md` gains R18, after R17:

> **R18 — An entity keeps its id.** Every page carries an `id` in its frontmatter, in the format the instance's identifier file declares. It is unique within the instance, it is set when the entity is made and never changed once it is on the default branch, and the id of a deleted entity is never used again. An id means nothing: it carries no name, type, language or owner, because each of those can change and the id cannot.

An id works like the key of a database row. A deleted row is gone, a consumer that holds its key finds nothing, and the key is never handed to another row.

Uniqueness is within the instance. What is unique everywhere is the instance's address together with the id, which is how the JSON-LD `@id` below is built.

## The field

Every schema in `core/` gains one row in `## Frontmatter`, first:

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |

It is typed `string` and draws no edge. It is not `source-id`, which is the identifier a page has in the system its facts come from and belongs to that system.

## The singleton

`core/identifier-schema.md` declares a type with one file, `model/identifier.md`, which every instance carries:

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered |
| `format` | Yes | enum | `uuidv7` or `pattern`. `uuidv7` is a UUID version 7 (RFC 9562), written in lowercase; `pattern` is whatever the `pattern` field matches. |
| `pattern` | No | string | A regular expression that every id matches in full. Required when `format` is `pattern`, and absent otherwise. |

Its sections are the H1, the name the instance gives its ids, a `>` statement saying what an id is for and who holds one, and an optional `## References` table. Its writing rules: a `pattern` matches nothing taken from the entity, a `pattern` is anchored at both ends, and the statement names who relies on the id. The rules an id obeys stay in R18 and are not restated on the page.

The file is required rather than implied by a default, so every instance says in one place what its ids are. `uuidv7` is the format core proposes and the one the tooling generates.

UUID version 7 was chosen because nobody hands it out: every worktree and every agent can make an entity without knowing about the others. It is a published standard that a consumer's database stores natively, and it sorts by the moment it was made. It is hard to read, which costs little, since a person names an entity by its H1 and a tool copies the id.

## What the check holds

The instance check fails a page with no `id`, an `id` that does not match the declared format, two pages with the same `id`, and an `id` that differs from the one the same entity carries on the default branch. An instance without `model/identifier.md`, or with a `pattern` format and no pattern, fails as any required file or field does.

Two branches that make an entity each cannot collide under `uuidv7`. The duplicate that does happen is a page copied to start another, which carries the old id with it, and the uniqueness check is what catches it. Under a `pattern` format two branches can take the same id; the check fails the second when it is brought up to date with the default branch, and the id is changed there, before it is on the default branch.

## Making and backfilling ids

The CLI, the Obsidian plugin and the agent skills an instance ships write a fresh UUID version 7 into a page they make, where the instance declares `uuidv7`. Under a `pattern` format the instance makes its own ids, and the tooling only checks them.

An existing entity gets an id whose time is the author time of its file's first commit, followed across renames with `git log --follow`, so the order of the ids is the order the entities came into the model. The backfill is a CLI command an instance runs once after it takes the release; its commit is the Implementer's.

## What the tools accept and return

The parser returns the stable id as the entity's `id`. The MCP server and the plugin accept either the id or the current path wherever they take an entity, permanently, and always return the id. The path resolves against current names only: after a rename the old path is not found, as a deleted entity is not.

## The sites

A page address stays the slug. People read it and share it, and it changes on a rename as it does today.

The JSON-LD `@id` becomes `<instance address>/id/<id>`, which redirects to the entity's current page. The English and the German page of one entity carry the same `@id`, because they describe one entity. A crawler that holds an `@id` keeps it through a rename, which is the case the issue describes.

## What was left out

A `formerly` list of old names. An old name that still resolves stops R4 from catching a stale reference inside the model, and a deleted entity would never be gone.

A sequence per type, `F-0042`, from a counter in the instance or from the highest number in use. A counter is one file every new entity edits, and two branches take the same number. A number worked out from the highest one gives a deleted entity's id to the next one.

A prefix naming the type. The type becomes part of an id that cannot change, and the id is wrong the day an entity moves from one type to another.

One format with no way to declare another. An instance with an identifier of its own, an employee number or a record key, would have to keep a second id beside ours.

The id in a page address. An address is for people, and one they cannot read helps nobody.

## Out of scope

A lookup across instances. An id is unique within its instance, and the instance's address makes it unique beyond that; resolving an id without knowing its instance is for a consumer to build.

## What it costs

Every schema changes and every page needs a field an instance has to add, so the release is breaking in the terms of `WORKING.md`: taking it asks more than a re-pin. Each instance takes it with the re-pin, adds `model/identifier.md` and runs the backfill. The parser, the checks, the MCP server, the Obsidian plugin, the agent skills and each site's JSON-LD change with it.
