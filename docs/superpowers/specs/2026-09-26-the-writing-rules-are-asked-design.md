# The writing rules are asked

Every schema in core ends in writing rules, each written to be checkable by an agent reading an entity, and the only thing that checks them is the agent pass of R0: a model reading every entity against every rule, in prose, a little differently each run. This design adds a third reader between the script and the agent. The tooling turns each writing rule into a typed question, asks a decision model that answers with a probability and never with text, and reports per entity what the rules found and per rule whether it could be judged at all. It gates nothing; it tells the agent pass where to read first.

Status: draft, written on September 26, 2026 against this repository at `d7407a8` (package 0.48.0, core 0.42.0), and revised on October 3, 2026 against `11b73b1` (package 0.71.1, core 0.53.0) with the owner's three decisions, and amended the same day against `0b55ca9` (package 0.73.0, core 0.54.0) so that a rule is asked only of a page that has what the rule is about (companygraph/meta-model#250). It rests on one outside release, TypeSafe AI's Jev, published on September 15, 2026: a model that takes state and typed questions and returns typed answers with probabilities, trained so that those probabilities are calibrated. Its wire format, price and latency are TypeSafe's published figures and were not measured here; the section on measuring says what is measured before any threshold is written down. The same judge is proposed for the chat's answers in companygraph/chat-server#30, and the two share what is learned about calibration and nothing else.

## The gap

R0 has two halves. `companygraph check` reads what a script can read, and says what it left to the agent pass; the `companygraph-validate` skill reads the rest, and most of the rest is the writing rules. CONVENTIONS asks each rule to be one sentence an agent can check against an entity, “person-neutral: no name, employer, date or number from any profile” can fail and “write well” cannot, and nothing tests that a rule meets that demand. An agent that finds a rule vague judges it anyway and returns something shaped like an answer.

**What the change buys is a verdict per entity and rule, with a probability, and a measure per rule of whether it can be judged as written.** Neither replaces the agent pass. The first tells it where to look; the second is a finding against a schema, which only a change to core answers.

## The questions

The questions are derived, never written, and from the schemas the instance vendored, never from the core in the package, for the reason the instance checks read that copy: a newer tooling does not hold an instance to rules it has not adopted.

Every bullet of a schema's `## Writing rules` becomes a yes-or-no question: does this entity keep this rule. The question is the rule's own sentence, verbatim. The state is the entity's file whole, with its schema's `## Purpose` beside it, since the purpose is what the rules serve and a judge that reads a rule without it reads less than the agent does.

One kind of question is a choice instead. The experience schema groups each achievement under the kind it is chiefly evidence of, and that is a classification the schema asks a reader to make: the options are the instance's achievement kinds by name, the criteria each kind's tagline and purpose, read through `constraintsOf` as any consumer of the vocabulary reads them. The verdict is the kind the judge picks and its probability, set against the heading the bullet stands under. It is the only choice in the first slice, because it is the only place a schema asks for one; a schema that later asks a reader to place something among a type's entities gains its question the same way.

A rule is asked of the entity whole, even where its sentence is about one bullet or one field. Splitting an entity into the parts a rule is about would need the rule to declare its scope, a shape the writing rules do not have and R9 does not ask for; the rules stay one sentence each. Where the entity-level verdicts show a rule about bullets is judged poorly as a whole, that is the finding that would justify the shape, and a later design gives it.

A rule is not asked of a page that lacks what the rule is about. A rule names that subject when its sentence opens with a backticked name its own schema declares: a section in the sections table, as `` `## Ending` is written in the person's own voice `` does, or a column of a section's table, as `` `As` is the name the target goes by `` does. A name further into the sentence does not count, and a frontmatter field never does: several field rules govern whether the field is there at all, as the experience schema's first rule says when `role` is filled and when it is left absent, so an absent field is something such a rule judges. Where the page has no such section, or its table in that section has no such column, the rule is left out of that page's request and keeps its number. An optional section the page does not carry leaves the rule nothing to judge; a required one that is missing already fails `check`, so leaving the rule unasked hides nothing. The first full run showed why: the experience schema's rule on `## Ending` was flagged on seventeen entries that were one-offs or still running and carried no Ending, which the schema does not ask them to, and every concept without a `## Relations` table was flagged on the rule about its `As` column. The condition is read from the schema, not from the judge, so a fixture holds it and no measurement does.

## The rule that cannot be judged

