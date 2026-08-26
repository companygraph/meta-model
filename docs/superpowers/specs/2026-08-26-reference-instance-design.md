# CompanyGraph reference instance — design

> Roadmap item 2: a real company of one, described in the core vocabulary, laid out exactly as
> the tooling will lay one out. It is the first thing that can show the extraction was wrong,
> and the first thing that can show the tooling design is wrong — before either is built on.

Status: design agreed, nothing built. The instance is a new repository,
`robertblust/mental-model`; this spec lives here because the findings it produces are about
core and the tooling, not about one person's CV.

Reads against [`2026-08-23-companygraph-design.md`](2026-08-23-companygraph-design.md) — §6
(splitting the agent instructions), §7 (an instance ships as a skill), §9 (the first slice) —
and [`2026-08-25-companygraph-tooling-design.md`](2026-08-25-companygraph-tooling-design.md)
— §2 (the release contract), §3 (the instance layout), §5 (installed skills). Where this spec
and either of those disagree, their decisions stand and this one records the disagreement as a
finding (§7) rather than resolving it.

---

## 1. Purpose and non-goals

**Owns:**

- the first release of `meta-model` under the tooling spec's contract: `core/manifest.json`
  and the tag `v1.0.0`
- one instance repository, `robertblust/mental-model`, in the exact layout the tooling spec's
  §3 says `init` produces — built by hand, so the layout is tested before the code exists
- the complete professional portfolio of the company of one, as content: every core type
  populated, every reference resolving
- the portable agent skills the tooling spec's §5 names, as prose that works today without
  the CLI
- a findings section (§7) that names what core or the tooling design got wrong, by section

**Non-goals:**

- any code in the instance — no validator, no build, no sync. The tooling spec's `check`
  belongs to the tooling; R0 says validation is agent-run, and it is
- a sync from the CV repository. The §5 sync slot stays a convention with no worked example
  here; the content is written once, by hand (decided, not deferred)
- changing core or the tooling spec. A finding is recorded, not acted on — each is its own
  follow-up
- a focused application. This is the whole portfolio, which is what the model is for; the CV
  repository keeps the overlays
- a second language. Core has no mechanism for one and this spec does not invent it; the
  instance is English

---

## 2. The release contract, honoured first

The tooling spec's §2 contract has two halves and `meta-model` has neither yet: no
`core/manifest.json`, no tag. An instance that mimics `init` must record which core it
vendored, so the release comes first.

- `core/manifest.json`:

  ```json
  { "version": "1.0.0", "shape": 1 }
  ```

  `shape: 1` is the R9 fixed shape and the six-type vocabulary as they stand. `1.0.0` because
  the vocabulary is what two instances converged on and a third is about to be described in
  it; a `0.x` would say it is still being guessed at.
- `verify/check.mjs` gains the check the tooling spec promises: the manifest parses, `version`
  is a semantic version, `shape` is a positive integer, and — when `HEAD` carries a `v*` tag —
  the tag equals `v<version>`. No tag is not a failure; a tag that disagrees is.
- Tag `v1.0.0` on the commit where the manifest says so, after the PR merges. No GitHub
  release object yet: the tooling spec's §8 leaves release notes open and nothing consumes
  them until `upgrade` exists.
- `LOCAL.md`'s last line names the instance `robertblust/company`; it becomes
  `robertblust/mental-model`. The name pairs with the multi-person instance's, whose
  repository is `magic-mental-model`.
- `README.md` roadmap item 2 is ticked and links to the instance once it is public.

---

## 3. The instance layout

`robertblust/mental-model`, public — the content is the portfolio the CV already sends out,
and a reference instance nobody can read is not a reference. Laid out as the tooling spec's
§3 describes, with nothing added and nothing left out:

```
mental-model/
  .companygraph/
    manifest.json
  meta/
    CONVENTIONS.md  LICENSE
    experience-schema.md  proficiency-level-schema.md  profile-schema.md
    skill-schema.md  source-schema.md  value-schema.md
  profiles/  skills/  proficiency-levels/  values/  sources/
                                each with a README.md index stub
  AGENTS.md
  CLAUDE.md                     one line: @AGENTS.md
  README.md
  LICENSE                       Apache 2.0, the instance's own
  .claude/skills/
    companygraph-validate/SKILL.md
    companygraph-add-entity/SKILL.md
    companygraph-export/SKILL.md
```

Decisions inside that:

- **`meta/` holds exactly the release tarball's content** — `core/*.md` at `v1.0.0`,
  `CONVENTIONS.md`, `LICENSE` — copied, never edited. Every file is hashed into the
  manifest so a later `upgrade` finds them untouched.
