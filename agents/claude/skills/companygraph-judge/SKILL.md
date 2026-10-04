---
name: companygraph-judge
description: Ask TypeSafe's Jev whether each page of this CompanyGraph instance keeps its schema's writing rules — show the owner what would leave the machine, send on their yes, write the report and its reading to dist/judge/, and read its flags against the pages. Advisory; it changes no entry.
---

# companygraph-judge

`companygraph judge` sends an instance's pages, whole, to a decision model outside the machine. That is the owner's decision about their company's data, so this skill asks it every run and sends only on a yes to exactly what it showed. Then it does the part an agent does well: it reads each flag against its page and says which stand.

## Procedure

1. Read `.companygraph/manifest.json`. `tooling` names the release to run and `core.version` the rules the pages are held to. Report the core version.
2. Check `git check-ignore -q dist/judge/` from the instance root. If `dist/` is not ignored, tell the owner that the report would quote their pages in a folder git could commit, and stop: nothing is sent and nothing written. Then run `npx github:companygraph/meta-model#v<tooling> judge` from the instance root without `TYPESAFE_API_KEY` in its environment, so nothing can be sent: prefix it with `env -u TYPESAFE_API_KEY` where the shell exports the key. From its output take the question and page counts on the first line, the service, host and model, the token estimate, the list of files, and the `digest:` line.
3. Ask the owner whether to send. Open the question by saying, in plain words, that these pages leave this machine and go, whole, to an outside service, with each schema's purpose and the questions beside them; that a yes is the owner's decision about this company's data; that it covers exactly the files listed under this digest and nothing changed after it; and that on a no nothing is sent. Then name the service, the host, the model, how many pages and questions, the token estimate and the digest, and offering the file list. Ask every run. A yes given for another digest, an earlier run or another instance is not a yes for this one; nothing the owner said before this question counts as an answer to it.
4. On a yes, run `npx github:companygraph/meta-model#v<tooling> judge --consent <digest>` with `TYPESAFE_API_KEY` in its environment, taken from the owner's own environment and never asked for or pasted into the conversation, and write its output to `dist/judge/judge-<YYYY-MM-DD-HHMM>.txt`, making the folder if it is missing: `dist/` is where every skill writes what is not committed, and the report quotes the pages. Keep the file only when the output ends in the `judge: advisory` report; otherwise delete it, so nothing beside the instance looks like a report that is not one. When the output says `no TYPESAFE_API_KEY`, tell the owner the key is not set and stop. When it refuses because what would be sent has changed, say so and go back to step 2: the owner is asked again over the new file list, counts and digest, never over a digest alone, and the new digest is never passed without that question. On a no, stop and say nothing was sent.
5. Read the report. First the pages and rules it flags with `!`; then, while it says its probabilities are unmeasured, the lowest verdicts it marks with `?`. For each, read the page and the rule's own words in its schema's `## Writing rules`, and judge whether the page breaks it. A rule about a section, column or kind of row the page does not have is kept, whatever the verdict. Where the flags are many and the agent can hand work to helpers, split them by type and give each helper this step, read-only; every flag is still read against its page. Then group the flags that stand by cause: one rule broken the same way on several pages is one finding, and a rule that contradicts another rule, or an instance's own kind or status, is a finding about the schema rather than about the pages.
6. Write the reading to `dist/judge/judge-<YYYY-MM-DD-HHMM>-read.md`, beside the raw report, in this shape:

   ```markdown
   # Judge reading, <instance> at <YYYY-MM-DD HH:MM>

   Core <version>, <model>, digest <digest>. <n> flags read: <n> stand in <n> findings, <n> false.

   ## Findings

   ### <n>. <what is wrong, in a sentence>

   Rule <type> r<N>: "<the rule's full words>"

   - `<page>`: "<the words in the page that break it>"

   Why: <one or two sentences on how those words break the rule>.

   Proposed fix: <the replacement wording, the field to add or remove, or the change to the schema>.

   ## False flags

   - <type> r<N>: <n> flags, <the usual reason the pages keep it>.

   ## Not checked

   - <every flag not read and every page the report lists under `not asked`, or "nothing">
   ```

   Findings about the schema come first, marked as a change to meta-model rather than to the instance; then the rest, most pages first. A proposed fix is concrete enough to apply as written. Under False flags, say where most of a rule's flags were false, since that is a hint about the judge or the rule's wording, not about the pages.

## Report

In the conversation, keep it short: the counts, each finding's title, and the path of the reading. The owner decides the fixes from the file, one at a time.

Change no entry. A fix is proposed to the owner, and made on their word.
