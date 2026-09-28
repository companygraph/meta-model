# A commit names its seat

An instance says who does each piece of work: every phase of a process lists its `executed-by` seats, and in Delivery's Implement it is the Implementer that commits on the code track and the Writer and the Translator on the prose track. The history says none of it. Every commit an agent makes carries the owner's name, so the question the model is built to answer — which seat did this, in which process — cannot be asked of the one record every change leaves. A commit an agent makes is authored by the seat it held, at an address on the instance's own domain, `Implementer <implementer@blust.ch>`, and carries the process, phase and track it was made in as trailers. A check refuses a seat the phase does not list, and a new command reads the history back as a report by seat.

Status: decided by the owner on September 28, 2026, question by question: the seat as author, the address on the instance's domain, the addresses as mail aliases, a solo agent committing as the seat whose work it did, the owner's own commits keeping the owner's name, where the check runs, where the report looks, and which instance governs a family repository with no model of its own. Three questions are parked at the foot of this page and are the owner's.

## The author

The author of a commit an agent makes is the seat it held, with the role's title as the name and an address whose local part is that title in lower case, spaces as hyphens, at the host of the instance identity's `url`: `Implementer <implementer@blust.ch>` in `robertblust/mental-model`, `Writer <writer@companygraph.io>` in `companygraph/mental-model`. The domain comes from the model, not from the repository's name, so an instance outside the family gets its own addresses without configuration.

The committer stays the person who runs the agent. Git keeps the two apart, and they answer different questions: the author says which seat did the work, the committer says who is accountable for it being there.

An agent that holds several seats in one session commits as the seat whose work the commit is. A commit of a specification is the Specifier's, of a plan the Planner's, of a task the Implementer's, of English prose the Writer's, of its German the Translator's. The Controller writes nothing, so no commit is ever the Controller's; a session running a plan that finds itself committing its own edit commits it as the seat whose work that edit is.

The owner's own commits — the merge, the tag, the moved pins — keep the identity's name and address, `Robert Blust <robert@blust.ch>`. There is no `owner@` address. A report then tells people from agents at a glance: a person's name is a person, a seat's address is an agent.

Each seat address is a mail alias onto the identity's mailbox, and each is added to the owner's GitHub account as a verified address, so GitHub still links every commit to the owner's account and the contribution graph is unchanged. That is set up once per instance by the owner, outside any repository; it is not a model change, and the identity keeps its name and address.

## The trailers

A commit an agent makes ends with three trailers after the `Verified:` line and before `Co-Authored-By`:

```text
Process: Delivery
Phase: Implement
Track: Code
```

Each names an entity of the governing instance by its canonical name. `Track` is omitted where the process has no tracks. The seat is not a trailer, because the author already says it; one fact written twice is two facts that can disagree.

## The check

A commit authored at the governing instance's domain is refused when any of these holds:

- Its local part is not a role of the instance.
- It has no `Process` or `Phase` trailer, or one names no entity of the instance, or the phase is not one of that process's.
- The role is not in the phase's `executed-by`.
- It has a `Track` trailer naming a track the process does not list, or none where the process lists tracks.

A commit authored by the identity's own address passes, trailers or not; it is the owner's. A commit by any other author — Dependabot, a release bot, a contributor — is outside the model and passes. This leaves one gap the check cannot close: an agent committing under the owner's name looks exactly like the owner. The rule in `WORKING.md` closes it for agents that read it; parked question 3 asks whether a Claude Code hook should close it for that agent too.

The check is one command in the meta-model CLI, `companygraph commits [<folder>] [--range <a>..<b>] [--message <file>]`, so both places it runs call the same code. With `--message`, it checks the commit about to be made: the message from the file, the author from `git var GIT_AUTHOR_IDENT`. With `--range`, it checks every commit in the range.

It runs twice:

- As a git `commit-msg` hook shipped from `robertblust/conventions`, which refuses before the commit exists. A commit refused there costs a retyped command; a commit refused only on the pull request costs a rewritten, force-pushed branch, which the family allows only on the owner's word.
- In CI on the pull request, over the pull request's commits, as the backstop for a commit made where the hook was not installed. In an instance it runs in the reusable instance workflow beside the instance checks; in a family repository with no model of its own it runs in the conventions reusable job, which calls `companygraph commits` through `npx` at a meta-model tag the job names, so a member in Java or with no `package.json` needs nothing of its own.

