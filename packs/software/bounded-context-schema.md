---
id: 01a0f94d-f9e9-70c4-a498-9e19505fd58d
---

# Bounded Context Schema

> Required structure for bounded context files.

## File Location

`model/bounded-contexts/<bounded-context>/<bounded-context>.md`

A bounded context owns the terms of its language, its aggregates and its events, so it is a folder and they nest inside it (R5, R6).

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `classification` | Yes | enum | `core`, `supporting` or `generic`. How much it matters to build this well: where the company competes, what it needs and builds for itself, or what it could buy (DDD Crew, Bounded Context Canvas). |
| `realizes` | No | array of ref → domain | The domains this context serves, the H1s of files in `domains/`; a context may serve several and a domain be served by several (Vernon) |
| `decisions` | No | array of ref → decision | The decisions that shaped this context, the H1s of files in `decisions/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Bounded Context]` | Yes | The canonical name of the context |
| `> [Purpose]` | Yes | What the context is responsible for, and one thing it leaves to another context |
| `## Responsibilities` | Yes | Bulleted. One responsibility each, in business words |
| `## Relationships` | No | Table. One row per context this one depends on, written on the downstream side; its columns are declared below. |
| `## Consumes` | No | Table. One row per domain event this context takes from another; its columns are declared below. |
| `## References` | No | Table. What a reader can open to learn more about the context; its columns are declared below. |

`## Relationships` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Context` | Yes | ref → bounded-context | The upstream context this one depends on, by its canonical name |
| `Pattern` | Yes | enum | `partnership`, `shared kernel`, `customer/supplier`, `conformist`, `anticorruption layer`, `open host service`, `published language`, `separate ways` or `big ball of mud`. How the two contexts relate (DDD Crew, Context Mapping). |

`## Consumes` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Type` | Yes | string | The type of what is consumed, as its schema is named: `domain-event` |
| `Entity` | Yes | ref → by Type in Context | What is consumed, by its canonical name |
| `Context` | Yes | string | The context that owns it, by its canonical name |
| `Reaction` | No | string | What this context does in response, naming the handled command in words; a command is a row on its aggregate, and nothing can reference it (Event Modeling, policy) |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a context canvas, a service's documentation |
| `URL` | Yes | string | Where it is |

## Purpose

A bounded context answers "within which boundary does one model, and one meaning of each word, hold?" It is Evans's bounded context and the solution side of core's domain: a domain says what area of the company something belongs to, and a context says where one model of it is built. It owns the terms of its language, so two contexts may mean different things by one word, which is the problem domain-driven design exists to solve. Its strategic classification departs from Evans, who puts it on the subdomain; it sits here, as the DDD Crew's canvas puts it, so that core's domain stays untouched. A relationship is written on the downstream context, the side that knows it depends, and a symmetric pattern, a partnership or a shared kernel, is written once, on either side.

## Writing rules

- The H1 is the business's name, not a service's or a team's: "Billing", not "billing-service".
- The purpose names one thing the context leaves to another, so its boundary can be read from its first line.
- `## Consumes` names each event the context consumes, and `## Relationships` names the context it comes from.
- `Reaction` says what happens here, not in the context that emitted the event.
- `source`, on a page drawn from code, names that code, the repository a sync reads, and the module or package is its `source-id`; a page written here that code then follows names the code in `## References` as `Implementation`.
