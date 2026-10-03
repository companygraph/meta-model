---
id: 01a0f94d-fa9a-7907-ae3d-621f34d6e909
---

# Domain Event Schema

> Required structure for domain event files.

**Owner:** bounded-context

## File Location

`model/bounded-contexts/<bounded-context>/domain-events/*.md`

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `emitted-by` | Yes | ref → aggregate | The aggregate whose change the event records, in the same context |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Domain Event]` | Yes | What happened, in the past tense: "Invoice issued" |
| `> [What happened]` | Yes | The event in business words, in one sentence |
| `## Payload` | No | Table. What the event carries; its columns are declared below. |
| `## References` | No | Table. What a reader can open to learn more about the event; its columns are declared below. |

`## Payload` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Attribute` | Yes | string | The value's name, as the context's people say it |
| `Type` | Yes | string | A plain type such as `duration` or `timestamp`, or the name of a concept design in the same context |
| `Description` | No | string | What the value says |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a message schema, an event catalog |
| `URL` | Yes | string | Where it is |

## Purpose

A domain event answers "what happened that other parts of the domain care about?" It is Evans's and Vernon's domain event, named in the past tense. It is a type and not a row of its aggregate because other contexts consume it and feature designs name it, and a row cannot be named from outside its page. A payload type that names a term names one of the event's own context, and a consumer translates it into its own language.

## Writing rules

- The H1 is in the past tense and says what happened, not what should happen next.
- `source`, on a page drawn from code, names that code, the repository a sync reads, and the module or package is its `source-id`; a page written here that code then follows names the code in `## References` as `Implementation`.
