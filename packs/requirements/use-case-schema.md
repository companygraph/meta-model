---
id: 01a12af5-b9cd-7a47-aec7-4fe31d66d287
---

# Use Case Schema

> Required structure for use case files.

## File Location

`model/use-cases/*.md`

A use case owns nothing and nothing owns it, so it is a file. One use case may be called by several others, so the edge is written on the one that calls, in `includes`, and the called use case names none of its callers.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |
| `level` | Yes | enum | `very high summary`, `summary`, `user goal` or `subfunction`. How high the goal stands against what a primary actor gets done in one sitting: well above it, above it, at it, or below it (Cockburn's goal levels, drawn as cloud, kite, waves at sea and fish). The four are listed from the highest down, and the order is read: what a use case includes stands at its level or below. |
| `scope` | No | enum | `organization`, `system` or `component`. What the use case treats as the thing under design (Cockburn's design scope). |
| `primary-actor` | Yes | ref? → seat | Whoever has the goal: the H1 of a file in `seats/` where the company has the seat, otherwise the actor's name, which stays a string |
| `features` | No | array of ref → feature | The features the use case asks something of, each the H1 of a file in `features/` |
| `includes` | No | array of ref → use-case | The subordinate use cases its steps call, each the H1 of another file in `use-cases/` (UML include) |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Use case]` | Yes | The goal as a short active verb phrase. Everything references the use case by this exact string. |
| `> [Goal]` | Yes | One paragraph of what the primary actor wants and what they have when it is done |
| `## Stakeholders and interests` | Yes | Table. Every party with an interest in how the use case goes, and what each needs from it; its columns are declared below. |
| `## Preconditions` | No | Bulleted. What the system makes sure of before the use case may start, one item each |
| `## Trigger` | No | What starts the use case, which may be a time |
| `## Main success scenario` | Yes | Table. The steps from the trigger to the goal when nothing goes wrong, one row each, in order; its columns are declared below. |
| `## Extensions` | No | Table. Each condition under which a step goes another way, and what happens then; its columns are declared below. |
| `## Minimal guarantees` | Yes | Bulleted. What holds for every stakeholder however the use case ends, one item each |
| `## Success guarantees` | Yes | Bulleted. What holds when the goal is reached, one item each |
| `## References` | No | Table. What a reader can open to learn more about the use case; its columns are declared below. |

`## Stakeholders and interests` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Stakeholder` | Yes | ref? → seat | The party: the H1 of a file in `seats/` where it is a seat, otherwise its name, which stays a string |
| `Interest` | Yes | string | What the party needs from the use case, or needs protected while it runs |

`## Main success scenario` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Step` | Yes | string | The step's label, unique on the page, which an extension and a test cite: `1`, `2` |
| `Actor` | Yes | ref? → seat | Who acts in the step: the H1 of a file in `seats/` where it is a seat, otherwise its name, which stays a string |
| `Action` | Yes | string | What the actor does, in one sentence |

`## Extensions` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Step` | Yes | string | The label of the step it branches from and one lowercase letter: `2a` |
| `Condition` | Yes | string | What the system can detect that sends the step another way |
| `Handling` | Yes | string | What happens then, and where the scenario goes on |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a specification, a recording of the flow |
| `URL` | Yes | string | Where it is |

## Purpose

A use case is all the ways of using a system to achieve one goal for one actor (Cockburn and Jacobson), and it answers "who wants this, what do they get, who else has a stake, and what still holds when it goes wrong?" for whoever decides what a feature must do before anyone designs it. It is the problem side of a feature: core's feature says what someone can do, and the use case says what they want and what is guaranteed, at the level it names. It is not a design, which the software pack's feature design is, and not a requirement, which states one thing a product is held to and may apply to a use case.

## Writing rules

- The H1 is the primary actor's goal as a short active verb phrase, `Download an invoice`, and never a screen or a feature's name.
- The tagline says what the primary actor wants and what they have when it is done, in their words.
- `level` is `user goal` where the primary actor gets the goal done in one sitting and goes away content; a goal that gathers several of those is a summary, and one that no actor would stop after is a subfunction.
- `primary-actor` names a seat where the company has one for whoever has the goal, and otherwise the actor as the company calls them: `Customer`, `Payment provider`.
- `## Stakeholders and interests` names every party whose interest the use case must protect, the primary actor among them, and each Interest says what the party needs, not what it does.
- Each row of `## Main success scenario` is one actor doing one thing that moves toward the goal; a condition is an extension, never a step.
- `Action`, in a step that calls a subordinate use case, names that use case by its H1, and every use case in `includes` is named so in some step.
- `includes` names use cases at the page's `level` or below, in the order `level` lists them: a summary may call a user goal, and a subfunction calls no summary.
- `Condition`, in `## Extensions`, is something the system can detect, not something an actor feels.
- `## Minimal guarantees` hold however the use case ends, an extension that gives up included, and `## Success guarantees` only when the goal is reached.
- `Action` names an aggregate, an invariant or an event, where a step needs one, in words: they are another pack's types, and the page draws no edge to them.
- The page writes names and prose in American English (R14).
