# The gate a repository runs

An instance reaches the second level when every change to it is checked before it lands, and today that has one form: `instance-check.yml` on GitHub, required by the default branch. A repository that never reaches GitHub has no gate at all. Its `check` runs when somebody remembers to run it, and the agent file `init` wrote for it says that CI checks it, which is not true there. This spec gives the second level a second route, the repository's own git hooks, and names a third case honestly: a folder with no git, which nothing can gate.

Status: decided by the owner on October 6, 2026: the gate is named by what does the gating, `github`, `git` or `none`, and the manifest records it; `github` stays the default and an absent field means it; `git` is for a repository without a remote and replaces the workflow rather than adding to it; the hooks run `check` and then the repository's own `verify` commands from `pins.json`, so a repository adds its checks to one list the resync already reads; `upgrade --gate` moves a repository from one gate to another.

## Where this comes from

An instance can hold what may not leave the machine it is written on: a model of an employer, kept under a contract's discretion, is the case that raised this. Such an instance is never pushed, so the workflow `init` writes never runs, and the checks the levels promise are whatever its owner remembers. The owner of one such instance wrote a `pre-commit` hook by hand that runs `check` and the repository's further checks, put it in a folder of its own beside the tooling's, and pointed `core.hooksPath` there, with a `commit-msg` that hands on to the tooling's seat check. It works, and it is machinery every such instance would write again, which is the reason it belongs here: the levels are the tooling's promise, and the tooling should keep it on every route it offers.

[The machinery outside the family](2026-10-01-the-machinery-outside-the-family-design.md) defines the levels and gives the third its form check and its pins. [A commit names its seat](2026-09-28-a-commit-names-its-seat-design.md) gives the seat hook. This spec changes neither; it adds a route to the second level and leaves the levels above it as they are.

## The gate a manifest names

The manifest gains `gate`, one of three values, each named for what does the gating:

| `gate` | What it writes | The level it reaches |
| --- | --- | --- |
| `github` | the workflow, at the release `tooling` names, and the seat hook | 2, once the default branch requires the workflow |
| `git` | the seat hook, `pre-commit` and `pre-merge-commit`, and no workflow | 2, on the machine the repository is on |
| `none` | no workflow and no hook | 1 |

An absent `gate` is `github`, so every manifest written before this release reads as it did, and `github` stays the default of `init` and `adopt`. `--gate <value>` on either chooses another.

`--gate git` sets `core.hooksPath` to `.companygraph/hooks` as `init` does today. In a folder that is not a git repository, `init` and `adopt` refuse it by name, because a git gate without git is a promise nothing keeps. Without `--gate`, a folder without git is written as today, the seat hook included, with the line that says to set `core.hooksPath` once the folder is a repository.

`--gate none` writes neither the workflow nor a hook and sets nothing in git, and `init` and `adopt` say what that means: nothing gates the folder, `check` runs when somebody runs it, and the Obsidian plugin runs the checks while a page is edited. It is the honest form of the first level, not a broken second.

The agent file `init` writes says which gate holds the repository: the workflow for `github`, the hooks on this machine for `git`, and a person running `check` for `none`. An agent file that claims a CI the repository does not have is the defect that started this.

## The hooks

`pre-commit` does five things in order:

1. It refuses when the working tree holds a change the commit leaves out, an unstaged edit or an untracked file git does not ignore, because the checks read the working tree, and a check of anything but what is being committed passes nothing.
2. It runs `check` at the release the manifest's `tooling` names, through `npx --prefer-offline`, as the seat hook already runs `commits`.
3. On an instance, it runs `ids --range` at the same release, so a commit is held to what a pull request's `ids --range` holds on the `github` gate: an id already landed does not change, a decision is not rewritten or removed, and a label is not moved or used again. The range starts where a pull request's would, at the merge base of `HEAD` with the default branch, the first of `init.defaultBranch`, `main` and `master` that is a branch in the repository; on the default branch itself, or where none is found, it starts at `HEAD`. On the default branch every commit counts as landed, so amending an id the last commit there introduced is refused, as it would be once that commit was pushed; on a feature branch an id the branch introduced can still be fixed. `ids` compares commits and not a working tree, so the hook writes the tree with `git write-tree`, makes it a commit on `HEAD` with `git commit-tree`, and ends the range at that commit. Nothing references the commit: `git fsck` shows it as dangling, and git's gc removes it once it is older than `gc.pruneExpire`, two weeks by default. The step runs only where `ids` has something to hold, a `model/` folder or the `core/CONVENTIONS.md` of the repository that makes core; a repository that took the machinery alone has neither, and `ids` would refuse every commit there as no instance. A first commit has no `HEAD` and nothing to compare, so the step is left out without a word.
4. It runs every command in `pins.json`'s `verify`, in order, from the repository's root.
5. It refuses the commit when any of them failed, and prints what the failing one said.

`pre-merge-commit` runs `pre-commit`. Git runs it for a merge it can make alone, and a merge with conflicts is finished with `git commit`, which runs `pre-commit` itself, so both ways a merge commit is made pass the same gate. Not every way onto a branch makes one: `git cherry-pick`, `git revert`, `git rebase` and `git am` write their commits without running `pre-commit`, and a fast-forward merge writes no commit at all, so what they bring is checked by the next commit that runs the gate, and not before it lands.

Each hook unsets the variables git hands a hook before `npx` clones the tooling, for the reason the seat hook gives: a clone that inherits `GIT_INDEX_FILE` writes its own index over the repository's. `pre-commit` writes the tree for `ids` before it unsets them, because that variable is also how git hands the hook what is being committed: `git commit -a` and a commit in a linked worktree each pass an index of their own, and a tree written after the unset would be the repository's index on disk and not the commit's.

