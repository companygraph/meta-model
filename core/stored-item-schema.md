---
id: 01a10522-0f1d-7d35-be0a-34aacbf7ad04
---

# Stored Item Schema

> Required structure for stored item files.

## File Location

`model/stored-items/*.md`

Nothing owns a stored item and a stored item owns nothing: one key is set by several surfaces of an instance, and it names each of them.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |
| `mechanism` | Yes | enum | `local-storage`, `session-storage`, `cookie`, `indexeddb` or `cache`. How the browser keeps it: the two Web Storage areas, an HTTP cookie, an IndexedDB database or the Cache API (WHATWG HTML, Storage Standard). |
| `necessity` | Yes | enum | `strictly-necessary` or `optional`. Whether the service the visitor asked for needs it (ePrivacy Directive Art. 5(3)). What follows from it differs by jurisdiction and is the law's. |
| `duration` | No | string | How long it stays, where the mechanism does not decide it |
| `surfaces` | Yes | array of ref → surface | The surfaces that set it, each the H1 of a file in `surfaces/` |
| `set-by` | No | ref? → data-processor | The party that sets or reads it, where that is not the company. A name that resolves is a processor; one that does not stays a name. |
| `activity` | No | ref → processing-activity | The activity it serves, where what it holds is personal data, the H1 of a file in `processing-activities/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Key]` | Yes | The key or cookie name exactly as the code writes it. Everything references the item by this exact string. |
| `> [What it holds]` | Yes | What the item holds and why, in one sentence |
| `## References` | No | Table. The code that sets it, the provider's documentation; its columns are declared below. |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document, a source file, a provider's documentation |
| `URL` | Yes | string | Where it is |

## Purpose

A stored item is one thing a surface keeps on a visitor's device under one name: a Web Storage key, a cookie, an IndexedDB database or a cache (ePrivacy Directive Art. 5(3); FMG Art. 45c). It answers "what does this page leave in the browser, for how long, and who reads it?", which is what a privacy page or a cookie policy discloses. Its H1 is the key, so what the code writes and what the model holds can be compared by name.

## Writing rules

- The H1 is the key as the code writes it, character for character.
- The tagline says what the item holds and why, in the words a privacy page would use.
- `duration` is absent for `session-storage`, which ends with the tab, and present for any other mechanism, as the code sets it or as "until the visitor clears it".
- `necessity` is `strictly-necessary` only where the service the visitor asked for fails without the item.
- `set-by` is absent for an item the company's own code sets.
- `activity` names a processing activity where what the item holds is personal data, and is absent otherwise.
- The page writes names and prose in American English (R14).
