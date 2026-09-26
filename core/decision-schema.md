# Decision Schema

> Required structure for decision files.

## File Location

`model/decisions/*.md`

Nothing owns a decision and a decision owns nothing: a call bears on entities of every type and belongs to none of them, as a question does. The filename is not the slug of the H1, which is what R12 does by default. It is the year in `decided`, then a `-`, then a slug naming the call, chosen as an experience's is: `2026-architect-role.md`, `2026-vendored-core.md`. The folder then sorts as a log and reads as one. The year must be the year in `decided`, the rest must be a slug by R12, and the two together must be unique in the folder.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |
| `decided` | Yes | date | When the call was made, not when it was carried out. For a call still proposed, when it was put forward. |
| `kind` | Yes | ref → decision-kind | What sort of call this is, the H1 of a file in `decision-kinds/` |
| `status` | Yes | ref → decision-status | Whether the call is made and still holds, the H1 of a file in `decision-statuses/` |
| `by` | Yes | ref → role | The seat that made the call, the H1 of a file in `roles/`. Never the person: who held the seat on that date is the profile's. |
| `serves` | No | array of ref → strategic-objective | The objectives this call was made for, each the H1 of a file in `strategic-objectives/` |
| `upholds` | No | array of ref → value | The values the call was weighed against, each the H1 of a file in `values/` |
| `supersedes` | No | array of ref → decision | Earlier calls this one replaces, each the H1 of a file in `decisions/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Decision]` | Yes | What was decided, stated as a call. Everything references the decision by this exact string. |
| `> [Statement]` | Yes | One paragraph: the call, in the company's own first person |
| `## The question` | Yes | What had to be decided, and why it had to be decided then |
| `## Alternatives` | Yes | Table. The options that lost, one row each; its columns are declared below. |
| `## Why` | Yes | What turned it: the reason the chosen option won, in the terms the call turned on |
| `## Consequences` | Yes | What the call committed the company to, what it gave up, and what has to stay true for the call to stay right |
| `## Bears on` | No | Table. The entities the call made, changed or ended; its columns are declared below. |
| `## References` | No | Table. What a reader can check the call against; its columns are declared below. |

`## Alternatives` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Option` | Yes | string | The option, stated as the call it would have been |
| `Why not` | Yes | string | What taking it would have cost, in one or two sentences |

`## Bears on` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Type` | Yes | string | The type of the entity this row names, as its schema is named: `product`, `experience` |
| `Entity` | Yes | ref → by Type in Owner | The entity the call bears on, by its canonical name |
| `Owner` | No | string | Where `Type` is an owned type, the entity that owns this one, by its canonical name; blank otherwise |
| `How` | No | string | What the call did to it: made it, changed it, ended it |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document, a specification, a contract, a pull request, a slide |
| `URL` | Yes | string | Where it is |

## Purpose

A decision is a call the company made on a date, written with the options that lost, so that whoever arrives after it can disagree with a reason rather than a rewrite. It answers "why is it this way and not the other way, who decided, and does it still hold?" for someone about to re-open a question that was already closed, or about to act on a call that no longer stands. It is not a strategy, which is the route currently taken and is deleted when replaced; a decision is kept as written for as long as the company exists, and its status says whether it holds.

## Writing rules

- The H1 states what was decided, never the topic: "Core is vendored at a named release", not
  "Core distribution". A reader who sees only the name knows the call.
- The statement is a call a reasonable company could have made differently. If no company
  would have chosen otherwise, it describes the work rather than deciding anything.
- `## The question` names what had to be decided and what made it have to be decided then, a
  deadline, an offer, a finding, and states no reason for the answer; the reasons are `## Why`.
- `## Alternatives` carries at least one row, and never the option taken. `Why not` names what
  the option would have cost, in the terms the call turned on, not that it was worse.
- `## Why` gives the reason the chosen option won, concretely enough that a reader could tell
  whether it would still win today. A reason that would equally support any of the
  alternatives supports none.
- `## Consequences` names what the company is now committed to and what it gave up, and states
  what has to stay true for the call to stay right, because that is what a reader watches for.
- `decided` is the date the call was made, at the precision the source states, never the date
  it was carried out. A call still proposed carries the date it was put forward, and takes the
  date of the call when its status leaves the proposed state, the file renamed where the year
  moved.
- `by` names the seat, never the person, as a role is person-neutral. In a company of one that
  is one seat; in a company of more it is the seat that answered for the call, and a call that
  several seats made names the one that would have had the last word.
- `upholds` names a value only where it actually turned the call. A value that would be cited
  by any call the company makes tells a reader nothing.
- `serves` names an objective only where the call was made for it; a call that serves no
  written objective is still a decision, and gains no invented one.
- A decision names the objective it serves, never the strategy it follows: which route a call
  sits on is read from the strategy that serves the same objective, and a strategy the call
  produced or changed is a `## Bears on` row.
- Every row of `## Bears on` names an entity the call made, changed or ended. An entity the
  call merely mentions is not borne on.
- A decision is not rewritten to say something else. `status` is the one field that moves, and
  `decided` with it once when a proposed call is made; what replaced the call is read from the
  later decision's `supersedes`, and a call that another supersedes carries the status the
  instance keeps for a replaced call. Where a call is dropped and nothing replaced it, one
  dated sentence closing `## Consequences` says so.
- Written in the company's own first person, "I" for a company of one, "we" otherwise, and the
  same one throughout the instance.
- Names and prose are American English (R14).
