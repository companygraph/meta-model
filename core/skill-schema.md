# Skill Schema

> Required structure for skill files.

## File Location

`model/skills/*.md`

A skill owns nothing, so it is a file. Nothing owns a skill either: a profile claims one and
a role requires one, and it outlives both.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `group` | No | string | Free-text grouping, e.g. `Testing`. Whether a group becomes an entity of its own is deliberately open. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Skill]` | Yes | The canonical name. Profiles and experiences reference this exact string. |
| `> [Definition]` | Yes | Single-line definition of what the skill is |
| `## In practice` | No | What someone using this skill actually does |

## Purpose

A skill is a capability a person can claim and an experience can evidence — one file, named
once, referenced by every profile that claims it. It answers "what is this, and what does doing
it look like?" for a reader who may claim it, assess it or hire for it. It is not any one
person's history with the capability: that lives in the profile's Skills table, as a level and
an evidence cell, and in the experiences that list the skill.

## Writing rules

- The tagline starts with the thing itself, never with a wrapper — not "The practice of", "The
  discipline of", "The ability to".
- `## In practice` is person-neutral: no name, employer, date or number from any profile. A
  second profile must be able to claim the skill without a word changing.
- `## In practice` is written in the imperative without a subject — "Assess …", "Translate …",
  "Engage …" — never "Someone doing this …" or "They …".
- Products and tools appear only in a closing clause of the form `Typical tools: …`, and only
  where a product is what the skill is done with. A product is not a skill.
- One skill is distinct from its neighbors in what someone doing it does, not in which product
  they use. Two files that differ only by tool are one skill.
- Public vocabularies (SFIA, ESCO, O*NET, Lightcast) may be consulted to find the grain and to
  check for gaps; none is cited or reproduced in a skill file. The vocabulary is the instance's
  own.