A gate hook is not in `files` and is held to no hash, and `upgrade` never replaces one while it is edited: an edited hook is the repository's own, and `upgrade` leaves it and says so. A hook whose text is a release's own, this release's or one an earlier release wrote, is the tooling's, and `upgrade` brings it to the current release; that is how a repository on the `git` gate takes a new step such as `ids`. A hook set back to a past release's exact text is the tooling's again, and `upgrade` brings it forward, so a repository that wants a step gone edits the hook rather than restoring an old text. The release and the commands are read at run time, from the manifest and from `pins.json`, so only a step the hook itself runs needs its text to move, and a hook the repository deleted is not written back by a plain upgrade. `git commit --no-verify` skips it, which is git's own and cannot be taken away; the agent file `init` writes says it is not used.

## Checks of the repository's own

`pins.json`'s `verify` already lists the commands that tell whether a repository still holds after its pins moved, and the resync runs them. The `git` gate runs the same list on every commit, so a repository writes its own checks once and both readers hold it to them: a test suite, a prose check, a form check of a family's own. A `verify` whose commands are slow makes every commit slow, and that is the repository's to weigh; the gate does not shorten the list.

A repository without `pins.json`, or whose `pins.json` has no `verify`, runs `check` alone.

## Moving from one gate to another

`upgrade --gate <value>` moves a repository, an instance or an adopted one, and records the new value in the manifest:

| From → to | What `upgrade` does |
| --- | --- |
| `github` → `git` | writes `pre-commit` and `pre-merge-commit`, removes the workflow |
| `git` → `github` | writes the workflow, removes the two gate hooks |
| any → `none` | removes the workflow and the two gate hooks; the seat hook stays, since the folder may still be a repository |
| `none` → `git` or `github` | writes what the table above names, and the seat hook where there is none |

The workflow is the tooling's, since `upgrade` already moves its tag, so removing it is the tooling's to do, and the report names it. A gate hook is the tooling's while its text is a release's own, so `upgrade` removes one only while it is; an edited hook stops the move with its name, and `--force` removes it anyway and says so. `upgrade` without `--gate` keeps the gate the manifest names.

A repository that keeps hooks of its own, with `core.hooksPath` pointing at a folder that is not `.companygraph/hooks`, is left as it is: `upgrade` says the tooling's hooks are not in use there, as `init` says of the seat hook today, and changes no git setting.

## What the git gate does not hold

The workflow runs `commits --range` over a pull request, which judges every commit's seat, and the hooks do not repeat it. The seat hook already judges each commit's message as it is made, so on the `git` gate a range of them has nothing left to judge that the hook did not, except where the hook could not run, which the next paragraph names.

The seat hook also lets a commit through when its own check cannot run, offline or without `npx`, and says that the pull request's check will run it. On the `git` gate there is no pull request, so that commit's seat is judged by nobody. The hook's text stays as it is, because it is the repository's own once written and is the same text on every gate; the gap is named here so that a repository choosing `git` knows it.

## Tests

`plan.test.mjs`: for each value of `--gate`, `init` and `adopt` write exactly the files the first table names; an absent `gate` reads as `github`; `--gate git` in a folder without git is refused.

A new `gate.test.mjs` runs the hooks in a temporary git repository with `npx` replaced by a stub that answers pass or fail, as `commits.test.mjs` stubs the seat check: an unstaged change and an untracked file are refused; a failing `check` and a failing `verify` command are refused, each with its output; a clean commit passes; a merge is gated by `pre-merge-commit`. The stub answers `ids` too: it is given a range ending in a commit whose tree is what is staged, under `git commit -a`, in a linked worktree and through `pre-merge-commit` as well, starting at `HEAD` on the default branch and at the merge base on another, with `master` taken where there is no `main` and no `init.defaultBranch`, and `main` where `init.defaultBranch` names no branch; a refusing `ids` refuses the commit with its output; a first commit and a repository with no model do not run it. Every exit code is read on its own, never through a pipe.

`plan.test.mjs` also holds the past text to the hash of the text v0.83.0 shipped; a move removes a hook in it without `--force`; and, staying on the `git` gate, both upgrade plans replace it with the current text, leave an edited hook and name it, and write no hook that is missing.

`cli.test.mjs`: `upgrade --gate` moves a repository each way the table names; an edited gate hook stops the move, and `--force` takes it. An instance whose `pre-commit` holds v0.83.0's text holds the current text after a plain `upgrade`, and an edited one is left and named. `--dry-run` names an edited one too. An adopted repository on the `git` gate commits a second time, and `adopt` does not say `ids` runs there. On a feature branch an id the branch introduced is fixed, and on `main` an id already landed is refused. With the real CLI and no network, an instance `init --gate git` wrote refuses a commit that changes an entity's id, naming it, and takes a commit that leaves ids alone.

## Release

A minor release of the package; core does not change, so `core/manifest.json` stays where it is. The README describes `--gate` beside `init`, `adopt` and `upgrade`, and the menu offers it under `init` and `adopt`.

companygraph.io changes with it, in a pull request of its own linked to this one: the `/cli/` page, which restates the commands, and the levels talk, whose second level names both routes, the workflow on GitHub and the hooks in git.

## Not part of this

`PINS.md` in `robertblust/conventions` defines `verify` for the resync and does not yet say that a gate reads it too. That is a change to the family's conventions, and the second phase of the machinery outside the family is where it belongs.

A gate in an editor. The Obsidian plugin runs the checks while a page is edited, and stays the only check a folder with `gate: none` has.

Moving any existing repository onto the `git` gate. That is each repository's own change after this release: `upgrade --gate git`, its further checks into `verify`, and hooks it wrote by hand removed.