- **The manifest** follows the tooling spec's shape with one value it did not foresee:

  ```json
  {
    "tooling": "0.0.0",
    "core": { "version": "1.0.0", "shape": 1, "source": "fetched:v1.0.0" },
    "schemas": "meta",
    "packs": [],
    "files": { "meta/CONVENTIONS.md": "sha256:…", "…": "…" }
  }
  ```

  `tooling: "0.0.0"` means *no tooling wrote this*. The spec's manifest has no way to say
  that, and an `upgrade` that reads `0.0.0` as "very old" and proceeds is doing the right
  thing by accident. Recorded in §7.
- **`README.md` index stubs** in each type folder, as `init` leaves them: one line naming the
  type and pointing at its schema in `meta/`. `README.md` is never an entity's file (R6), so
  the stub is safe in a folder something walks.
- **Owned types get no root folder.** `experiences/` exists only inside the one profile.
- **A root `README.md`** for people: what the repository is, that it is the reference
  instance of the meta-model, the tree above, and where the content came from. It is not an
  entity and not a stub.
- **Three portable skills, not four.** `companygraph-validate`, `companygraph-add-entity` and
  `companygraph-export` are agent prose and work with no CLI; where the spec has them run
  `companygraph check` or `companygraph add` first, the skill says the command is absent and
  does the mechanical part by hand. `companygraph-upgrade` wraps a command that does not
  exist and is not written. When the tooling ships, `init --here` refuses because `meta/`
  exists — so the instance is adopted by hand then too: replace the three skills with the
  tooling's, rewrite the manifest's `tooling` field, keep everything else. That path is the
  tooling spec's §8 "migrating a pre-tooling instance", exercised on purpose.
- **No sync slot.** Nothing under `.claude/skills/mental-model-*/`. `AGENTS.md` still carries
  the section the tooling spec's §5 says the generated file has, saying the slot is empty.

---

## 4. Content

Everything is drawn from the CV repository's `content/` — `profile.yaml`, `skills.yaml`,
`experience/`, `projects/`, `education/`, `community/` — in English only. Nothing is invented:
a fact that is not in the CV is not in the instance. Where a CV entry has an `id`, the entity
carries it as `source-id`.

### Sources — 2

| H1 | `url` | masters |
| --- | --- | --- |
| Local | — | values, proficiency levels, skills — written here, mastered here |
| rob-cv | — (a local repository with no remote; the field is optional and stays absent rather than naming a path) | the profile and every experience; `source-id` is the CV entry's `id` |

The split follows the source schema's own words: a source is "where a page's facts are
mastered". The definition of a skill is written for this graph; the dates of a role are not,
and copying them here does not make this repository their master. No sync exists and the CV
repository has no public address, so the `source-id` is a pointer a person with that
repository follows, not a key a program does — the field's contract does not depend on which.

### Proficiency levels — 4

The ladder from `example/`, unchanged: Familiar 10, Competent 20, Proficient 30, Expert 40,
each with the example's `## What it means`. One ladder in two instances is a stronger claim
than a second ladder would be, and inventing rungs for one person is the wrong direction.

### Skills — about 25

One skill per capability, not per product: "Event-driven architecture", not Kafka and Pub/Sub
and RabbitMQ as three files. Products are named under `## In practice`, which is what the
section is for. `group` carries the CV's group name verbatim — the schema leaves whether a
group becomes a type "deliberately open", and ten strings on twenty-five files is the data that
question needs.

The list, by CV group, is drawn up during the build and reviewed in the PR. The rule for a
cut: a capability earns a file when at least one experience evidences it; a product earns a
mention, never a file.

### The profile — 1

`profiles/robert-blust/robert-blust.md`:

