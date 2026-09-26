# Question Schema

> Required structure for question files.

## File Location

`model/questions/*.md`

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |
| `kind` | Yes | ref → question-kind | What the question is about, the H1 of a file in `question-kinds/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Question]` | Yes | The question as a visitor asks it, ending in a question mark. Every reference to it uses this exact string. |
| `> [Answer]` | Yes | One or two sentences that say where the answer lies and state no fact the model holds elsewhere |
| `## Rests on` | No | Table. One row per entity the answer comes from; its columns are declared below. Absent when the answer is mastered here. |

`## Rests on` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Type` | Yes | string | The type of the entity this row names, as its schema is named: `profile`, `strategic-objective` |
| `Entity` | Yes | ref → by Type in Owner | The entity the answer comes from, by its canonical name |
| `Owner` | No | string | Where `Type` is an owned type, the entity that owns this one, by its canonical name; blank otherwise |
| `For` | No | string | The part of the answer this entity carries, where the answer rests on more than one |

## Purpose

A question answers "where in the model is the answer to what people actually ask?" It is the bridge from a visitor's words to the company's. The facts stay where they are mastered, and the question names them, so a fact changed on its own page is changed for every question that rests on it and no answer goes stale. What no other entity holds, a stance, a boundary, a claim the model deliberately does not make, is mastered on the question itself.

## Writing rules

- The H1 is worded as people ask, not as the model names things: "Can Robert still write code himself?", not "Software engineering proficiency". A question worded in the model's own vocabulary adds nothing the words search did not already find.
- The answer routes. It may say what kind of thing the answer is and where it lies, and it may say what the model does not claim; it states no count, version, date or fact that another entity holds, because that would be a second copy nothing keeps true.
- An answer with no `## Rests on` is mastered on the question. It states only what no other entity holds: a stance, a boundary, or a claim the model deliberately does not make. A fact that belongs on an entity is written on that entity, and the question rests on it.
- Every entity the answer draws on has a row, and no row names an entity the answer does not draw on.
- A question is not an alias. A concept's other names belong in its `## Also known as`; a question is how people ask, not what a thing is called.
- Names and prose are American English (R14). A visitor asking in German is matched by the chat, not by a German question.
- One question per thing asked. Two wordings of the same question are one file; the H1 takes the wording people use most.
- A question has one kind, the one a visitor would look under first. A question that seems to need two is either two questions or is filed where most visitors would look for it.

The answer is required, because a question with no answer is an open issue and not an entity: what the model is asked and cannot answer yet is a change to the model, written as one, and the question follows it. `## Rests on` is optional, because some honest answers rest on nothing else in the model. What that costs is that no check can tell a question resting on nothing on purpose from one whose rows were forgotten; the writing rules and the owner's review of each question carry that, as they carry the rest of what an answer may say.
