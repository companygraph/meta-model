# A skill for new vocabulary

A new type reaches core or a pack today by a conversation nobody wrote down: someone reads the sources, searches for what the rest of the world calls the thing, holds it against core, settles the choices one at a time and writes a spec. The software pack went that way on September 30, and it went well only where the conversation happened to ask the right question: the grammar problems with an aggregate's members, its emitted events and a feature design's scenarios surfaced at plan time, and a private instance was named in a pushed spec until the owner caught it. meta-model #196 asks for the next type, `rule`, and offers a second company's rules as a source. A skill, `companygraph-vocabulary`, makes that conversation a procedure anyone with a clone can run, which ends in a spec and never in a schema.

Status: decided by the owner on September 30, 2026: the result is an analysis and then a spec, and the plan and the build stay with the normal pipeline; anyone runs it and only the owner decides, so a contributor's answers are proposals and the run ends in a feature request; the analysis reads the operator's sources, public practice the skill searches for itself, and core; the decisions are a fixed list of eight kinds, asked only where the report leaves a real choice; the report stays local and a private source is cited only as its operator allows.

## Where this comes from

The software pack's design is the worked example (`2026-09-30-the-software-pack-design.md`): nine decisions, each one of a small set of kinds that recur, three of which a check of core's grammar would have caught before the spec rather than after it. `AGENTS.md` already holds the two rules the skill leans on hardest: core is extracted from companies that have the thing, "the union of the two, not one extended to fit the other", and "nothing instance-specific gets published here", with the paths of private sources kept in `LOCAL.md`, which is untracked. `.claude/skills/` in an instance holds the tooling's skills, and `companygraph-company` sets the manner this one takes: one question per turn, each with the answer the run proposes and its reason.

## Who runs it, and who decides

Anyone with a clone of meta-model. The skill asks once whether the operator holds the Owner seat. If so, each answer is a decision and the spec's Status line says "decided by the owner". If not, each answer is recorded as the operator's proposal with its reason, the Status line says "proposed by <operator>, awaiting the owner", and the run ends by drafting the feature request that points at the spec, which the operator files. The owner then takes the proposals in a review of their own. That is the Feature request process and the decision that agents write and a person approves, applied to vocabulary: a contributor does the research, and nobody but the owner speaks for core.

The skill lives in meta-model's own `.claude/skills/companygraph-vocabulary/` and is never vendored into an instance, since an instance does not change core.

## The procedure

1. **Seat.** Is the operator the Owner?
2. **Types.** The new types: names at least, a sentence each where the operator has one. An issue that asks for them, such as #196, is read first and linked from the spec.
3. **Sources.** Web addresses and local paths. For each one that is not public, how the spec may cite it: by name, described without a name, or not at all, proposing "described, not named". The names to keep out are recorded, and a local path goes in `LOCAL.md`, never in the spec.
4. **Unit.** Core, or which pack, as the operator's first guess; the first decision kind revisits it with evidence.
5. **Analysis.** The operator's sources read in full. Public practice searched per type: its established definition, the standards that name it, and the words they use for its relations. Core read against the proposal: `core/CONVENTIONS.md`, the schemas nearest to it, earlier specs that deferred or rejected it, and open issues.
6. **Report.** `dist/research/<date>-<topic>.md`, after `git check-ignore -q dist/` passes, and where it fails the operator is asked and `dist/` added to `.gitignore`. Per type: the definition and the sources it rests on, the fields and edges proposed in core's type grammar, the core types it overlaps or collides with, anything the grammar cannot express, the number of companies the sources show it in, the open questions, and what was read, what yielded nothing and what was not read and why. The report quotes freely, because it never leaves the operator's machine.
7. **Decisions.** The eight kinds below, in order. A kind the report settles is stated in one line; an open one is asked in its own turn, with options, a recommendation and the reason.
8. **Spec.** `docs/superpowers/specs/<date>-<topic>-design.md`, on a branch in a sibling worktree, committed as the Specifier.
9. **Hand-off.** The pull request is opened, and for a contributor the feature request is drafted. Nothing is merged.

## The eight decision kinds

1. **Unit.** Core, or a pack and which one. Core only where the sources show the type in companies of more than one kind; one kind of company is a pack, and one company is a wait for the second.
2. **Ownership.** At the top of the container or owned, and so what a name is unique within (R2, R10).
3. **Definition.** Which source's meaning, where they disagree.
4. **Type, field or row.** A thing something outside its page names needs a page; a thing only its own page names is a field or a row.
5. **Reuse.** Whether a core type already carries it. Always proposed first, before a new type.
6. **Edges.** Each reference, its direction and whether it is required. A pack's edge to core is optional and core never names a pack's type (R20, which the software pack adds); a relation is written on one side only.
7. **Grammar.** Anything core's grammar cannot express, with reshaping the type as the default proposal and a grammar change as the exception.
8. **Departures.** Where the vocabulary differs from its source, and why.

## What the skill holds itself to

One question per turn, always with a proposal, so that a yes is a complete answer and a no a correction. A contributor's answer is written "proposed", never "decided". Every definition names its source: quoted in the report, paraphrased with its citation in the spec. A proposed field or column is written in core's grammar in the report, so the grammar question is found there and not at plan time. No count, version or date that moves goes into the spec.

The spec follows the software pack's: the gap and the Status line, where it comes from with its sources cited as the operator allowed and the company count, one section per type, the decisions and their reasons, the departures, what was left out, what is out of scope and what it costs, and a Mermaid diagram of the types and their edges, rendered once with mermaid-cli to prove it parses.

Before the spec is committed, the skill searches the diff and the commit message for every name the operator said to keep out, after first showing that the same search finds the name in the report, and refuses to commit until it finds nothing. Then conventions-format and conventions-check. The commit is the Specifier's with the family's trailers and a `Verified:` line, "Part of #N" where an issue started the run, and the pull request is opened and left there.

## How it is proved

The superpowers method for a skill: the same inputs run without it and with it.

The software pack replayed: its type names, the multi-person instance as a local source to be described and not named, beacon's thread, and "pack". It passes where the report flags the members, the emitted events and the scenarios before any decision is asked, where the decisions it asks are of the kinds settled on September 30 and it does not ask what its report settled, and where the name search keeps the instance's name out of the spec after finding it in the report.

The same replay by a contributor. It passes where every answer is written as a proposal, the Status line says "proposed by", and a feature request is drafted at the end.

The first real run is #196, the owner running `rule`, with risk and control if they are to be one piece of vocabulary, and beacon's rules as a source. Its spec is the skill's first output and is reviewed as any spec is.

## What ships

`.claude/skills/companygraph-vocabulary/SKILL.md`, and a sentence in `AGENTS.md` saying where it is and when to use it. It is the repository's tooling and not the package's, so it needs no release and no instance re-pins; it is run from a clone of main.

## What was left out

Writing schema files, since that would put the checker's shape rules ahead of the sources; the plan and the build keep their own pipeline. A report committed beside the spec, which would publish a private source's quotes. Free-form decision questions without the fixed kinds, which is how the grammar and direction questions were missed. A version of the skill for instances, which do not change core.

## Out of scope

The `rule` type itself, which the first real run decides. The owner's review of a contributor's proposals, which is a conversation and not a step of this skill.

## What it costs

One skill file and one sentence, and a run's time: the analysis reads every source whole and searches for each type, which is slower than a conversation and is the point.
