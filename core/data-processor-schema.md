---
id: 01a10522-0ea5-7706-b34d-71f2af083427
---

# Data Processor Schema

> Required structure for data processor files.

## File Location

`model/data-processors/*.md`

Nothing owns a data processor and a data processor owns nothing: one vendor serves several of the company's processing activities, and each activity names the processors it uses.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |
| `legal-name` | Yes | string | The legal entity the company's contract is with, which may differ from the H1 and from one region to another |
| `countries` | Yes | array | Where the processor processes and stores the data, each an ISO 3166-1 alpha-2 code |
| `retention` | No | string | How long the processor keeps what it receives, under its own terms |
| `sub-processor-authorization` | No | enum | `general` or `specific`. Whether the contract lets the processor add sub-processors after notice, or only with the company's approval of each (GDPR Art. 28(2); DSG Art. 9(3)). |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Data processor]` | Yes | The name the company calls the processor by. Everything references the processor by this exact string. |
| `> [What it does for the company]` | Yes | What the processor does for the company, in one sentence |
| `## Own purposes` | No | Bulleted. What the vendor does with the data for purposes it decides itself, where for that processing it is a controller and not the company's processor (GDPR Art. 28(10)) |
| `## Transfers` | No | Table. What makes the disclosure abroad lawful, for each jurisdiction whose law asks; its columns are declared below. |
| `## References` | Yes | Table. The data processing agreement, the vendor's sub-processor list, its privacy policy and its retention terms; its columns are declared below. |

`## Transfers` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Jurisdiction` | Yes | enum | `eu`, `ch` or `uk`. The law that asks for a safeguard: the GDPR, the Swiss DSG or the UK GDPR. |
| `Safeguard` | Yes | string | The instrument as that law names it, an adequacy decision, standard contractual clauses and their module, binding corporate rules |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document, a data processing agreement, a sub-processor list, a privacy policy |
| `URL` | Yes | string | Where it is |

## Purpose

A data processor is a party that processes personal data on the company's behalf (GDPR Art. 4(8); DSG Art. 5 lit. k, «Auftragsbearbeiter»). It answers "who outside the company handles this data, where, under which contract, and how does it reach them lawfully?" for whoever writes the privacy page, answers a data subject or reviews a vendor. What the company does with the data, and why, is the processing activity's, which names the processor; the processor names no activity.

## Writing rules

- The tagline says what the processor does for the company, not what the vendor sells.
- `legal-name` is the entity the company's contract is with, as the contract writes it.
- `countries` lists where the data is processed and stored, not where the vendor is incorporated.
- `retention` is the vendor's period in the vendor's words; the company's own retention is the processing activity's.
- `## Own purposes` names each purpose the vendor decides for itself, in the words of its terms.
- Each row of `## Transfers` names the instrument as its jurisdiction's law names it.
- `## References` carries the vendor's sub-processor list as a row, because the list is the vendor's to keep and to announce changes to (GDPR Art. 28(2)).
- The page writes names and prose in American English (R14).
