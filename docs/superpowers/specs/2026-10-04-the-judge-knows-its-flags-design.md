# The judge knows its flags

Every `companygraph judge` run flags the same things again. Most of its flags are false, and false the same way every time: in two runs on `robertblust/mental-model`, all fifteen flags of decision r13 were false both times, and 33 to 35 of experience r6's each time, about 280 false flags in a run. Each one is read against its page again on every run. A finding the owner has decided to keep comes back too: the first is decision r3 on "Agents write the model, and I approve every change to it". The owner accepted it on October 4, because since v0.76.0's change checks a standing decision's text changes only by a superseding decision, and a borderline wording does not warrant one. This design gives an instance a place to record what its owner has already decided about a flag, `judge/known.md`, so a run reads only what is new, and checks that record like any other committed file.

Status: draft, written on October 4, 2026 against this repository at `10c22f5` (package 0.77.1, core 0.57.0). It builds on `2026-10-04-a-yes-tied-to-what-was-shown-design.md`, whose skill writes the report and its reading, and on #274, released in v0.77.1, which moves both to `dist/judge/`.

## Two verdicts

A row records one of two decisions about one rule on one page:

- `false`: the page keeps the rule, and the judge was wrong.
- `accepted`: the page breaks the rule, and the owner keeps it as it is.

The two are kept apart because they mean opposite things about the page. A `false` row says nothing needs fixing. An `accepted` row says something was found and left on purpose, and the reading keeps saying so.

Rows cover rule questions only. A pick, `g<N>`, is numbered per page rather than per schema, so a page edit can renumber it, and a flagged pick is read again on every run. If picks come back as often as rule flags do, they can take rows of their own later, keyed by section and bullet.

## The file

`judge/known.md` sits in a top-level `judge/` folder of the instance. The instance owns it and commits it. It does not go in `.companygraph/`, which belongs to the tooling: vendored, hashed in the manifest and replaced by `upgrade`, while what the owner decided about the judge is the instance's own data. It does not go in `dist/`, which holds what is not committed and must not be relied on to last. And it is not a set of entities under `model/`: a row is a fact about the quality of the model, not about the company.

The file is one Markdown table under an H1, with these columns:

| Column | Holds |
| --- | --- |
| `Entity` | The page's canonical name. The id behind that name is what the row is anchored to, so a page that moves keeps its rows. |
| `Owner` | For an owned type, the entity that owns the page, so the name resolves within it as R4 requires; empty otherwise. |
| `Rule` | `<type> r<N>`, the type's schema and the position of the rule in its `## Writing rules`, as the report numbers it. |
| `Verdict` | `false` or `accepted`. |
| `Why` | One sentence: for `false`, how the page keeps the rule; for `accepted`, why the owner keeps it. |
| `Seat` | The seat that decided, a role of the instance. |
| `Profile` | The profile that holds that seat. |
| `Date` | The day of the decision, `YYYY-MM-DD`. |
| `Hash` | The first sixteen hex characters of a SHA-256 over the page's text and the rule's own words. |

`Owner` takes the form `## Rests on` already has, `ref → by Entity in Owner` (R9): an experience's name is unique only within its profile, so the owner sits in its own cell and is never folded into the name or written as a path.

The hash is what makes a row lapse. It is computed over the page's file with `\n` line ends, a newline, and the rule's words as `writingRulesOf` joins them. An edit to the page or a core release that rewords the rule changes it, and so does a release that inserts a rule above it, since `r<N>` then names other words. A decision about a page is about that page as it was read, and once the page or the rule changes it no longer holds.

Only code computes the hash, since an agent cannot be trusted to compute a SHA-256 by hand. `judge` prints each flagged verdict's hash on its line in the report, from the same function `check` uses, so the skill matches rows and writes new ones by copying, never by computing.

Seat and Profile together name who decided. The owner requires both: the seat says in what capacity the decision was taken, and the profile says who held that seat. Usually that is the owner's seat and the owner's own profile, since rows are written on the owner's word.

## The check

`companygraph check` reads `judge/known.md` when the file exists, and an instance without it is checked as it is today. A row fails the check when:

- its Entity does not resolve to an entity of the type its Rule names, within its Owner where the type is owned, or an Owner is written for a type that has none,
- its Seat does not resolve to a role, or its Profile to a profile,
- the Profile does not hold the Seat in its `roles`,
- its Rule names no rule that the schema for that type, as vendored or the instance's own, has at that position,
- its Verdict is not `false` or `accepted`, its Date not a date, or its Hash not sixteen hex characters,
- or a second row names the same Entity, Owner and Rule.

A row whose hash no longer matches does not fail. It is reported under `noted:`, as `judge/known.md: <Entity> <Rule>: lapsed, the page or the rule changed since <Date>`, since a lapsed row is a reason to read that flag again, not a broken file. CI runs `check` on every push, so a broken row is caught on the commit that made it.

## The skill

`companygraph-judge` gains two steps around its reading.

Before step 5 reads the flags, it matches each flag against `judge/known.md` by Entity, Owner and Rule. A flag whose row's hash still matches goes to a **Known** section of the reading, one line each with its verdict and date, and is not read again. A flag whose row has lapsed is read like any new flag.

After the reading, a **Proposed for known** section offers rows for the owner to decide:

- every false flag the reading confirmed, as one batch the owner approves or rejects whole;
- each accepted finding on its own;
- each lapsed row that matched a flag and was read again: with a new hash if its verdict still holds, or for removal if the flag now stands.

Rows are written only on the owner's word and committed like any other change. Their Seat and Profile are those of whoever gave the word. A finding on a standing decision's text says that it is fixed only by a superseding decision, so that accepting it is a choice the owner sees.

`judge` itself still asks every question. The page is sent whole either way, so skipping a known question would save little, and asking it keeps visible whether the judge still flags it.

## Where it lands

A new module beside `lib/questions.mjs` that parses `judge/known.md`, computes a row's hash and checks the rows. `bin/check-instance.mjs` reads the file when it exists and adds its failures and notes, and `judge` prints the hash on each flagged line of its report. The judge skill, the AGENTS.md text in `lib/instance-files.mjs` and `README.md` name the file. The first row is written in `robertblust/mental-model` once the instance takes the release: decision r3 on "Agents write the model, and I approve every change to it", `accepted`.

## Testing

In a new `verify/known.test.mjs`, against fixture instances: a well-formed row passes; each failure in the list above fails with its own message; a page edited after its row was written is noted as lapsed and does not fail; a rule reworded or inserted above has the same effect; an instance without `judge/known.md` checks as before. In `verify/judge.test.mjs`, a flagged line carries the hash `check` computes for that page and rule. In `verify/cli.test.mjs`, the AGENTS.md text names the file.

## Decisions

The owner chose on October 4, 2026: the place, a top-level `judge/known.md` that the instance owns and commits; its form, one table with the columns above, Seat and Profile naming who decided and Date its own column; that `check` fails a broken row and notes a lapsed one; that rows come from false flags the reading confirmed, proposed as one batch, and from each accepted finding on its own; that `judge` prints each flag's hash, so only code computes one; that rows cover rule questions, not picks; and that an `Owner` column names the owner of an owned type. The rest of the skill's procedure was presented as a whole and is confirmed on this pull request.
