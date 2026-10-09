---
id: 01a12186-4d00-7c74-84cd-5cde349d9b40
---

# System Schema

> Required structure for system files.

## File Location

`model/systems/*.md`

A system owns nothing and nothing owns it, so it is a file. What it runs on or in is its `part-of`, so a terminal moves from one node to another by editing a line and no file moves, and a device that holds no application is a page like any other.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source, an element's GUID in an architecture tool. Absent when the source has none. |
| `kind` | Yes | enum | `application`, `device`, `platform` or `network`. Software somebody uses or that serves other software; a physical thing that computes, prints, weighs or pays; what applications run on, a node, system software, a cloud service; or what connects systems (ArchiMate 3.2, chapters 9 and 10). |
| `vendor` | No | string | Who makes it. A name, not a reference: a vendor is an entity only when it processes personal data, which `processor` says. |
| `lifecycle` | No | enum | `planned`, `active`, `retiring` or `retired`. The stage the system is in, not a date (LeanIX, application lifecycle). |
| `criticality` | No | enum | `high`, `medium` or `low`. What stops when it stops. |
| `owner` | No | ref → seat | The seat accountable for what the system does for the business, the H1 of a file in `seats/` |
| `operator` | No | ref → seat | The seat that runs it, the H1 of a file in `seats/` |
| `processor` | No | ref → data-processor | The party outside the company that runs it where it handles personal data, the H1 of a file in `data-processors/`; the contract sits on that page |
| `part-of` | No | ref → system | The system this one runs on or in, the H1 of another file in `systems/`: the device a terminal is, the node an application runs on. Written on the part; the whole lists nothing. |
| `domain` | No | ref → domain | The area of the company the system belongs to where it realizes no feature, the H1 of a file in `domains/` |
| `realizes` | No | array of ref → feature | The features this system gives, each the H1 of a file in `features/` |
| `serves` | No | array of ref → process | The processes this system carries where no feature names it yet, each the H1 of a process's own file |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [System]` | Yes | The canonical name of the system, as the people who use or run it name it |
| `> [What it does]` | Yes | One-paragraph statement of what the system does and for whom |
| `## Connects to` | No | Table. One row per integration this system takes data over, written on the side that takes it; its columns are declared below. |
| `## Holds` | No | Table. One row per concept this system keeps data of; its columns are declared below. |
| `## References` | No | Table. What a reader can open to learn more about the system; its columns are declared below. |

`## Connects to` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `System` | Yes | ref → system | The system the data comes from, by its canonical name |
| `As` | No | string | The interface the connection goes through, by its own name: `Payment network – Tillpay`. Required where two rows name the same system (R16). |
| `Carries` | No | qualifier → concept | What the connection carries, by the concept's canonical name |
| `Via` | No | string | How it is carried: a protocol, a file, a message queue |

`## Holds` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Concept` | Yes | ref → concept | What the system keeps data of, by its canonical name |
| `Access` | Yes | enum | `master`, `writes` or `reads`. The one system whose copy leads, a system that writes a copy, or one that only reads (ArchiMate 3.2, access relationship). |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — an operations manual, a vendor's documentation, an architecture view |
| `URL` | Yes | string | Where it is |

## Purpose

A system answers "what does this run on, what does it carry, who owns it and what breaks when it stops?" for whoever plans a replacement, answers for an outage or asks which system masters a customer record. It is the layer below the feature: what IT buys, builds, runs and retires, whatever it is made of. It is not a product, which is what somebody uses on its own, and not a feature, which is what they do with it; a system that gives people something to do realizes a feature, and the feature says what.

## Writing rules

- The H1 names the system as staff name it, `Kassensystem`, `Filialsystem`, and never by its
  vendor or its product name alone; the vendor goes to `vendor`. An architecture tool's habit of
  writing both into one name, `Kassensystem – Tillworks Retail`, splits into the H1 and the
  field.
- The tagline says what the system does and for whom, and claims nothing about how well.
- `kind` is what the system is made of, not what it is for: a payment terminal is a `device`
  whatever it runs, and the software on it, where that is a system of its own, is an
  `application` that is `part-of` the terminal.
- `realizes` names features of the products staff and customers open, in the words of those
  features; a system that gives nobody anything to do, a network, a camera, realizes nothing and
  names its `domain` instead.
- `## Connects to` is written on the system that takes the data. An exchange both ways is two
  rows, one on each page.
- `## Holds` names concepts, not tables or files, and one system holds a concept as `master`:
  the one whose copy the others are copies of.
- The page states no cost, no license count and no version. Those move, and a contract register
  or a configuration database holds them.
