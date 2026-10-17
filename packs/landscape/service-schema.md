---
id: 01a1226b-c5d5-7dcd-8295-40de820876db
---

# Service Schema

> Required structure for service files.

## File Location

`model/services/*.md`

A service is owned by nothing, and several systems may provide one, so the edge is written here: a connection row on a system can then be held to the services that system provides.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source, an element's GUID in an architecture tool. Absent when the source has none. |
| `provided-by` | Yes | array of ref → system | The systems that expose this service, each the H1 of a file in `systems/`; several where several realize one |
| `realizes` | No | array of ref → feature | The features this service gives people, through the products that carry them, each the H1 of a file in `features/` |
| `serves` | No | array of ref → process | The processes this service carries, each the H1 of a process's own file |
| `domain` | No | ref → domain | The area of the company the service belongs to, the H1 of a file in `domains/`, written beside `realizes` where the features alone do not place it |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Service]` | Yes | The canonical name of the service, as its consumers call it |
| `> [What it exposes]` | Yes | One-paragraph statement of what the service exposes and to whom |
| `## References` | No | Table. What a reader can open to learn more about the service; its columns are declared below. |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — an interface description, a vendor's documentation, an architecture view |
| `URL` | Yes | string | Where it is |

## Purpose

A service answers "what does this system offer the others, and who depends on it?", the question an outage or a replacement asks first. ArchiMate 4's application and technology services are both specializations of the Common Domain's Service, so it is one type and has no kind. A system's own `realizes` and `serves` stay for an instance that models no services.

## Writing rules

- The H1 names the service as its consumers call it, `Invoice feed`, `Price lookup`, never by the
  system behind it.
- The tagline says what is exposed and to whom, in the consumer's words.
- `provided-by` names the systems that expose the service, never one that only calls it.
- `realizes` names features in the words of those features; a service nobody outside its system
  uses realizes nothing.
- `domain` groups what a context offers outward: an API, an SDK client and a set of MCP tools
  that consumers call apart are three services provided by the same system, each named as its
  consumers call it, and the domain is what groups them, never one service that bundles them. A
  service names no bounded context, since a pack names only core's types and its own (R20); a
  context realizes domains, so a service in a domain stands beside the context of that domain.
- The page writes names and prose in the model's language (R14), as every page does.
