---
name: companygraph-consent
description: Record the terms a source's content is published under and the consent its use needs — find the terms, propose whether a consent is needed, take the one the operator states, and keep it as a sentence on the source every fact names. A step of companygraph-company and companygraph-profile, and a procedure of its own when a source is added later.
allowed-tools: Bash(*), Read, Write, Edit, Glob, Grep, WebFetch
---

# companygraph-consent

Every fact in the model names the source it is mastered in, and this records, on that source, what its content may be used for and who agreed to it. It runs for one source and one or more subjects: a company whose statements are drawn from the source, a person drawn from it, a document read from it. It runs as a step of `companygraph-company` and of `companygraph-profile`, and alone when a source is added to an instance later. It records what the operator decided and where the terms were found, and it gives no legal advice: whether a use is lawful is the operator's question to a person qualified to answer it, and the report says so in one line.

Read `<units>/core/source-schema.md` whole before writing to a source, where `<units>` is the folder `.companygraph/manifest.json` names under `units`. The schema is the contract for the file this writes to, and nothing here restates it.

## Procedure

1. **Name the source and the subjects.** The caller names them; when run alone, ask. The source is a file under `model/sources/`, existing or about to be written, and the subjects are each a company, a person or a document, named as the operator names them.

2. **The terms.** Find what the content is published under: a `LICENSE` beside a repository, a site's terms or legal page, a platform's user agreement, a document's own notice. Record which was found and its address, or that none was found. Name the uses the run makes of the content, and there are three: facts restated in the model's own words with the source named; text carried verbatim, a tagline, a mission line, a value statement; a file copied, an image or a document. Say for each use whether the terms found allow it. Where the terms are silent, or none were found, the operator judges, and the judgment is written down as theirs, never as the skill's.

3. **Is a consent needed?** Propose an answer the operator can override, from three defaults. A person drawn from any source: yes, the person's own, because a profile is personal data in a model that is published. A company drawn by an operator who is not the company: yes, the company's, because its statements are being held and republished elsewhere. A company modeling itself, or a person modeling themselves: no, and the step is one line in the report. The operator decides, and the decision is theirs whichever way it goes.

4. **Is it given?** Where a consent is needed, ask whether it has been given: by whom, in what capacity, on what date, and how, a mail, a signed letter, in person. Take what the operator states and infer nothing: a consent the operator cannot state is not given. A consent not given means the content that rested on it is not used; tell the caller which subjects are declined, so it writes nothing that rested on them, name them in the report, and propose the line for the instance's agent file that records the decision so the next run does not ask again.

5. **Write.** The source's `> [Description]` gains one sentence for the terms and one per consent given, in this one shape and no other, so that a later move of these records to a table is mechanical:

   ```text
   Published under <terms>, read on <Month D, YYYY>. <Who>, <capacity>, consented on <Month D, YYYY>, by <how>, to <what>.
   ```

   As written for a company's site: "Published under the site's terms, read on September 26, 2026. Jane Doe, its founder, consented on September 26, 2026, by mail, to its statements being held in this model." Where no terms were found, the first sentence reads "Published under no stated terms, read on <Month D, YYYY>." Where no consent was needed, there is no second sentence. Where the source does not exist yet, the caller writes it with these sentences in place; when run alone, write them into the existing file and change nothing else in it. The source is in the model, committed and versioned, so the record is kept the way every other fact is.

## Report

The source, by H1; the terms found and their address, or that none were; each use and whether the terms allow it, with the operator's judgment marked as theirs where the terms were silent; each subject, whether a consent was needed, and whether it was given, with the sentence written; each subject declined and the agent-file line proposed for it; and the one line that this is a record of decisions and not legal advice. Nothing is committed.
