# Track Schema

> Required structure for track files.

**Owner:** process

## File Location

`model/processes/<process>/tracks/*.md`

A track is owned by a process and cannot exist without it, so it nests inside the process's folder beside `phases/`. The filename is R12's default, the slug of the H1.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Track]` | Yes | The canonical name of the track. The owning process's `## Tracks` table and a phase's `### [Track]` headings reference it by this exact string. |
| `> [Produces]` | Yes | One-paragraph statement of what one pass down this track leaves behind |

## Purpose

A track is one kind of thing a process makes, and it answers “which of the things this process makes is this step about?” for a reader of a phase whose work differs by what is being made. It is an entity so that the answer is a reference rather than a word: a phase that heads its activities with a track names something that exists, a track renamed is renamed in one place with every mention held to it, and the tracks are visible in the graph as nodes. It points at nothing. Which seats work a track and what they do on it are said by the phases.

## Writing rules

- A track is named for what it makes, not for who makes it: `Code`, not `Engineering`.
- The tagline says what is left behind when a change has run down the track, as a thing a
  reader could point at: “a merged change to the platform”, not “development work”.
- A track's name is unique within its process (R2): two processes may each have a track called
  `Code`, and a phase's heading or a process's `## Tracks` finds the one in its own process
  (R4).
- A track carries no order: the order a process lists its tracks in is the order a reader meets
  them and nothing more.
- A track carries its name and what it produces, and nothing more. R9 lets a page hold sections
  of its own, so no script refuses one here; what a track would say in it belongs to the phase
  that does the work or to the process that owns the track.
