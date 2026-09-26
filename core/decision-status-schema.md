# Decision Status Schema

> Required structure for decision status files.

## File Location

`model/decision-statuses/*.md`

A status owns nothing and nothing owns it: every decision carries one, and what each state means lives here rather than in a token whose meaning every reader guesses. It sits at the container root beside `decision-kinds/`, because every decision in the instance is in one of the same set of states.

The set is the instance's own. Which states a company lets a call be in, whether a call can be proposed before it is made, whether a dropped call is told from a replaced one, is a fact about the company, and a state arriving later is one file here, not a change to this metamodel.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Label]` | Yes | The canonical name. Every decision references this exact string. |
| `> [Summary]` | Yes | One-paragraph summary of what the state means |
| `## What it means` | Yes | When a call is in this state, when it leaves it, and what a reader may rely on while it is |

## Purpose

A status answers "is this call made, and does it still hold?" for someone about to act on it. A decision file is never rewritten to say something else, so the status is the one thing on it that moves, and what each state licenses a reader to do is written once here rather than guessed from a word.

## Writing rules

- `## What it means` says what a reader may rely on: a proposed call is not acted on, a
  standing call is, a replaced one is read through the decision that replaced it.
- It says how a call leaves the state, which decision or event moves it on, so that a status
  is never changed by hand without a reason the model can show.
- An instance has exactly one status for a call that holds as written, and every other status
  says what moved a call out of that one.
- A status is about whether the call is made and holds, never about how well it went. What
  came of a call is the next decision's question or a period's result.
- Name it for the state of the call, `Standing`, `Revised`, and never for a verdict on it.
