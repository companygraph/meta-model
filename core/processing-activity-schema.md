---
id: 01a10522-0ee2-785a-915f-8e9b1cd7f5c8
---

# Processing Activity Schema

> Required structure for processing activity files.

## File Location

`model/processing-activities/*.md`

Nothing owns a processing activity and a processing activity owns nothing: it names the processors it uses and the surfaces where a person meets it, and belongs to none of them.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |
| `legal-basis` | Yes | enum | `consent`, `contract`, `legal-obligation`, `vital-interests`, `public-task` or `legitimate-interests`. The ground the processing rests on (GDPR Art. 6(1)). |
| `retention` | No | string | How long the company keeps the data, or the criterion that decides it |
| `surfaces` | No | array of ref → surface | Where a person whose data it is meets the activity, each the H1 of a file in `surfaces/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Processing activity]` | Yes | The activity's name. Everything references the activity by this exact string. |
| `> [Purpose]` | Yes | The purpose of the processing, in one sentence |
| `## Data subjects` | Yes | Bulleted. Whose personal data it is, one category of people per item |
| `## Personal data` | Yes | Bulleted. Which personal data it processes, one category per item |
| `## Processors` | No | Table. The processors the data goes to and what each receives; its columns are declared below. An activity the company does in-house has no rows. |
| `## References` | No | Table. The record of processing it belongs to, an impact assessment, the privacy page that discloses it; its columns are declared below. |

`## Processors` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Processor` | Yes | ref → data-processor | The processor the data goes to, the H1 of a file in `data-processors/` |
| `Receives` | Yes | string | What that processor gets, which may be less than the activity holds |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document, a record of processing, an impact assessment, a privacy notice |
| `URL` | Yes | string | Where it is |

## Purpose

A processing activity is one thing the company does with personal data, for one purpose (GDPR Art. 30(1); DSG Art. 12, «Bearbeitungstätigkeit»). It answers "what do we do with whose data, on what ground, for how long, and who else gets it?", which is what a record of processing keeps and what a privacy page discloses. The processors it names keep their own facts on their own pages: where they process, under which contract, for how long.

## Writing rules

- The tagline states one purpose, as the person whose data it is would understand it.
- The page is one activity for one ground: processing that rests on two grounds in `legal-basis` is written as two activities.
- Each item of `## Data subjects` names a category of people, never a person.
- Each item of `## Personal data` names a category of data, not a field of a database, and says so where it is a special category (GDPR Art. 9; DSG Art. 5 lit. c).
- Each row of `## Processors` says in `Receives` what reaches that processor and nothing more, so a processor that sees part of the data is never listed as seeing all of it.
- `retention` states the company's own period or the criterion that decides it; a processor's own period is on the processor's page.
- The page writes names and prose in American English (R14).
