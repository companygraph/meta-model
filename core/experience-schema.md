# Experience Schema

> Required structure for experience files.

**Owner:** profile

## File Location

`model/profiles/<profile>/experiences/*.md`

An experience is owned by a profile and cannot exist without it, so it nests inside the
profile's folder rather than sitting at the root with a `profile:` field pointing back.
The filename is not the slug of the H1, which is what R12 does by default. It is the start
year, then a `-`, then a slug naming the period — chosen, not derived: the H1 says what happened
and makes a long name that neither sorts nor scans, `organisation` is optional so a required
filename cannot come from it, and one organisation covers several periods anyway. Whoever writes
the file picks the shortest thing that identifies it — `2018-northwind-atelier.md`,
`2019-orbit-conference.md`, `2026-career-break.md` — and the folder then sorts chronologically and
reads as a career. The year must be the year in `start`, the rest must be a slug by R12, and the
two together must be unique in the folder.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `start` | Yes | date | When the period began |
| `end` | No | date | Absent means the period is ongoing. |
| `kind` | Yes | ref → experience-kind | What sort of period this is — the H1 of a file in `experience-kinds/` |
| `organisation` | No | string | Where the period was spent. What it names depends on the `kind` — an employer, a client, a host, an awarding body — and each kind says which. |
| `url` | No | string | The entry's own address on the web |
| `skills` | No | array of ref → skill | Each entry is the H1 of a file in `skills/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Title]` | Yes | The canonical name of this period |
| `> [Tagline]` | Yes | Single-line summary of the period |
| `## Achievements` | No | What was accomplished in this period |
| `## Ending` | No | Why the period ended, where a bare `end` date would otherwise be read into. One or two sentences. |
| `## References` | No | Table. What a reader can check this entry against |

An `end` date with nothing beside it is read anyway: the reader supplies a reason, and usually a
worse one than the truth. The section is optional because most periods need none — a talk ends
when it has been given — and a required one would manufacture noise, or invent. It is only
meaningful where `end` is set; an ongoing period has not ended.

It is prose rather than a frontmatter field because a reason is a sentence: it wraps, it may
carry a colon, and R8 keeps frontmatter for short facts. It is deliberately not an enum either.
A closed set of endings — resigned, redundancy, contract end — flattens the one thing that
carries the meaning, does not survive the move between employment cultures, and would be the
most sensitive field in the model to filter on. What is worth recording here is a sentence
someone wrote on purpose, not a token someone selected.

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a register entry, a recording, a certificate, a product |
| `URL` | Yes | string | Where it is |

## Purpose

An experience is one dated period in a profile's history, and the place a skill claim gets its
evidence. It answers "what did this person do here, and what does that show?" — so it is
written from the person's side, not the organisation's. What the organisation is, what a skill
means and how strongly the person claims it are all somewhere else; what only this file holds
is what happened, when, and what it evidences.

## Writing rules

- Every entry in `skills:` is one the body shows. A skill listed and not evidenced belongs in
  the profile's table or nowhere; here it is a claim with nothing under it.
- An `## Achievements` bullet states an outcome, one idea each. "Responsible for the platform"
  is a job description; "held platform cost flat as volume grew to 89M events a year" is an
  achievement. Where a number, a system or a named result exists, it goes in the bullet.
- A period still running has no `end`, and the tagline says so — a reader sees a tagline and
  does not see an absent field.
- A one-off is not a period: a talk, a certification, an award or a publication sets `end`
  equal to `start`. Left absent it would read as still running, and no other field says
  otherwise. The two being equal is what makes it a one-off, and the interval that shared
  value denotes is how precisely it is placed: `2012-05-04 .. 2012-05-04` is a day,
  `2016-10 .. 2016-10` a month, `2002 .. 2002` an event known only to its year. A period that
  genuinely ran a whole year is not written `2002 .. 2002` — it takes the months it ran,
  `2002-01 .. 2002-12`, which is also the only way to tell the two apart.
- `url` is the entry's own address and nothing else — the conference's page, the recording,
  the published case study. A link that lets a reader check a claim the entry makes is not the
  entry's address; it is a reference, and it goes in the table.
- `What` names the kind of document, not its significance. "Commercial register entry" is a
  fact about the link; "proof that the company existed" is a reading of it.
- For a one-off, `organisation` is whoever hosted, awarded or published it. The field is a
  stretch there and the alternative — leaving it empty — says less.
- `## Ending` is written in the person's own voice and looks forward: what the period had
  settled, and what it made the next thing. It is neither an achievement nor a grievance.