- `source: rob-cv`, no `source-id` (the CV's profile has none), `email`, `location`
- `# Robert Blust`, tagline from the CV's title line
- `## Skills`: one row per skill file, `Level` from the ladder, `Evidence` a concrete fact from
  a role or project — the schema requires it "because the adjective on its own measures
  confidence rather than skill". A skill with no evidence to cite is a skill that should not
  have earned a file; the table is the second pass of the cut above.
- `## Summary`: the CV's default summary, as prose.

### Experiences — 20

Every dated CV entry becomes one experience under `profiles/robert-blust/experiences/`:
six roles, seven projects, two education entries, five community entries. Filename
`YYYY-<slug>.md` by start year, as the schema's File Location asks; where two entries share a
year the slug distinguishes them and the folder still sorts.

| CV folder | `organisation` | `# Title` | `> Tagline` | `## Achievements` |
| --- | --- | --- | --- | --- |
| experience | the employer | the role | one line from the highlights | the bullets |
| projects | the client, with the employer in the tagline | the project name | the role played | the bullets |
| education | the institution | the degree or certificate | one line | the bullets |
| community | the organisation or event | the CV's title | one line | the bullets, if any |

`start` and `end` as `YYYY-MM` where the CV has a month, `YYYY-01` where it has only a year —
the schema types the field `date` in that format and a bare year is not one. That coercion is
a finding (§7). `skills` lists the skill files the entry evidences, by H1.

The mapping of degrees and talks onto a type whose tagline says "period" is the decision
taken in the brainstorm: describe everything in the vocabulary that exists and record where it
strains, rather than leave two folders of the CV unmodelled or invent types before core's
remaining clusters are designed.

### Values — 3 or 4

Drafted from the CV's summary and achievements, each with the schema's required `## In
practice` in its two halves (following it, breaking it). These are the one place the instance
carries prose the CV does not, and they are marked for the owner's review in the PR: a value
someone else wrote for you is not yet yours.

---

## 5. Agent instructions

`AGENTS.md` is the instance half of the older spec's §6 and nothing else:

- **House style**, lifted from the CV repository's own agent file: American English, no
  Oxford comma, one idea per bullet, active voice, claim only what is verifiable.
- **Mastership**: anything with `source: rob-cv` is corrected in the CV repository first and
  copied here second; the reverse is a drift.
- **Before every commit**: run `companygraph-validate`.
- **The sync slot**: the section the tooling spec's generated file carries, stating it is empty.
- A pointer at `meta/CONVENTIONS.md` for every modelling rule. Not one modelling rule is
  restated here — restating is how the two halves fuse again.

`CLAUDE.md` is the one line `@AGENTS.md`, the Claude Code target.

The three skills follow the tooling spec's §5 descriptions:

- `companygraph-validate` — reads `meta/CONVENTIONS.md`, walks the graph, reports per rule
  R1–R10, names what it did not check. Says at the top that `companygraph check` is absent
  and the mechanical rules are therefore its own to do.
- `companygraph-add-entity` — reads the type's schema by the fixed shape, writes the shell
  `add` would write (H1, every field, every required section), fills the body from the
  prompt, then runs validate. Never invents a referenced entity; offers to add it.
- `companygraph-export` — produces `dist/mental-model-skill.zip`: `SKILL.md` with name and
  description from the manifest and entity counts computed at export time, one
  `model/<type>.md` per root type (README first, entries separated by `---`), `model/meta.md`.
  `export/SKILL-intro.md` is spliced in when present; the instance ships one, because a
  company of one is exactly the case where the persona text matters.

---

## 6. Order of work and verification

1. `meta-model`: manifest, verify check, `LOCAL.md`, PR, merge, tag `v1.0.0`.
2. Create `robertblust/mental-model`; layout of §3 with `meta/` copied from the tag and the
   manifest hashed from what was copied.
3. Content of §4 in the order that lets references resolve as they are written: sources,
   levels, skills, values, the profile, the experiences.
4. `AGENTS.md`, `CLAUDE.md`, the three skills, `export/SKILL-intro.md`.
5. Run `companygraph-validate` over the instance until it reports no failure and lists what
   it did not check. Run `companygraph-export` once and confirm the zip's counts equal the
   files on disk.
6. Fill §7. Open one PR in the instance with all of it; open one PR in `meta-model` ticking
   roadmap item 2 and carrying the filled §7.

Verification is the agent pass in step 5 and `npm run verify` in `meta-model` after step 1.
There is no script in the instance to run; that absence is the design.

---

## 7. What the instance taught

Filled during the build. Each entry names the section of the spec it bears on and states the
finding without proposing the fix — the fix is a follow-up decision, not part of this work.

Known before the first file is written:

- **Tooling §3, the manifest** — has no value for "hand-built, no tooling". `tooling: "0.0.0"`
  is the placeholder; whether the field should allow `null`, a `"manual"` token, or whether
  `init --here` should learn to adopt a hand-built instance, is open.
- **Tooling §5, the skills** — three of the four work as prose with no CLI behind them. Either
  the skills belong in `meta-model` (portable prose, versioned with the schemas they enforce)
  and the tooling only installs them, or the spec's "owned and upgraded by the tooling" is
  right and this instance is carrying copies it will have to give back. The older spec's §7
  leaned core for the export mechanism on the same reasoning.
- **Core, `experience`** — a degree, a certification, a board seat and a conference talk are
  each a dated period with an organisation, and the type holds them, but "Achievements" is
  the wrong heading for a talk and `organisation` is a stretch for a conference. The remaining
  clusters (identity, direction, …) may or may not be where these belong.
- **Core, `date`** — the CV keeps years; the schema wants months. The coercion to `-01` is a
  false precision the model now asserts.

The rest is written as it is found.
