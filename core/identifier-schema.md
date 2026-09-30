# Identifier Schema

> Required structure for the identifier file: what an entity's id looks like in this instance.

## File Location

`model/identifier.md`

An instance has one way of writing ids, so the type is a file directly in the container rather than a folder (R6, R13), named for the type rather than for the slug of its H1 (R12), which leaves the H1 free to be a name.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `model/sources/` |
| `format` | Yes | enum | `uuidv7` or `pattern`. `uuidv7` is a UUID version 7 (RFC 9562), written in lowercase; `pattern` is whatever the `pattern` field matches. |
| `pattern` | No | string | A regular expression every id matches in full, from `^` to `$`. Written when `format` is `pattern`, and absent otherwise. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Name]` | Yes | What the instance calls its ids |
| `> [Statement]` | Yes | One paragraph on what an id here is for, and who holds on to one |
| `## References` | No | Table. The specification the format follows; its columns are declared below. |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a specification, a registry |
| `URL` | Yes | string | Where it is |

## Purpose

The identifier file says what shape the `id` on every page takes, so that a person, an agent or an outside system holding an id knows what it is, and so that the checks can hold every page to that shape. The rules an id obeys are the same in every instance and are R18's, not this page's: it is set once, never changed and never reused.

## Writing rules

- A `pattern` matches nothing taken from the entity: not its name, its type, its language or its owner, since each of those can change and the id cannot.
- The statement names who relies on the id: a tracker, a graph, a link somebody wrote down.
- An instance that declares `pattern` says in its own agent file how a new id is made, since the tooling makes only UUID version 7.
- Names and prose are American English (R14).
