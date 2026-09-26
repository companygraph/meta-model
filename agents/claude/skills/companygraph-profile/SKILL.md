---
name: companygraph-profile
description: Create a profile, or extend one, from a folder of the person's documents — CVs, diplomas, certificates, reference letters — reusing the model's skills, levels, kinds and roles and creating only what is missing. A procedure, because what a period evidences and what level a claim earns are judgments no script makes.
allowed-tools: Bash(*), Read, Write, Edit, Glob, Grep
---

# companygraph-profile

A person arrives as a folder of documents and leaves as a profile the model can hold: the profile, the experiences it owns, and every skill, proficiency level, experience kind and role those name. Most of that is judgment — which skills a period shows, what level a claim has earned, which seats the person holds — so this is a procedure, and the operator is asked wherever the answer is theirs. What a machine settles is a shell command below.

Every type's schema is the contract and nothing here restates it. Read `<units>/core/CONVENTIONS.md` whole, and a type's schema whole before writing an entity of it: its frontmatter table, its sections table and its writing rules. `<units>` is the folder `.companygraph/manifest.json` names under `units`. Read the instance's own agent file as well, because an instance may decide what core leaves open: which documents are cited and which are only read, which facts stay out of the model, how a skill file is written.

## Procedure

1. **Create or Update.** Ask which. Create is a person the model does not hold yet. Update is a person it holds: list the folders under `model/profiles/`, read the H1 of each one's own file, and let the operator pick one.

2. **The folder.** Ask for it. On macOS with a GUI, offer a native picker:

   ```bash
   osascript -e 'POSIX path of (choose folder with prompt "Select the folder with this person'\''s documents")'
   ```

   Where that is unavailable, or the operator prefers, ask for the absolute path. Walk the folder with its subfolders, `find <folder> -type f`, and list what was found before reading any of it.

3. **Read every document.** PDF, image, text, Markdown and CSV go through the Read tool; an image is a scan, so read it as a document. Read a PDF whole: a page range needs poppler, which a machine may not have. A folder often holds the same documents twice, once one by one and once bound into a single file for sending; compare page counts first, read the bound file to confirm it adds nothing, and extract each fact once. For `.doc` and `.docx`, use `textutil -convert txt -stdout <file>` on macOS and `pandoc -t plain <file>` elsewhere; where neither exists, say which files went unread rather than skipping them silently. A document in another language is read in its own language and written in English (R14).

   Take out only what a schema has a place for: the person's name, contact address and location; every dated period with its organization and the part the person played; every qualification and certification; what each period shows the person doing; what each period achieved; why a period ended, where a document says. A birth date, a nationality, a marital status, a salary or a grade that no schema holds is not extracted, and not written down anywhere as a note either. Keep beside every fact the document it came from.

4. **Confirm the person (Update only).** Compare the person the documents describe with the chosen profile's H1. A different person, or a different name that is not a rename, is a stop: ask whether to create a new profile instead, and on no, write nothing.

5. **Reuse before creating.** Read the instance's agent file for facts the owner has decided to leave out of the model — a title progression, an organizational unit, a figure — and treat each as settled: a document stating one is not a reason to propose it again. List the H1s already in `model/skills/`, `model/proficiency-levels/`, `model/experience-kinds/`, `model/achievement-kinds/`, `model/roles/` and `model/sources/`. A fact that fits an existing entity is written against that entity by its H1, never under a second spelling. Present what would be created, one list per type, and let the operator strike or rename before anything is written.

6. **Terms and consent.** Run `companygraph-consent` for the source the profile will name, with the person as the subject and the documents as what is drawn from it. Where the person is the instance's owner modeling themselves, the answer is that no consent is needed, and the step is one line in the report. For any other person, a consent not given ends the run with nothing written, as a different person does in step 4.

7. **Write the vocabularies first**, because everything else names them, each against its own schema:
   - **Proficiency levels.** One ladder serves every claim. Where the model has none, propose one and let the operator settle it before any claim is written against it.
   - **Experience kinds.** One per sort of period the documents hold, each saying what `organization` means under it.
   - **Skills.** Person-neutral: no name, employer, date or number, so a second person can claim the file without a word changing. Where the instance's agent file has its own rules for a skill file, they hold too.
   - **Source.** Every entity names one in `source`. Use the instance's existing source where the model masters itself; create one only when the operator says the facts are mastered elsewhere.

8. **Write the experiences**, one per period, under `model/profiles/<profile>/experiences/`, named and dated as the experience schema says. Its writing rules are the ones most often broken by a document-first build, so hold each file to them: every skill in `skills:` shown in the tagline or an achievement; achievements as outcomes, grouped under achievement kinds where the instance defines them; a running period without `end` and a tagline that says so; a one-off with `end` equal to `start`. A document that gives only a year for something that ran for weeks or months — a course across a training series, say — would be written as a one-off known to its year, which it is not; ask the operator for the months, and where nobody knows them, say in the report that the dates read as a one-off. A document cited in `## References` is one a reader can open — a public page, a register entry, a recording. Whether a private document such as a reference letter or a diploma is cited, and how, is the instance's decision, read from its agent file; where the agent file says nothing, a private document is read and not cited, and the operator is told so.

9. **Write the profile.** `nature` is `human`. The Skills and Evidence tables are written together, row by row, and each Evidence row's `Experience` names a period whose `skills:` lists that row's skill; where it does not, stop and ask which is true — the skill belongs on the experience, or the row names another period. A certificate of attendance evidences a period and rarely a claim: `What it shows` names a thing the person did, and sitting a course is seldom that. A level is proposed from the rows under it and the rung's own definition, and the operator decides it. The tagline and `## Summary` are the person's own voice, so they are drafted and shown to the operator as drafts, never left as if the person wrote them. Seats in `roles:` are the operator's to name; a skill a seat requires that the documents do not evidence is left as a gap, never closed with an invented row.

10. **Update merges.** On Update, read the profile and every experience it owns before writing, and hold every extracted fact against them before proposing anything. Each fact is one of four things: already held, and where; new; held differently, with both versions quoted; or left out by a decision the agent file records. Show that reconciliation to the operator first, because on a model that is already rich most of a folder is already held, and what is worth the operator's time is the new and the different. Keep every sentence already written. Add new periods; where a document extends an existing period, add to its file rather than writing a second one. A new fact under a skill already claimed adds an Evidence row under the existing claim. A level the new evidence would change is proposed to the operator with the rows behind it, never rewritten on the way past.

11. **Validate.** Run the mechanical checks, `companygraph check`, or the checker at the release the instance's workflow names where the CLI is not installed; then run `companygraph-validate` for the writing rules no script reads. Repair what it finds, mechanical failures and writing-rule judgments both. Where a repair would change something the operator decided, ask instead.

## Report

What was created, one line per file; what was reused, by H1; every question the operator answered and the answer; every document that went unread and why; every fact left out because no schema holds it, named by kind and never by value; the gaps the validation pass reported. Where the operator declined a fact the documents state and the agent file does not yet record that decision, propose the line that would record it, so the next run does not ask again. Nothing is committed: the files are written and validated, and the commit is the operator's.