## The governing instance

A commit is checked against the instance that governs its repository. In an instance, that is the instance itself. In a family repository with no model of its own — `robertblust/design`, the sites, the servers — it is the instance of its organization, `robertblust/mental-model` for `robertblust/*`, `companygraph/mental-model` for `companygraph/*` and `guestgraph/mental-model` for `guestgraph/*`. Outside the family, a repository with no instance has nothing to govern it, and the command says so and checks nothing.

## The report

`companygraph seats [<folder>] [--since <date>] [--json]` reads the history and lists, for each seat, the commits it authored, broken down by process, phase and track, with the owner's commits in a row of their own and every other author as outside the model. It is not a check and changes nothing.

Where it looks is decided by what it finds, in this order:

1. If the folder is not inside a git repository, the command says that the model has no history to report on, and exits non-zero, as every subcommand does on a problem.
2. If the repository vendors the family's conventions — it has a `conventions.json` and a `conventions/REPOSITORIES.md` — the report covers every member the table lists, read from the `Local path` column. A member whose clone is not on this disk is named as not read, and the report goes on without it; it never clones.
3. Otherwise it covers the current repository alone.

The report says which of the three it did, and from what date: commits made before the rule are authored by the person, the command cannot tell which seat made them, and it reports them as the owner's without claiming otherwise. `--since` defaults to the date the hook's release is tagged, which the command carries as a constant.

`--json` writes the same report for a build to read. The /team/ page may later show a section generated from it at build time; that is its own change, made once the command's output has shown what is worth showing, and is not part of this one.

## What changes where

`robertblust/conventions`: `WORKING.md` under Branches and commits drops "The author of the commit is the person" and says instead that an agent's commit is authored by its seat as this page describes, the owner's by the person, with the trailers; the sentence saying a role invoked as a subagent never commits stays true of the conventions' own roles (writer, translator, editor, back-reader), whose commit the invoking session makes, now authored as the seat. The repository gains `conventions/hooks/commit-msg`, and `conventions-sync` sets `core.hooksPath` in the clone it runs in. The reusable check job runs `companygraph commits --range` over a pull request's commits in a member with no model, against its organization's instance. `WRITING.md`'s git register gains the three trailers in its order of lines. A release, and the family re-sync that carries it.

`companygraph/meta-model`: the two subcommands, the menu gaining them, the reusable instance workflow running `commits --range` on a pull request, and `verify/` fixtures that each fail — an author whose role is not in the phase's `executed-by`, a missing `Phase`, a track the process does not list, a folder outside git — beside a clean history that passes, so each refusal is shown able to fire before a zero is read. A release, and the three instances re-pinned to it.

The instances: nothing in the model changes. The owner sets up the aliases and verifies them on GitHub before the hook ships, since a commit authored at an unverified address shows on GitHub as a stranger's.

## What is not being done

- No commit made before the rule is rewritten. Rewriting published history would force-push every member.
- No `owner@` address and no change to the identity's name or email.
- No seat trailer; the author carries it.
- No /team/ section yet.
- No signing. An agent still signs nothing, and an author is not a signature.
- No cloning by the report; it reads what is on the disk.

## Parked for the owner

1. **Outside the family.** Whether `companygraph init` installs the hook in a new instance. Proposal: yes, as `init` already writes the instance workflow, with `--no-hook` to leave it out.
2. **Commits outside a process.** A re-pin, a re-sync or a release bump an agent makes is Delivery's Integrate, whose `executed-by` is the Controller, the Reviewer and the Owner, and the Controller writes nothing, so the check would refuse the agent. Proposal: the owner's commits stay the owner's, and an agent preparing one commits it as the Implementer under Implement, which is what the work is until the owner merges it.
3. **An agent under the owner's name.** Whether a Claude Code `PreToolUse` hook on `git commit` refuses a commit an agent makes without `--author`. Proposal: not now; the rule in `WORKING.md` and the report make the gap visible, and a hook written for one agent is a rule the others do not see.
