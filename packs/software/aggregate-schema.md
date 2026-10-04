---
id: 01a0f94d-fa63-7c7e-8af5-b2d7e5b870cf
---

# Aggregate Schema

> Required structure for aggregate files.

**Owner:** bounded-context

## File Location

`model/bounded-contexts/<bounded-context>/aggregates/*.md`

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `root` | Yes | ref → concept-design | The entity through which the aggregate is reached, a concept design of kind `entity` in the same context (Evans) |
| `members` | No | array of ref → concept-design | The other concept designs the aggregate holds, beside its root |
| `decisions` | No | array of ref → decision | The decisions that shaped this aggregate, the H1s of files in `decisions/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Aggregate]` | Yes | The aggregate's name, usually its root's |
| `> [Consistency]` | Yes | What the aggregate keeps consistent, in one sentence |
| `## Invariants` | Yes | Table. One rule per row that holds after every change, under a label a test or a code comment cites it by (DDD Crew, Aggregate Design Canvas); its columns are declared below. |
| `## Handled commands` | No | Table. What the aggregate is asked to do; its columns are declared below. |
| `## State transitions` | No | Table. The states the aggregate moves through and what moves it, one transition per row (DDD Crew, Aggregate Design Canvas); its columns are declared below. |
| `## References` | No | Table. What a reader can open to learn more about the aggregate; its columns are declared below. |

`## Invariants` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Label` | Yes | string | What the invariant is cited by: letters, digits and hyphens, unique within the aggregate, such as `INV-T1` |
| `Invariant` | Yes | string | The rule, stated so a test could check it |

`## Handled commands` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Command` | Yes | string | The command, in the imperative: "Issue invoice" |
| `Emits` | No | ref → domain-event | An event the command emits, by its canonical name, an event of this context; a command that emits two is two rows |
| `When` | No | string | When the command emits this event rather than another, in words; it may cite the invariants it rests on by their labels |
| `Description` | No | string | What it asks for, and what it refuses |

`## State transitions` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `From` | No | string | The state the aggregate leaves, blank for the transition that starts it |
| `Command` | No | string | The handled command that moves it, as `## Handled commands` writes it, blank for a step the aggregate takes on its own |
| `To` | Yes | string | The state it reaches; a state that is never a `From` ends the lifecycle |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — an aggregate canvas, a design note |
| `URL` | Yes | string | Where it is |

## Purpose

An aggregate answers "what has to stay consistent together, and through what is it changed?" It is Evans's aggregate: a cluster of concept designs changed only through its root. The invariants are a table and not a numbered list, because they are a set and not a sequence, and a position is no key anything outside can cite. A command is a row here and not a type, because nothing outside the aggregate names it. Each event names its aggregate as `emitted-by`, and a handled command may name the events it emits, one row per command and event, which is where a flow is read from; when it emits one rather than another is said in words, and may cite the invariants it rests on. The root is a concept design of kind entity, since a value object has no identity to reach the rest through. A label stays when its invariant is reworded, a new rule takes a new label, and a removed rule's label is not used again.

## Writing rules

- `Invariant` is a rule that holds after every command, stated so a test could check it.
- `Command` is named in the imperative, and an event in the past tense, so the two are never confused.
- `source`, on a page drawn from code, names that code, the repository a sync reads, and the module or package is its `source-id`; a page written here that code then follows names the code in `## References` as `Implementation`.
- An event `Emits` names is one whose `emitted-by` is this aggregate.
- A `Command` in `## State transitions` is written as `## Handled commands` writes it.
