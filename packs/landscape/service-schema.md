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
- `provided-by` names every system that exposes the service; a system that merely calls it is a
  `## Connects to` row on that system's page.
- `realizes` names features in the words of those features; a service nobody outside its system
  uses realizes nothing.
- The page writes names and prose in the model's language (R14), as every page does.
