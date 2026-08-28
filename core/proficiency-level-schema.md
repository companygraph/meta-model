# Proficiency Level Schema

> Required structure for proficiency level files.

## File Location

`proficiency-levels/*.md`

A level owns nothing and nothing owns it: many profiles claim the same few, and the definition
of each lives here rather than being restated on every assessment. Changing what a level means
is then one edit, in one file.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `rank` | Yes | number | Position on the ladder. Spaced in tens so a rung can be added without renumbering the others. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Label]` | Yes | The canonical name. Every assessment references this exact string. |
| `> [Summary]` | Yes | Single-line summary of what the level claims |
| `## What it means` | Yes | What someone at this level can actually do |

## Purpose

A proficiency level is one rung of the single ladder every claim in the instance is made
against. It answers "what does this word mean when someone claims a skill at it?" — for the
person making the claim, and for the person weighing it. Its whole value is that the definition
sits in one file: two assessments at the same rung mean the same thing, and changing what a
rung means is one edit rather than a hundred.

## Writing rules

- `## What it means` is written so that two assessors reading it would place the same person on
  the same rung. A rung that cannot do that is not yet a rung.
- It describes what someone at this level does with *it* — the thing being claimed — and never
  what that thing is. Every rung is claimed against every skill, so anything specific to one
  skill does not belong on a rung.
- A rung names what it has that the rung below does not. Working unsupervised, choosing between
  alternatives, knowing where the thing breaks down: each rung earns its place by a difference
  someone could observe, or the ladder has fewer rungs than it claims.
- The ladder is the instance's own, in its own words. No external scale — SFIA, Dreyfus, a
  set of HR bands — is cited or reproduced, for the same reason a skill cites none.
- A rung is about capability, never about seniority, tenure or job title. Those are the
  organisation's business and they move for reasons that have nothing to do with the claim.
