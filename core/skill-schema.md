---
id: 01a02f31-3488-773e-a919-f51e729f2ba4
---

# Skill Schema

> Required structure for skill files.

## File Location

`model/skills/*.md`

A skill owns nothing, so it is a file. Nothing owns a skill either: a profile claims one and a role requires one, and it outlives both.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `group` | No | string | Free-text grouping, e.g. `Testing`. Whether a group becomes an entity of its own is deliberately open. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Skill]` | Yes | The canonical name. Profiles, experiences and roles reference this exact string. |
| `> [Definition]` | Yes | One-paragraph definition of what the skill is |
| `## In practice` | No | What someone using this skill actually does |
| `## References` | No | Table. What a reader can open to learn more about the skill; its columns are declared below. |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a framework, a standard |
| `URL` | Yes | string | Where it is |

## Purpose

A skill is a capability a person can claim, an experience can evidence and a role can require — one file, named once, referenced by every profile that claims it. It answers "what is this, and what does doing it look like?" for a reader who may claim it, assess it or hire for it. It is not any one person's history with the capability: that lives in the profile's Skills table as a level, in the Evidence table under it and in the experiences that list the skill.

## Writing rules

- The definition starts with the thing itself, never with a wrapper — not "The practice of",
  "The discipline of", "The ability to".
- `## In practice` is person-neutral: no name, employer, date or number from any profile. A
  second profile must be able to claim the skill without a word changing.
- `## In practice` is written in the imperative without a subject — "Assess …", "Translate …",
  "Engage …" — never "Someone doing this …" or "They …".
- The page names products and tools only in a closing clause of the form `Typical tools: …`, and
  only where a product is what the skill is done with. A product is not a skill.
- The page cites and reproduces none of the public vocabularies (SFIA, ESCO, O*NET, Lightcast),
  which may be consulted to find the grain and to check for gaps. The vocabulary is the
  instance's own.
