# Value Schema

> Required structure for value files.

## File Location

`model/values/*.md`

One file per value. Both source instances kept their values in a single document with a
heading per value, and a heading has no canonical name — so no strategy, role or process
could cite the value it serves, which is the one thing a company's values are for.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Value]` | Yes | The canonical name. Everything references the value by this exact string. |
| `> [Statement]` | Yes | Single-line statement of the value |
| `## In practice` | Yes | What following this value looks like, and what breaking it looks like |

## Purpose

A value is something the company holds itself to, written so that a strategy, a role or a
process can cite it — which is why it is one file rather than a heading in a list. It answers
"what does this company refuse to trade away, and how would anyone know?" for someone deciding
whether to work here, or deciding a hard case where two good options disagree. It is not an
aspiration and not a slogan: a value nobody could act against is decoration.

## Writing rules

- `## In practice` speaks in the company's own first person — "I" for a company of one, "We"
  for a company of more — and the same one throughout the instance. Which pronoun is the
  instance's business; that it is first person is not.
- It is never addressed at the reader — "You should …" — and never written as an instruction.
  A value is a commitment the company makes, not advice it gives.
- The first half says what we do, in situations that have actually come up. The second half is
  one sentence beginning "I never …" / "We never …", and it names the specific way this value
  gets broken — not its absence.
- Both halves name a situation, not an adjective. "We write the decision down before the code"
  can be checked against last week; "We value quality" cannot be checked against anything.
- The statement is a sentence someone could disagree with. If no reasonable company would hold
  the opposite, it is a slogan and the value it is standing in for has not been written yet.
