# The writing rules are asked

Every schema in core ends in writing rules, each written to be checkable by an agent reading an entity, and the only thing that checks them is the agent pass of R0: a model reading every entity against every rule, in prose, a little differently each run. This design adds a third reader between the script and the agent. The tooling turns each writing rule into a typed question, asks a decision model that answers with a probability and never with text, and reports per entity what the rules found and per rule whether it could be judged at all. It gates nothing; it tells the agent pass where to read first.

Status: draft, written on September 26, 2026 against this repository at `d7407a8` (package 0.48.0, core 0.42.0) for the owner to decide. It rests on one outside release, TypeSafe AI's Jev, published on September 15, 2026: a model that takes state and typed questions and returns typed answers with probabilities, trained so that those probabilities are calibrated. Its wire format, price and latency are TypeSafe's published figures and were not measured here; the section on measuring says what is measured before any threshold is written down. The same judge is proposed for the chat's answers in companygraph/chat-server#30, and the two share what is learned about calibration and nothing else.

## The gap

R0 has two halves. `companygraph check` reads what a script can read, and says what it left to the agent pass; the `companygraph-validate` skill reads the rest, and most of the rest is the writing rules. CONVENTIONS asks each rule to be one sentence an agent can check against an entity, “person-neutral: no name, employer, date or number from any profile” can fail and “write well” cannot, and nothing tests that a rule meets that demand. An agent that finds a rule vague judges it anyway and returns something shaped like an answer.

**What the change buys is a verdict per entity and rule, with a probability, and a measure per rule of whether it can be judged as written.** Neither replaces the agent pass. The first tells it where to look; the second is a finding against a schema, which only a change to core answers.

## The questions

The questions are derived, never written, and from the schemas the instance vendored, never from the core in the package, for the reason the instance checks read that copy: a newer tooling does not hold an instance to rules it has not adopted.

Every line of a schema's `## Writing rules` becomes a yes-or-no question: does this entity keep this rule. The question is the rule's own sentence, verbatim. The state is the entity's file whole, with its schema's `## Purpose` beside it, since the purpose is what the rules serve and a judge that reads a rule without it reads less than the agent does.

One kind of question is a choice instead. The experience schema groups each achievement under the kind it is chiefly evidence of, and that is a classification the schema asks a reader to make: the options are the instance's achievement kinds by name, the criteria each kind's tagline and purpose, read through `constraintsOf` as any consumer of the vocabulary reads them. The verdict is the kind the judge picks and its probability, set against the heading the bullet stands under. It is the only choice in the first slice, because it is the only place a schema asks for one; a schema that later asks a reader to place something among a type's entities gains its question the same way.

A rule is asked of the entity whole, even where its sentence is about one bullet or one field. Splitting an entity into the parts a rule is about would need the rule to declare its scope, a shape the writing rules do not have and R9 does not ask for; the rules stay one sentence each. Where the entity-level verdicts show a rule about bullets is judged poorly as a whole, that is the finding that would justify the shape, and a later design gives it.

## The rule that cannot be judged

A rule the judge answers near an even split for most of the entities it applies to is a rule an agent reading an entity cannot check either: the judge had the same sentence and the same file. The report states, per rule, how many entities it was asked of and how many answers fell near even, and names every rule where those are most of them. That is a finding against the schema under CONVENTIONS' own demand, and the answer to it is a rewritten rule in a release of core, never a threshold lowered in the tooling.

This is the part of the design that does not depend on the judge being right about any one entity. It depends only on the probabilities being honest, which the measuring below tests first.

## Where it lives

`lib/` stays pure. A new module, exported as `companygraph-meta-model/questions`, turns a parsed instance and its schemas into the questions and turns the answers into the report; it opens no socket, so the suite tests it on fixtures as it tests the checks.

`bin/companygraph.mjs` gains `judge`, beside `check`. It builds the questions, says before sending anything which files and how many questions go to which service, sends them with the key in `TYPESAFE_API_KEY`, and prints the report; with no key it prints the questions and sends nothing, so a reader sees exactly what would be asked. The call to the service is one file under `bin/`, the only place the tooling names a judge, so a second judge is a second file and the questions do not change.

The report is advisory and says so. It ends as the validate skill's report ends, naming what it did not ask, and it never prints a line that reads as a pass. `companygraph-validate` gains one sentence in its fourth step: where a `judge` report of the same commit exists, read the entities it flags and the rules it names first, then the rest as before. The agent pass still reads every entity against every rule.

## What it does not do

It runs in no workflow. `instance-check.yml` stays the mechanical half of R0: a judge's answer can move between runs, a public repository's run cannot hold the key, and a required check that is sometimes wrong teaches everyone to ignore it.

It sends an instance's files out of the machine, which for a private company's model is a decision about that company's data. `judge` asks each time, names the service, and has no setting that skips the question; an instance that must not leave the machine does not run it.

It does not change the shape of a schema, the wording of any rule, or R0.

## Measuring

Before the report shows a probability as a finding, the fixtures measure whether the probabilities mean what they say. `verify/` gains a set of entities copied from `example/`, each with one fault planted against one writing rule — a stack listed as an achievement, a skill in `skills:` the body does not show, a bullet under a kind it is not chiefly evidence of, a running period whose tagline does not say so — and the same entities without the fault. A script run by hand with a key, never in CI, asks the judge about all of them and prints, per tenth of probability, how often the verdict was right. Where that curve is near the diagonal, the band that counts as near even is read off it and written into this section; until then the report prints probabilities and flags nothing.

The second measurement runs against the reference instance and asks which rules land near even for most entities. That list is the first input to a core release, and it is kept in the pull request that acts on it, not here, since it moves with every rewritten rule.

## Out of scope

Questions a schema's tables already answer, which `check` reaches. Judging a schema's own prose for portability, which R0 leaves to the agent and which no entity carries. Fixing anything: `judge` reports, and a writer edits.

## Choices for the owner

Whether an instance's files may go to an outside service at all, given that the meta-model's instances include private companies. Whether the achievement choice ships in the first slice or waits for the yes-or-no questions to prove the calibration. And whether the validate skill reads the report, or the report stays a tool the owner runs by hand until the measurements are in.
