---
id: 01a02f3d-4e30-7b02-9ed7-cc37d8a2aa93
---

# Profile Schema

> Required structure for profile files.

## File Location

`model/profiles/<profile>/<profile>.md`

A profile owns experiences, so it is a folder rather than a file: `profiles/<profile>/` holds the profile's own file and an `experiences/` folder beside it. Removing a person is then one operation and an orphaned experience is unrepresentable.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `nature` | Yes | enum | `human` or `agent`. What holds this profile: a person, or an agent that runs under rulebooks and stands for whichever model runs it. |
| `seats` | No | array of ref → seat | The seats this profile holds, each the H1 of a file in `seats/`. Absent for a profile without a seat. |
| `email` | No | string | Contact address. On a profile whose `nature` is `human`, also the address the person's own commits are authored under: a commit from it is that person's, whatever seats the profile holds, and passes without trailers. |
| `location` | No | string | Where the person works from |
| `image` | No | image | The person's picture, a file in this profile's folder — square, 512×512 recommended, 256–1024 pixels on a side, at most 300 KB |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Name]` | Yes | The person's canonical name. Everything references the profile by this exact string. |
| `> [Tagline]` | Yes | One-paragraph summary of the person: what they do, or the claim their work makes |
| `## Skills` | No | Table. One row per skill claimed; its columns are declared below. |
| `## Evidence` | No | Table. Under `## Skills`. One row per fact a claim rests on; its columns are declared below. |
| `## Summary` | No | A paragraph of context |
| `## Also at` | No | Table. One row per presence the person maintains elsewhere; its columns are declared below. |
| `## References` | No | Table. What a reader can open to learn more about the person; its columns are declared below. |

`## Skills` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Skill` | Yes | ref → skill | Must match the H1 of a file in `skills/` exactly |
| `Level` | Yes | qualifier → proficiency-level | Must match the H1 of a file in `proficiency-levels/` exactly |

An assessment is a table row rather than a frontmatter field because it is a claim with prose attached, not a short fact, and the evidence under it is a table for the reason stated below. A table renders where a reader looks, has no quoting hazard around a colon or a wrapped line, and declares its columns here exactly as a frontmatter field does.

`## Evidence` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Skill` | Yes | ref → skill | The claim this row stands under — the H1 of a file in `skills/` |
| `What it shows` | Yes | string | One sentence naming the thing done, concrete enough that a reader could check it |
| `Experience` | No | qualifier → experience | `skills` lists `Skill`. The period the fact comes from — the H1 of a file in this profile's `experiences/` |

Evidence is a table of its own rather than a third column of `## Skills` because a claim rests on more than one thing and a cell holds one line. A paragraph listing four engagements cannot be counted, and breadth is one of the things a level is read from: a capability shown in three engagements has held where the people, the constraints and the stakes changed, which one engagement cannot show however well it went. One fact per row is what makes that breadth readable by anyone, including a machine.

`Experience` is the optional column and sits last. It is optional because a claim at the lower rungs can rest on having been near work rather than on having owned a period of it, and such a row leaves the cell blank rather than inventing a period to fill it. Where the cell is filled, the experience's period is read from the experience and is not written into the sentence as well: a date copied beside a fact the experience already owns is a second copy that nothing keeps true. A period shorter than the experience's is different. The years a practice ran inside a longer role are not a copy of the role's dates but a fact of their own, and the sentence is the only place that holds them, so they stay.

The column is `What it shows` rather than `Evidence` so that it does not restate the section it sits in, which is the same reason `## References` calls its first column `What`.

`## Also at` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Where` | Yes | string | The place, in plain words — GitHub, LinkedIn, Substack |
| `URL` | Yes | string | The person's own page there |

A presence is a place the person maintains a page on, named by the place and addressed by that page — never a single post, an article or a recording, which document an experience and belong in that experience's `## References`.

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a register entry, a publication |
| `URL` | Yes | string | Where it is |

## Purpose

A profile is the one page that says who a person or an agent is and what they claim — the entity every experience is owned by, every skill claim is made from and every seat is held by. It answers "who is this, what can they do, and what is that judgment resting on?" for someone deciding whether to work with them. It is not a curriculum vitae: what happened, when and where lives in the experiences the profile owns, and what a capability *is* lives in the skill. What only the profile can hold is the claim — this person, this skill, at this level, on this evidence. A person who holds a seat claims the skills the seat requires in their Skills table, with evidence, and where they cannot the gap stays visible as a finding the validation pass reports, never an error and never an invented row, while an agent claims nothing, so a seat it holds reports no gap.

## Writing rules

- The tagline and `## Summary` are the person's own, in their own voice: what they do and what
  runs through it. Not their employer's description of the role, and not a job advertisement.
- The tagline may state the claim the person's work makes rather than describe the work. Then
  the claim is one the model holds elsewhere — a value, or the thread the summary names — and a
  reader can follow it there. A line with nothing behind it is a slogan, and nothing on the page
  tells one from the other except what backs it.
- A `What it shows` cell states a fact that can be checked — a system, an organization, a
  number, a named outcome. "Extensive experience" and "deep knowledge" are not evidence.
- `What it shows` never restates the level. If removing the Level column would lose nothing, the
  row is describing confidence rather than the work.
- `What it shows` says more than its own row's `Experience` cell; a row that says no more says
  nothing, and is dropped rather than written.
- `What it shows` is one sentence, under forty words. The sentence does not repeat the period of
  the experience its `Experience` column names; a period of the fact's own, shorter than that
  one, stays in it.
- `## Evidence` rows run in the order the Skills table lists the skills, and chronologically
  within a skill.
- One row per place in `## Also at`, and a place the person no longer maintains has no row:
  the table is what a reader will follow.
- `URL` in `## Also at` is the page that is the person's own on that place, not a search, a feed
  or a post. What a reader lands on has to be the person.
- `image` is the person, recognizably, as the tagline is their own voice: not a logo, a team or
  an illustration standing in for them. A profile whose nature is `agent` may carry one, and
  then it shows what holds the profile; the rule below that an agent claims no skill does not
  reach it.
- `nature` says what holds the profile, never how well. A profile whose nature is `agent`
  claims no skill and carries neither a Skills table nor an Evidence table: a claim is a
  person's history with a capability, evidenced by work that stays true after the next
  release, and an agent has no such history. What holds an agent to a seat is the rulebook it
  runs under, never a row it wrote about itself.
