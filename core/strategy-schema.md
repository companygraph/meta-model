# Strategy Schema

> Required structure for strategy files.

## File Location

`model/strategies/*.md`

One file per strategy. Nothing owns a strategy and a strategy owns nothing, as with
`strategic-objective`.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `adopted` | Yes | date | When this strategy began deciding things |
| `serves` | Yes | array of ref → strategic-objective | The objectives this strategy pursues — the H1 of a file in `strategic-objectives/` |
| `upholds` | No | array of ref → value | The values that constrain the route chosen — the H1 of a file in `values/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Topic] Strategy` | Yes | The canonical name, ending in "Strategy". Everything references the strategy by this exact string. |
| `> [Statement]` | Yes | Single-line statement of the approach |
| `## The approach` | Yes | How, concretely enough that someone could follow it |
| `## What it rules out` | Yes | The options this choice forecloses |
| `## What would show it is working` | Yes | What is observable, early enough to change course |

## Purpose

A strategy is how an objective gets reached — one route among routes that could all have been
taken, written so that the choice is visible as a choice. It answers "why this way and not the
other way?" for someone who arrives after the decision and would otherwise re-open it.

The vision says where and is not expected to move. A strategy says how and is expected to be
replaced while the objective it serves still stands, which is why it carries the date it
started deciding things and why a retired one is deleted rather than marked.

## Writing rules

- The statement is a choice a reasonable company could have made differently. If no company
  would choose the opposite, it describes the work rather than choosing a route.
- `## The approach` names what is actually done: the tools, the cadence, what is automated and
  what deliberately is not. A strategy that could be pursued by any means at all has chosen
  nothing.
- `## What it rules out` names specific foreclosed options, not their absence. "We do not do bad
  work" rules nothing out; an option a reader can imagine the company taking does.
- `## What would show it is working` states something observable while there is still time to
  change course. A measure that only arrives at the horizon is a verdict rather than an
  instrument, and the objective is where a verdict belongs.
- It says how, never where. A strategy restating the vision has skipped the objective that was
  supposed to sit between them.
- `serves` names at least one objective. A strategy serving none is either an objective nobody
  wrote down or work nothing in the model asked for.
- `upholds` names the values that constrained the route, where any did. It is not a list of
  every value the company holds: a strategy that upholds all of them has cited none.
- Written in the company's own first person — "I" for a company of one, "we" otherwise — and the
  same one throughout the instance.