A rule the judge answers near an even split for most of the entities it applies to is a rule an agent reading an entity cannot check either: the judge had the same sentence and the same file. The report states, per rule, how many entities it was asked of and how many answers fell near even, and names every rule where those are most of them. A rule left unasked for want of its subject is counted on the same line, as not asked of so many pages and why, so the near-even share is a share of the pages the rule was asked of. That is a finding against the schema under CONVENTIONS' own demand, and the answer to it is a rewritten rule in a release of core, never a threshold lowered in the tooling.

This is the part of the design that does not depend on the judge being right about any one entity. It depends only on the probabilities being honest, which the measuring below tests first.

## Where it lives

`lib/` stays pure. A new module, exported as `companygraph-meta-model/questions`, turns a parsed instance and its schemas into the questions and turns the answers into the report; it opens no socket, so the suite tests it on fixtures as it tests the checks.

`bin/companygraph.mjs` gains `judge`, beside `check`. It builds the questions, says before sending anything which files and how many questions go to which service, sends them with the key in `TYPESAFE_API_KEY`, and prints the report; with no key it prints the questions and sends nothing, so a reader sees exactly what would be asked. The call to the service is one file under `bin/`, the only place the tooling names a judge, so a second judge is a second file and the questions do not change.

The report is advisory and says so. It ends as the validate skill's report ends, naming what it did not ask, and it never prints a line that reads as a pass. `companygraph-validate` gains one sentence in its fourth step, in the first slice: where a `judge` report of the same commit exists, read the entities it flags and the rules it names first, then the rest as before. Until the measuring below has written the near-even band, the report flags nothing, so it lists instead each entity's lowest-probability verdicts, marked as unmeasured, and those are what the skill reads first. The agent pass still reads every entity against every rule.

## What it does not do

It runs in no workflow. `instance-check.yml` stays the mechanical half of R0: a judge's answer can move between runs, a public repository's run cannot hold the key, and a required check that is sometimes wrong teaches everyone to ignore it.

It sends an instance's files out of the machine, which for a private company's model is a decision about that company's data. `judge` asks each time, names the service, and has no setting that skips the question; an instance that must not leave the machine does not run it.

It does not change the shape of a schema, the wording of any rule, or R0.

## Measuring

Before the report shows a probability as a finding, the fixtures measure whether the probabilities mean what they say. `verify/` gains a set of entities copied from `example/`, each with one fault planted against one writing rule — a stack listed as an achievement, a skill in `skills:` the body does not show, a bullet under a kind it is not chiefly evidence of, a running period whose tagline does not say so — and the same entities without the fault. A script run by hand with a key, never in CI, asks the judge about all of them and prints, per tenth of probability, how often the verdict was right. Where that curve is near the diagonal, the band that counts as near even is read off it and written into this section; until then the report prints probabilities and flags nothing.

**Measured on October 3, 2026.** The example's entries gave too few answers to read a curve from, so the measuring was run over the reference instance's experiences as well, with jev-1.13.0, a whole page per request as `judge` asks. The curve is monotone and not on the diagonal: the probabilities run high. Below 0.6 about four pages in five broke the rule they were asked about, from 0.6 to 0.7 the answers were near even, and from 0.8 up most pages kept it. The band is therefore read off where the answers proved near even rather than where the probability reads 0.5, an amendment the owner made to the rule above on the same day: `low` 0.6 and `high` 0.7, so the report flags a rule verdict below 0.6. A choice is measured on its own curve: a pick at 0.9 or above was right 97% of the time and below it mostly wrong, so a pick that differs from its heading is flagged at 0.9 or above. The judge saw three of the four planted faults on nearly every page; a bullet under the wrong kind it did not see as a rule of the whole page, and the choice is what catches it. A newer model is measured again before its band is written.

The second measurement runs against the reference instance and asks which rules land near even for most entities. That list is the first input to a core release, and it is kept in the pull request that acts on it, not here, since it moves with every rewritten rule.

## Out of scope

Questions a schema's tables already answer, which `check` reaches. Judging a schema's own prose for portability, which R0 leaves to the agent and which no entity carries. Fixing anything: `judge` reports, and a writer edits.

## Decisions

The owner settled the three choices this design left open on October 3, 2026.

An instance's files may go to an outside service. The three instances `judge` is first run on are public and already served through their MCP hosts, so nothing leaves that is not published; `judge` still names the service and asks on every run, and an instance that must not leave the machine does not run it.

The achievement choice ships in the first slice, beside the yes-or-no questions, so a writer is told which kind a bullet belongs under and not only that an entry groups something wrongly.

The validate skill reads the report from the first slice, as Where it lives says, rather than waiting for the measurements.
