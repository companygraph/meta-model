# Profile Schema

> Required structure for profile files.

## File Location

`model/profiles/<profile>/<profile>.md`

A profile owns experiences, so it is a folder rather than a file: `profiles/<profile>/` holds
the profile's own file and an `experiences/` folder beside it. Removing a person is then one
operation and an orphaned experience is unrepresentable.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `nature` | Yes | enum | `human` or `agent`. What holds this profile: a person, or an agent that runs under rulebooks and stands for whichever model runs it. |
| `roles` | No | array of ref → role | The seats this profile holds, each the H1 of a file in `roles/`. Absent for a profile without a seat. |
| `email` | No | string | Contact address |
| `location` | No | string | Where the person works from |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Name]` | Yes | The person's canonical name. Everything references the profile by this exact string. |
| `> [Tagline]` | Yes | One-paragraph summary of the person: what they do, or the claim their work makes |
| `## Skills` | No | Table. One row per skill claimed; its columns are declared below. |
| `## Evidence` | No | Table. One row per fact a claim rests on; its columns are declared below. |
| `## Summary` | No | A paragraph of context |
| `## Also at` | No | Table. One row per presence the person maintains elsewhere; its columns are declared below. |

`## Skills` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Skill` | Yes | ref → skill | Must match the H1 of a file in `skills/` exactly |
| `Level` | Yes | qualifier → proficiency-level | Must match the H1 of a file in `proficiency-levels/` exactly |

An assessment is a table row rather than a frontmatter field because it is a claim with prose
attached, not a short fact, and the evidence under it is a table for the reason stated below.
A table renders where a reader looks, has no quoting hazard around a colon or a wrapped line,
and declares its columns here exactly as a frontmatter field does.

`## Evidence` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Skill` | Yes | ref → skill | The claim this row stands under — the H1 of a file in `skills/` |
| `What it shows` | Yes | string | One sentence naming the thing done, concrete enough that a reader could check it |
| `Experience` | No | qualifier → experience | The period the fact comes from — the H1 of a file in this profile's `experiences/` |

Evidence is a table of its own rather than a third column of `## Skills` because a claim rests
on more than one thing and a cell holds one line. A paragraph listing four engagements cannot be
counted, and the rule for reading a level is a rule about counting: evidence that names one
engagement supports a lower rung than evidence that names three. One fact per row is what makes
that rule readable by anyone, including a machine.

`Experience` is the optional column and sits last. It is optional because a claim at the lower
rungs can rest on having been near work rather than on having owned a period of it, and such a
row leaves the cell blank rather than inventing a period to fill it. Where the cell is filled,
the period is read from the experience and is not written into the sentence as well: a date
copied beside a fact the experience already owns is a second copy that nothing keeps true.

The column is `What it shows` rather than `Evidence` so that it does not restate the section it
sits in, which is the same reason `## References` calls its first column `What`.

`## Also at` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Where` | Yes | string | The place, in plain words — GitHub, LinkedIn, Substack |
| `URL` | Yes | string | The person's own page there |

A presence is a place the person maintains a page on, named by the place and addressed by that
page — never a single post, an article or a recording, which document an experience and belong
in that experience's `## References`.

## Purpose

A profile is the one page that says who a person or an agent is and what they claim — the
entity every experience is owned by, every skill claim is made from and every role is held by.
It answers "who is this, what can they do, and what is that judgment resting on?" for
someone deciding whether to work with them. It is not a curriculum vitae: what happened, when
and where lives in the experiences the profile owns, and what a capability *is* lives in the
skill. What only the profile can hold is the claim — this person, this skill, at this level,
on this evidence.

## Writing rules

- The tagline and `## Summary` are the person's own, in their own voice: what they do and what
  runs through it. Not their employer's description of the role, and not a job advertisement.
- A tagline may state the claim the person's work makes rather than describe the work. Then the
  claim is one the model holds elsewhere — a value, or the thread the summary names — and a
  reader can follow it there. A line with nothing behind it is a slogan, and nothing on the page
  tells one from the other except what backs it.
- A `What it shows` cell states a fact that can be checked — a system, an organization, a
  number, a named outcome. "Extensive experience" and "deep knowledge" are not evidence.
- Evidence never restates the level. If removing the Level column would lose nothing, the row
  is describing confidence rather than the work.
- A row that says no more than its own `Experience` cell says nothing. It is dropped rather
  than written.
- One sentence per row, under forty words, and the period is not repeated in it where the
  `Experience` column names one.
- Rows run in the order the Skills table lists the skills, and chronologically within a skill.
- A level is weighed against the rows under it and the rung's own definition, not against how
  long the person has done it. One row supports a lower rung than three.
- One row per skill claimed in `## Skills`, and every claim has at least one row under it in
  `## Evidence`. A skill the person can name but not evidence has no row in either: the table
  is the claim, and a claim needs something under it.
- An `Experience` names a period this profile owns, and that experience lists this skill in its
  `skills` field. Neither is checked — both would be the first rule in the checker to name a
  type, and the schemas drive every rule there today — so both are kept by whoever writes.
- The Skills table is where a person's history with a skill lives. The skill file stays
  person-neutral, so nothing here belongs there and nothing there belongs here.
- One row per place in `## Also at`, and a place the person no longer maintains has no row:
  the table is what a reader will follow.
- The URL in `## Also at` is the page that is the person's own on that place, not a search, a
  feed or a post. What a reader lands on has to be the person.
- A person who holds a role claims the skills the role requires in their Skills table, with
  evidence. Where they cannot, the gap stays visible: the validation pass reports it and
  nothing here invents a row to close it.
- `nature` says what holds the profile, never how well. A profile whose nature is `agent`
  claims no skill and carries neither a Skills table nor an Evidence table: a claim is a
  person's history with a capability, evidenced by work that stays true after the next
  release, and an agent has no such history. What holds an agent to a seat is the rulebook it
  runs under, never a row it wrote about itself.
