# Every surface — design

> A surface has a file today only where no script writes it, so a model's list of surfaces holds
> the places made by hand and is silent about every place a build makes. An agent reading that
> list reads the silence as absence. One field says how a surface is made, every surface gets a
> file, and a built surface's file names the build instead of copying its rules.

Status: proposed. Decided on 2026-09-17 against this repository at `0d6a001` and against
`robertblust/mental-model` at `2fd146f`, core 0.25.2.

---

## 1. The gap

Core 0.16.0 defined a surface as "a place the company publishes that no script writes" and
said, in the schema and again in the reference instance's folder README, that a surface a build
writes has no file: the script is the projection, and a second copy of its rules is a copy
nothing runs. That reasoning still holds for the rules. It does not hold for the fact that the
surface exists.

The reference instance showed the cost. An agent asked about the owner's website through the
instance's MCP server found the site only by reading the project entry that mentions it, and
reported the surfaces list as incomplete: it holds one entry, the LinkedIn profile, while the
site, the MCP server itself and its registry listing are all made from the model and reachable
by anyone. The explanation sat in a folder README, which is not an entity, so nothing the server
returns could carry it.

The schema's own writing rules already name the failure: "every omission is a rule with a
reason," because silence cannot be told apart from drift. A type whose list leaves out every
built surface breaks that rule at the level of the type. And the word is used more widely than
the type allows — the reference instance's server instructions say every surface a reader can
reach derives from one model, which is true only of the wider meaning.

## 2. One type, told apart by how it is made

Three shapes were weighed.

| Option | Decision | Why |
| --- | --- | --- |
| One `surface` type with a field saying how it is made | Taken | One idea with two ways of being made. The list stays one list, which is what the reader needed. |
| Two types, `surface` and a built counterpart | Rejected | It doubles the schema and splits the list across two folders — the join an agent already failed to make. |
| No new files; a list of built surfaces kept somewhere exported | Rejected | A list outside the entities is a README by another name, and no tool that returns entities returns it. |

The field separates what the reader has to know: whether a script is the projection. "Manual"
and "automated" were considered and do not fit, because a written surface can be drafted by an
agent from its file and still be written — nothing re-runs it. So the values are `built`, a
script writes the surface, and `written`, a person or an agent writes it from this file.

## 3. The schema

The definition becomes: **a surface is a place the company publishes from the model.** A place
is published when anyone can reach it without asking; a bundle handed to whoever requests it is
not a surface, and becomes one on the day it is listed somewhere public.

Frontmatter gains two fields.

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `production` | Yes | enum | `built` or `written`. `built` means a script writes the surface and holds its rules; `written` means a person or an agent writes it from this file. |
| `built-by` | No | string | The repository whose build writes the surface. Present exactly when `production` is `built`. |

`built-by` is a string and not a reference to a source. A source is where facts are mastered,
and a build masters none; it reads the model and writes a place.

Sections change in one row. `## Projection rules` goes from required to optional, and a writing
rule carries the condition: required when `written`, absent when `built`, because there the
script is the rules and a second copy is what this model exists to end. `## What it shows` stays
required for both. On a built surface it lists the units the place has — its pages, its tools,
its listing fields — which is the shape R17 allows a file to record and exactly what the agent in
§1 had no way to find. The cost is named: a unit the build adds is a line this file needs, and no
check reads the place to see it. `## Constraints` stays optional for both.

The Purpose paragraph keeps its question and widens its answer: for a written surface the file is
what somebody needs in order to write it; for a built surface it is what somebody needs in order
to know the place exists, what it presents and where its rules live.

Writing rules change as follows.

- The rule "a surface a script writes has no file here" is removed.
- Added: `production` says who holds the rules. A `written` surface carries `## Projection rules`
  and a `built` surface does not; its rules are in the repository `built-by` names.
- Added: a surface is named for the page, never for the place that carries it, so that its name
  cannot be the `Where` of an `## Also at` row. The reference instance already keeps this rule in
  its folder README; a built surface makes the collision likely, because a website's host name is
  what both a profile's Also at and a first draft of the surface would call it.
- Every other rule stands, including R17's: the file never says what the surface currently shows.

## 4. What is checked

The enum is checked by the assertion R8 already has: a value of `production` outside the two
tokens fails. The condition tying `## Projection rules` and `built-by` to `production` is
agent-enforced, as the schema's other writing rules are. A dedicated check would be the first
check in `lib/checks.mjs` that reads one field to decide whether another section is required, and
nothing yet asks for that generality.

## 5. The example

Beacon Systems keeps `partner-directory.md`, which gains `production: written`, and gains a
built surface, `Beacon Systems website`, with `url` the identity's `url` and `built-by` a
repository on the example's invented domain. Its `## What it shows` lists the pages of a small
company site and it carries no projection rules. The example then shows both values side by side
and a built surface named for the page rather than the host.

## 6. What ships

`surface-schema.md` in core: the definition, two frontmatter rows, the `## Projection rules` row
made optional, the Purpose paragraph and the writing rules above. The example gains one file and
one line, and its README's tree gains the new surface. Core and the package go to 0.26.0. The
parser needs no change: `production` is an enum it keeps as a fact and `built-by` a string.

This breaks every instance that holds a surface: a surface without `production` fails the
required-field check. The release notes say so and show the one line to add.

The reference instance takes the release in its three places and then:

- adds `production: written` to the LinkedIn profile;
- writes three built surfaces — `blust.ch website`, `mcp.blust.ch MCP server` and `MCP Registry
  listing` — each with `built-by`, `url` and `## What it shows`, and the website listing
  `model.json` as one of its units rather than as a surface of its own;
- removes the folder README's paragraph that says built surfaces have no file;
- adds `blust.ch` to the profile's `## Also at`, whose absence the same agent reported.

Downstream, blust.ch's `sameAs` is written from that table, and the Person node already states
the site as its `url`; its build drops its own origin from `sameAs` in the same re-pin. The MCP
server moves its model commit and changes no code. companygraph.io re-pins the parser.

## 7. Not done here

A check that reads `production` to require or forbid sections; a check that compares a built
surface's `## What it shows` with the place it names; surfaces for the skill bundle and the
Gemini Notebook export, which are handed out on request and so are not published; and a surface
for a marketplace listing, which gets its file on the day the listing is live — a file for a
place that does not exist yet would record an intent, and intent belongs in a strategic
objective.
