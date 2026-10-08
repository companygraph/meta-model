---
id: 01a02f39-6248-779b-b3d9-aed29f14e367
---

# Value Schema

> Required structure for value files.

## File Location

`model/values/*.md`

One file per value. Both source instances kept their values in a single document with a heading per value, and a heading has no canonical name — so no strategy, seat or process could cite the value it upholds, which is the one thing a company's values are for.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Value]` | Yes | The canonical name. Everything references the value by this exact string. |
| `> [Statement]` | Yes | One-paragraph statement of the value |
| `## In practice` | Yes | What following this value looks like, and what breaking it looks like |
| `## References` | No | Table. What a reader can open to learn more about the value; its columns are declared below. |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a code of conduct, a handbook |
| `URL` | Yes | string | Where it is |

## Purpose

A value is something the company holds itself to, written so that a strategy, a seat or a process can cite it — which is why it is one file rather than a heading in a list. It answers "what does this company refuse to trade away, and how would anyone know?" for someone deciding whether to work here, or deciding a hard case where two good options disagree. It is not an aspiration and not a slogan: a value nobody could act against is decoration.

## Writing rules

- `## In practice` speaks in the company's own first person — "I" for a company of one, "We"
  for a company of more — and the same one throughout the instance. Which pronoun is the
  instance's business; that it is first person is not.
- `## In practice` is never addressed at the reader — "You should …" — and never written as an
  instruction. A value is a commitment the company makes, not advice it gives.
- `## In practice` opens with what we do, in situations that have actually come up. Its second
  half is one sentence beginning "I never …" / "We never …", and it names the specific way this
  value gets broken — not its absence.
- `## In practice` names a situation in both halves, not an adjective. "We write the decision
  down before the code" can be checked against last week; "We value quality" cannot be checked
  against anything.
- The statement is a sentence someone could disagree with. If no reasonable company would hold
  the opposite, it is a slogan and the value it is standing in for has not been written yet.
