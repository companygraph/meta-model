# A yes tied to what was shown

`companygraph judge` sends an instance's pages to a decision model only on a yes typed at a terminal, and the code says on purpose that an answer piped in, by a script or an agent, never sends a page. So no agent can produce a judge report: the owner leaves the conversation, runs the command in a terminal, types the yes and brings the file back. This design lets the yes be given where the agent asks it, in its own conversation, and keeps what the terminal gate protects: the owner sees the service and every file before anything leaves the machine, and is asked every time. The yes is tied to a digest of exactly what would be sent, so it covers those bytes and nothing written after it. A new skill, `companygraph-judge`, runs the whole round: it asks, sends, writes the report and reads its flags.

Status: draft, written on October 4, 2026 against this repository at `75aba76` (package 0.76.0, core 0.56.0). It amends `2026-09-26-the-writing-rules-are-asked-design.md`, whose "What it does not do" says `judge` asks each time, names the service and has no setting that skips the question. All three still hold; what changes is who may carry the answer to the command.

## The gap

The validate skill already reads a judge report where one was printed for the commit, and the owner decided on October 3 that it should from the start. But the report only exists when the owner has run `judge` by hand, so in practice validate reads none, and the reading of the flags, which an agent does well, waits on a step only a person at a terminal can take. The terminal gate was there to keep an agent from deciding that a page leaves the machine. It also keeps the owner from deciding it in the place they are already working.

## The digest

The digest is the first sixteen hex characters of a SHA-256 over what a run would send: the whole endpoint, scheme, host and path, the judge's model, and every page's request in its wire shape, ordered by the page's path. The wire shape is `toWire`'s, so the page's file, its schema's purpose and every question asked of it are inside. A page edited, a rule changed by an upgrade, a page added or left out, another model named or another endpoint set all change the digest. The key is not part of it, so it is the same with and without one.

Every run that lists what it would send prints the digest under the list: the run without a key, which today prints only the questions, now also prints the files, the token estimate and the digest after them; the run with a key prints the digest above its `Send them?` prompt.

## Sending on a digest

`judge --consent <digest>` computes the digest again and, when it matches, sends without the prompt, from any shell, terminal or not. When it does not match, it says that what would be sent has changed since the consent was given, prints the new digest, sends nothing and exits 1. Without `--consent`, a run with no terminal does what it does today, with one more line naming `--consent` and the digest to give it.

Nothing else moves. The key comes only from `TYPESAFE_API_KEY`. There is no setting, file or environment variable that consents ahead of a run, so every send still follows a question asked about that content. The terminal prompt stays for a person who runs the command by hand. The test fake behind `COMPANYGRAPH_TYPESAFE_URL` keeps taking piped answers.

The 2026-09-26 spec's paragraph gains one sentence: the question may be asked by an agent in its own conversation, and the owner's answer carried to `judge` as the digest the agent showed them. The comment above the terminal check in `bin/companygraph.mjs` is rewritten to say the same.

## The skill

`companygraph-judge` sits beside the other tooling skills under `agents/claude/skills/`, written by `init`, hashed into the manifest and moved by `upgrade`. Its procedure:

1. Read `.companygraph/manifest.json` for `tooling` and the core version.
2. Run `npx github:companygraph/meta-model#v<tooling> judge` without the key, and report the number of questions and pages, the service, the model, the token estimate and the digest.
3. Ask the owner whether to send, naming all of that. The skill asks every run; it never assumes a yes and never carries one over from an earlier run or another digest.
4. On a yes, with `TYPESAFE_API_KEY` set, run `judge --consent <digest>` and write its output to `judge-<YYYY-MM-DD-HHMM>.txt` in the folder that holds the instance, outside the repository, so a report that quotes the pages is never committed. Without the key, say so and stop. On a refused digest, go back to step 2 and ask again over the new file list, counts and digest, never over a digest alone.
5. Read the report: the pages and rules it flags with `!` first, then, while it says its probabilities are unmeasured, the lowest verdicts it marks with `?`. For each, read the page and the rule and judge whether the flag stands.

The report to the owner lists the flags that stand, each with its rule, its file and one line of why, then the false flags, one line each, then **Not checked:** naming what was not read. The skill changes no entry: a fix is proposed to the owner and made on their word.

`companygraph-validate` step 4 then points at the skill: where `companygraph-judge` produced a report for this commit, it reads that report first, as it does today. Validate itself never sends.

## Where it lands

`bin/companygraph.mjs` (`judge`, the flag, the comment and the help line), `bin/judges/typesafe.mjs` if the digest belongs beside the wire shape, `agents/claude/skills/companygraph-judge/SKILL.md`, the validate skill's step 4, the skill lists in `README.md`, in `init`'s closing line and in the AGENTS.md text of `lib/instance-files.mjs`, and the 2026-09-26 spec's one sentence.

## Testing

In `verify/judge.test.mjs`, against the fake service: a matching digest sends with no terminal and no piped answer; a page changed after the digest was printed refuses and sends nothing; another model or endpoint refuses; a run with no terminal and no `--consent` sends nothing and names the flag; the run without a key prints the digest the run with one accepts. In `verify/cli.test.mjs`, `init` writes the new skill and hashes it, and the AGENTS.md text names it.

## Out of scope

Who may give the yes is not narrowed by instance: a private instance and a public one both take a digest, and an instance that must not leave the machine still does not run `judge`. Running the judge in a workflow stays out, for the reasons the 2026-09-26 spec gives. The judge's measuring and its band are untouched.

## Decisions

The owner chose on October 4, 2026: the yes moves into the agent's conversation, tied to what was shown, rather than an agent typing it into a pseudo-terminal; any instance may give it; the consent is a digest flag rather than a plan file or an environment variable; and the skill both produces the report and reads it.
