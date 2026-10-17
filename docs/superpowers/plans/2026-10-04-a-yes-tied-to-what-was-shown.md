# A yes tied to what was shown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `companygraph judge --consent <digest>` sends without a terminal when the digest of what would be sent still matches, and a new tooling skill, `companygraph-judge`, asks the owner, sends, writes the report and reads its flags.

**Architecture:** The digest is a pure function beside the wire shape in `bin/judges/typesafe.mjs`, over the endpoint's host, the model and every page's `toWire` request sorted by path. `judge` in `bin/companygraph.mjs` prints it on every run that lists the files, and checks `--consent` against it before the terminal gate. The skill is one Markdown file under `agents/claude/skills/`, which `init` and `upgrade` already ship with no code change.

**Tech Stack:** Node (ES modules, JSDoc types built into `types/` by `npm run build`), `node:test`, `node:crypto`.

**Spec:** `docs/superpowers/specs/2026-10-04-a-yes-tied-to-what-was-shown-design.md`

## Global Constraints

- The digest is the first sixteen hex characters of a SHA-256 over the endpoint's host, the judge's model, and every page's request in its wire shape, ordered by the page's path. The key is not part of it.
- Every run that lists what it would send prints the digest under the list, the keyless run included.
- `judge --consent <digest>` sends without the prompt from any shell when the digest matches; when it does not, it names the change, prints the new digest, sends nothing and exits 1.
- Without `--consent`, a run with no terminal against TypeSafe itself sends nothing, as today, and adds one line naming `--consent` and the digest.
- The key comes only from `TYPESAFE_API_KEY`. No setting, file or environment variable consents ahead of a run. The terminal prompt stays. `COMPANYGRAPH_TYPESAFE_URL` keeps taking piped answers.
- The skill asks every run, never assumes a yes, never carries one over; it writes the report to `judge-<YYYY-MM-DD-HHMM>.txt` in the folder that holds the instance; it changes no entry.
- No test ever sends to TypeSafe itself: every keyed test sets `COMPANYGRAPH_TYPESAFE_URL` to the fake service.
- Commits: author `Implementer <implementer@companygraph.io>`, trailers `Process: Delivery`, `Phase: Implement`, `Track: Code`, then `Co-Authored-By`; the body is prose ending in a `Verified:` line naming what ran. Check `git log -1 --format='[%s]'` shows the subject alone after each commit.

## Review Focus

- A digest pasted with a stray space or in capitals, as a person copying it would: it is still the same consent and sends. Pinned in Task 1.
- `--consent` given with no value: the run refuses with `--consent needs a value` and sends nothing, rather than reading the folder argument as the digest. Pinned in Task 1.
- The same instance asked twice with nothing changed gives the same digest, whatever order the pages are read in. Pinned in Task 1 (unit test over a reversed list).
- A consent given against the fake service and then used against another endpoint refuses: a yes covers the place the pages go, not only the pages. Pinned in Task 1.
- `--consent` with no key: nothing is sent and the run says there is no key, exit 0 as the keyless run is today; the skill then says so and stops. Pinned in Task 1.

---

### Task 1: The digest and `judge --consent`

**Files:**

- Modify: `bin/judges/typesafe.mjs` (add `digestOf` after `toWire`)
- Modify: `bin/companygraph.mjs` (the `Flags` typedef near line 58, `USAGE` near line 72, `judge` at lines 872–937)
- Modify: `README.md:123` (the `judge` paragraph)
- Modify: `docs/superpowers/specs/2026-09-26-the-writing-rules-are-asked-design.md:43` (one sentence)
- Modify: `types/bin/judges/typesafe.d.mts` (written by `npm run build`, never by hand)
- Test: `verify/judge.test.mjs`

**Interfaces:**

- Consumes: `toWire(request)`, `endpoint()`, `SERVICE` from `bin/judges/typesafe.mjs`; `Request` from `lib/questions.mjs`.
- Produces: `digestOf(requests: Request[], at?: { host?: string; model?: string }): string`, sixteen lowercase hex characters. The CLI line `digest: <16 hex>` on every run that lists files, and the flag `--consent <digest>`. Task 2's skill reads the `digest: ` line and passes the flag.

- [ ] **Step 1: Write the failing unit tests for `digestOf`**

In `verify/judge.test.mjs`, change the import on line 12 to:

```js
import { SERVICE, toWire, fromWire, ask, KeyRefused, REQUEST_BUDGET, digestOf } from "../bin/judges/typesafe.mjs";
```

and add after the test "the answers come back in the module's own shape, and a missing one is refused":

```js
test("the digest covers what would be sent and nothing else: the place, the model and every page's request", () => {
  const other = { ...request, path: "b.md", state: { purpose: "P.", entity: "# B\n" } };
  const at = { host: "api.example", model: "jev-x" };
  const d = digestOf([request, other], at);
  assert.match(d, /^[0-9a-f]{16}$/);
  assert.equal(digestOf([other, request], at), d, "the order pages are read in does not move it");
  assert.notEqual(digestOf([request, { ...other, state: { ...other.state, entity: "# B\nedited\n" } }], at), d, "an edited page moves it");
  assert.notEqual(digestOf([request, { ...other, questions: [{ id: "r1", kind: "rule", rule: "Another rule." }] }], at), d, "a changed rule moves it");
  assert.notEqual(digestOf([request], at), d, "a page left out moves it");
  assert.notEqual(digestOf([request, other], { ...at, host: "elsewhere.example" }), d, "another place moves it");
  assert.notEqual(digestOf([request, other], { ...at, model: "jev-y" }), d, "another model moves it");
});
```

- [ ] **Step 2: Run it to see it fail**

Run `node --test --test-name-pattern="the digest covers" verify/judge.test.mjs`. Expected: FAIL, `digestOf` is not exported (SyntaxError on the import).

- [ ] **Step 3: Write `digestOf`**

In `bin/judges/typesafe.mjs`, add at the top, below the `@import` line:

```js
import { createHash } from "node:crypto";
```

and after `toWire`:

```js
// What a yes given away from a terminal covers: the place the pages go, the model that reads
// them, and every request in the shape it leaves in, so an edited page, an upgraded rule or
// another endpoint is another question to ask. Sorted by path, so the order the pages were read
// in does not move it; the key is not in it, so a run without one shows the digest a run with
// one checks.
/**
 * @param {Request[]} requests
 * @param {{ host?: string; model?: string }} [at]
 * @returns {string}
 */
export function digestOf(requests, { host = endpoint().host, model = SERVICE.model } = {}) {
  const sorted = [...requests].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const wire = sorted.map((r) => ({ path: r.path, ...toWire(r), model }));
  return createHash("sha256").update(JSON.stringify({ host, model, wire })).digest("hex").slice(0, 16);
}
```

- [ ] **Step 4: Run it to see it pass**

Run `node --test --test-name-pattern="the digest covers" verify/judge.test.mjs`. Expected: PASS.

- [ ] **Step 5: Write the failing CLI tests**

In `verify/judge.test.mjs`, replace the `judge` helper (lines 82–90) so it takes arguments:

```js
const judge = (root, { input = "", env, args = [] }) => new Promise((done, fail) => {
  const child = spawn(process.execPath, [cli, "judge", root, ...args], { env });
  let out = "", err = "";
  child.stdout.on("data", (d) => (out += d));
  child.stderr.on("data", (d) => (err += d));
  child.on("error", fail);
  child.on("close", (code) => done({ code, out, err }));
  child.stdin.end(input);
});
const digestIn = (out) => out.match(/^digest: ([0-9a-f]{16})$/m)?.[1];
```

In the test "with no key, judge prints the questions and sends nothing", add before its last assertion:

```js
  assert.match(out, /^This would send these files of model\/, whole, with the purposes of their schemas, to TypeSafe \(api\.typesafe\.ai, jev-1\.13\.0\), about \d+ tokens in all:$/m);
  assert.match(out, /^ {2}model\/identity\.md$/m);
  assert.ok(digestIn(out), "the keyless run prints the digest");
```

In the test "a send to TypeSafe itself takes a yes typed at a terminal, never a piped one", add at its end:

```js
  assert.match(out, new RegExp(`^An agent that asked the owner passes their yes as --consent ${digestIn(out)}\\.$`, "m"));
```

Then add after that test:

```js
test("the digest a run without a key prints is the one a run with a key accepts, and it sends with no terminal and no typed yes", async () => {
  const fake = await service();
  try {
    const root = fresh();
    const env = { ...withoutKey(), COMPANYGRAPH_TYPESAFE_URL: fake.url };
    const shown = digestIn((await judge(root, { env })).out);
    assert.ok(shown);
    const { code, out } = await judge(root, { args: ["--consent", shown], env: { ...env, TYPESAFE_API_KEY: "sk-secret" } });
    assert.equal(code, 0, out);
    assert.ok(fake.seen.length > 0);
    assert.match(out, /^judge: advisory/m);
    assert.doesNotMatch(out, /Send them\?/);
  } finally {
    fake.close();
  }
});

test("a digest copied with a space or in capitals is the same consent", async () => {
  const fake = await service();
  try {
    const root = fresh();
    const env = { ...withoutKey(), COMPANYGRAPH_TYPESAFE_URL: fake.url, TYPESAFE_API_KEY: "sk-secret" };
    const shown = digestIn((await judge(root, { env })).out);
    const { code, out } = await judge(root, { args: ["--consent", ` ${shown.toUpperCase()} `], env });
    assert.equal(code, 0, out);
    assert.ok(fake.seen.length > 0);
  } finally {
    fake.close();
  }
});

test("a page edited after the digest was shown refuses, names the new digest and sends nothing", async () => {
  const fake = await service();
  try {
    const root = fresh();
    const env = { ...withoutKey(), COMPANYGRAPH_TYPESAFE_URL: fake.url, TYPESAFE_API_KEY: "sk-secret" };
    const shown = digestIn((await judge(root, { env })).out);
    const page = path.join(root, "model", "identity.md");
    fs.appendFileSync(page, "\nOne more line.\n");
    const { code, out, err } = await judge(root, { args: ["--consent", shown], env });
    assert.equal(code, 1);
    const now = digestIn(out);
    assert.ok(now && now !== shown);
    assert.match(err, new RegExp(`^What would be sent has changed since the consent for ${shown}: its digest is now ${now}\\. Nothing was sent\\.$`, "m"));
    assert.equal(fake.seen.length, 0);
    assert.doesNotMatch(out, /judge: advisory/);
  } finally {
    fake.close();
  }
});

test("a consent given for one endpoint does not send to another", async () => {
  const one = await service();
  const two = await service();
  try {
    const root = fresh();
    const shown = digestIn((await judge(root, { env: { ...withoutKey(), COMPANYGRAPH_TYPESAFE_URL: one.url } })).out);
    const { code } = await judge(root, { args: ["--consent", shown], env: { ...withoutKey(), COMPANYGRAPH_TYPESAFE_URL: two.url, TYPESAFE_API_KEY: "sk-secret" } });
    assert.equal(code, 1);
    assert.equal(one.seen.length + two.seen.length, 0);
  } finally {
    one.close();
    two.close();
  }
});

test("--consent with no value refuses before anything is read, and with no key nothing is sent", async () => {
  const bare = await judge(fresh(), { args: ["--consent"], env: withoutKey() });
  assert.equal(bare.code, 1);
  assert.match(bare.err, /--consent needs a value/);
  const root = fresh();
  const shown = digestIn((await judge(root, { env: withoutKey() })).out);
  const keyless = await judge(root, { args: ["--consent", shown], env: withoutKey() });
  assert.equal(keyless.code, 0);
  assert.match(keyless.out, /no TYPESAFE_API_KEY: nothing was sent/);
});
```

- [ ] **Step 6: Run them to see them fail**

Run `node --test verify/judge.test.mjs`. Expected: FAIL on the keyless test (no `This would send` line), the terminal test (no `--consent` line) and the five new tests; every other test still passes.

- [ ] **Step 7: Change `judge`**

In `bin/companygraph.mjs`, add `consent?: string;` to the `Flags` typedef's last line, so it reads `from?: string; range?: string; message?: string; since?: string; consent?: string;`. In `USAGE`, add after the `form: --fix` line:

```
judge: --consent <digest>
```

Replace the body of `judge` from `const root = …` to the end of the function with:

```js
  const options = flags(argv);
  const root = resolve(options._[0] ?? ".");
  const { instanceAt } = await import("../lib/history.mjs");
  const { questionsOf, reportOf, leftOutOf } = await import("../lib/questions.mjs");
  const judges = await import("./judges/typesafe.mjs");
  const instance = instanceAt(root);
  const questions = questionsOf(instance);
  const count = questions.asked.reduce((n, r) => n + r.questions.length, 0);
  console.log(`judge: ${count} questions about ${questions.asked.length} pages of ${root}, from the writing rules of its vendored core ${instance.core ?? "at an unnamed version"}`);
  const key = process.env.TYPESAFE_API_KEY;
  const digest = judges.digestOf(questions.asked);
  const size = questions.asked.reduce((n, r) => n + JSON.stringify(judges.toWire(r)).length, 0);
  /** @param {string} verb */
  const files = (verb) => {
    console.log(`\n${verb} these files of model/, whole, with the purposes of their schemas, to ${judges.SERVICE.name} (${judges.endpoint().host}, ${judges.SERVICE.model}), about ${Math.ceil(size / 4)} tokens in all:`);
    for (const r of questions.asked) console.log(`  model/${r.path}`);
    console.log(`digest: ${digest}`);
  };
  if (!key) {
    for (const r of questions.asked) {
      console.log(`\nmodel/${r.path}`);
      for (const q of r.questions)
        console.log(`  ${q.id}  ${q.kind === "rule" ? q.rule : `"${q.bullet}": one of ${Object.keys(q.options).join(", ")}`}`);
    }
    const left = leftOutOf(questions.skipped);
    if (left.length) console.log("\nleft out, for want of what they are about:\n" + left.join("\n"));
    files("This would send");
    console.log(`\nno TYPESAFE_API_KEY: nothing was sent. These are the questions a run with the key would send to ${judges.SERVICE.name}.`);
    return 0;
  }
  files("This sends");
  // The spec asks for a question every run and no setting that skips it. At a terminal the person
  // answers it there. Away from one, an agent may ask it in its own conversation and carry the
  // owner's yes here as the digest it showed them, which covers exactly these bytes, this model
  // and this endpoint; anything else piped in never sends a page to TypeSafe itself. Piped answers
  // count only where the tests point the tool at a fake service.
  if (options.consent !== undefined) {
    const given = options.consent.trim().toLowerCase();
    if (given !== digest) {
      console.error(`What would be sent has changed since the consent for ${given}: its digest is now ${digest}. Nothing was sent.`);
      return 1;
    }
  } else if (judges.isTypeSafe() && !process.stdin.isTTY) {
    console.log(`${judges.SERVICE.name} sends only on a yes typed at a terminal, and this is not one. Nothing was sent.`);
    console.log(`An agent that asked the owner passes their yes as --consent ${digest}.`);
    return 0;
  } else if (!yes(await ask(prompt("Send them?", "y/N")))) {
    console.log("Nothing was sent.");
    return 0;
  }
```

and keep the rest of the function, from `/** @type {Map<string, …` to its closing `return 0;`, as it is. Delete the old comment block "The spec asks for a typed yes and no setting that skips it…" that the new comment replaces.

- [ ] **Step 8: Run the tests to see them pass**

Run `node --test verify/judge.test.mjs`. Expected: PASS, every test.

- [ ] **Step 9: Build the declarations and say it in the README and the earlier spec**

Run: `npm run build` (writes `types/bin/judges/typesafe.d.mts` with `digestOf`).

In `README.md:123`, replace the sentence "with one it names the service and every file it would send, and sends only on a yes typed at a terminal, never one piped in, so an instance whose pages must not leave the machine does not run it." with:

```
with one it names the service and every file it would send, with a digest of all of it, and sends only on a yes typed at a terminal or on `--consent <digest>`, the owner's yes carried by an agent that showed them that digest, which refuses once anything sent would differ; nothing piped in sends, so an instance whose pages must not leave the machine does not run it.
```

In `docs/superpowers/specs/2026-09-26-the-writing-rules-are-asked-design.md:43`, append to the paragraph, after "does not run it.":

```
Amended on October 4, 2026 by `2026-10-04-a-yes-tied-to-what-was-shown-design.md`: the question may be asked by an agent in its own conversation, and the owner's answer carried to `judge` as `--consent` with the digest the agent showed them.
```

- [ ] **Step 10: Run the whole suite**

Run `export PATH="/opt/homebrew/bin:$PATH"; npm run verify && npm run build:check && for s in $(node -e 'console.log(Object.keys(require("./package.json").scripts).filter(k=>k.startsWith("test:")).join(" "))'); do npm run -s $s || exit 1; done && sh conventions/conventions-format check && sh conventions/conventions-check`. Expected: every step passes.

- [ ] **Step 11: Commit**

```bash
git add bin/judges/typesafe.mjs bin/companygraph.mjs types/bin/judges/typesafe.d.mts verify/judge.test.mjs README.md docs/superpowers/specs/2026-09-26-the-writing-rules-are-asked-design.md
git commit --author "Implementer <implementer@companygraph.io>" -F msg.txt
```

with `msg.txt` (written outside the repository) reading:

```
judge sends on a consent tied to a digest of what it sends

An agent could not produce a judge report, because judge sends only on a yes typed at a terminal. Every run that lists the files now prints a digest of what would leave the machine: the endpoint's host, the model and every page's request in its wire shape, sorted by path. judge --consent <digest> sends without the prompt when it still matches and refuses, naming the new digest, when anything would differ. The terminal prompt stays, and nothing consents ahead of a run.

Verified: <the commands of Step 10 as they ran, and that they passed>.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
```

### Task 2: The `companygraph-judge` skill

**Files:**

- Create: `agents/claude/skills/companygraph-judge/SKILL.md`
- Modify: `agents/claude/skills/companygraph-validate/SKILL.md:30-33` (step 4's sentence on the report)
- Modify: `bin/companygraph.mjs:390` (init's closing line)
- Modify: `lib/instance-files.mjs:291` (the AGENTS.md text)
- Modify: `README.md:115` (if it lists the skills; read the line first)
- Test: `verify/cli.test.mjs:857-871`

**Interfaces:**

- Consumes: the `digest: <16 hex>` line and `--consent <digest>` from Task 1.
- Produces: the skill name `companygraph-judge`, which validate's step 4 names.

- [ ] **Step 1: Write the failing test**

In `verify/cli.test.mjs`, change line 857 to:

```js
const SKILL_NAMES = ["companygraph-company", "companygraph-consent", "companygraph-export", "companygraph-judge", "companygraph-profile", "companygraph-surface", "companygraph-validate"];
```

change line 868 to:

```js
  assert.match(said, /-company, -consent and -judge/);
```

and add after line 871:

```js
  assert.ok(agents.includes("`companygraph-judge`"), "AGENTS.md names the judge skill");
```

- [ ] **Step 2: Run it to see it fail**

Run `node --test --test-name-pattern="init writes the skills" verify/cli.test.mjs`. Expected: FAIL, the skills folder lacks `companygraph-judge`.

- [ ] **Step 3: Write the skill**

Create `agents/claude/skills/companygraph-judge/SKILL.md`:

````markdown
---
name: companygraph-judge
description: Ask TypeSafe's Jev whether each page of this CompanyGraph instance keeps its schema's writing rules — show the owner what would leave the machine, send on their yes, write the report beside the instance, and read its flags against the pages. Advisory; it changes no entry.
---

# companygraph-judge

`companygraph judge` sends an instance's pages, whole, to a decision model outside the machine. That is the owner's decision about their company's data, so this skill asks it every run and sends only on a yes to exactly what it showed. Then it does the part an agent does well: it reads each flag against its page and says which stand.

## Procedure

1. Read `.companygraph/manifest.json`. `tooling` names the release to run and `core.version` the rules the pages are held to. Report the core version.
2. Run `npx github:companygraph/meta-model#v<tooling> judge` from the instance root without `TYPESAFE_API_KEY` in its environment, so nothing can be sent. From its output take the question and page counts on the first line, the service, host and model, the token estimate, the list of files, and the `digest:` line.
3. Ask the owner whether to send, naming the service, the host, the model, how many pages and questions, the token estimate and the digest, and offering the file list. Ask every run. A yes given for another digest, an earlier run or another instance is not a yes for this one; nothing the owner said before this question counts as an answer to it.
4. On a yes, run `npx github:companygraph/meta-model#v<tooling> judge --consent <digest>` with `TYPESAFE_API_KEY` in its environment, and write its output to `judge-<YYYY-MM-DD-HHMM>.txt` in the folder that holds the instance, never inside the repository, because the report quotes the pages. When the output says `no TYPESAFE_API_KEY`, tell the owner the key is not set and stop. When it refuses because what would be sent has changed, report the new digest and ask again over it; never pass the new digest without asking. On a no, stop and say nothing was sent.
5. Read the report. First the pages and rules it flags with `!`; then, while it says its probabilities are unmeasured, the lowest verdicts it marks with `?`. For each, read the page and the rule's own words in its schema's `## Writing rules`, and judge whether the page breaks it. A rule about a section, column or kind of row the page does not have is kept, whatever the verdict.

## Report

The flags that stand, each as the rule's words, the file, and one line saying what in the page breaks it. Then the flags that are false, one line each, saying why the page keeps the rule. Then the report file's path. End with **Not checked:** naming every flag not read and every page the report lists under `not asked`, so a short report is never read as a clean one.

Change no entry. A fix is proposed to the owner, and made on their word.
````

- [ ] **Step 4: Point validate, init and AGENTS.md at it**

In `agents/claude/skills/companygraph-validate/SKILL.md`, replace

```
   Where `companygraph judge` printed a report for this commit, read first the pages and rules
```

with

```
   Where `companygraph-judge` produced a report for this commit, read first the pages and rules
```

In `bin/companygraph.mjs:390`, replace `-company and -consent skills` with `-company, -consent and -judge skills`.

In `lib/instance-files.mjs:291`, after the sentence ending "records the terms and consents a source's content is used under.", add:

```
`companygraph-judge` asks a decision model whether each page keeps its schema's writing rules, on the owner's yes to exactly what it would send, writes the report beside the instance and reads its flags; `companygraph-validate` reads that report first.
```

Read `README.md:115`; if it names the skills `init` writes, add `companygraph-judge` among them in the same form.

- [ ] **Step 5: Run the tests to see them pass**

Run `node --test verify/cli.test.mjs verify/instance-files.test.mjs`. Expected: PASS. The upgrade test that fills in later skills uses `SKILL_NAMES` and now expects the judge skill too, which `upgrade` writes with no code change.

- [ ] **Step 6: Run the whole suite**

Run the command of Task 1 Step 10. Expected: every step passes.

- [ ] **Step 7: Commit**

```bash
git add agents/claude/skills/companygraph-judge/SKILL.md agents/claude/skills/companygraph-validate/SKILL.md bin/companygraph.mjs lib/instance-files.mjs README.md verify/cli.test.mjs
git commit --author "Implementer <implementer@companygraph.io>" -F msg.txt
```

with `msg.txt` (outside the repository) reading:

```
The companygraph-judge skill asks, sends and reads the report

The validate skill reads a judge report where one exists, and until now none did unless the owner ran judge by hand. This skill runs judge without a key, shows the owner the service, the files, the tokens and the digest, asks every run, and on a yes sends with --consent, writes the report beside the instance and reads its flags against their pages. It changes no entry. init writes it with the other skills, AGENTS.md names it and validate points at it.

Verified: <the commands of Task 1 Step 10 as they ran, and that they passed>.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
```

### Task 3: The first run, on the reference instance

No code. The skill is tried on `~/git/robertblust/mental-model` with this branch's command in place of the release's, before the pull request is opened, so the release ships a skill that has produced one real report.

- [ ] **Step 1: Run the skill's procedure with the branch's command**

Follow `agents/claude/skills/companygraph-judge/SKILL.md` from this worktree, reading `npx github:companygraph/meta-model#v<tooling>` as `node <this worktree>/bin/companygraph.mjs`, against `~/git/robertblust/mental-model`. Step 3 asks Rob in the conversation; nothing is sent without his yes. The report goes to `~/git/robertblust/judge-<YYYY-MM-DD-HHMM>.txt`.

- [ ] **Step 2: Report to Rob**

Give him the skill's report: the flags that stand, the false ones, the file's path and **Not checked**. Note anything in the skill's wording the run showed to be wrong or missing; fix it in `SKILL.md` on this branch with its own commit (Implementer, `Track: Prose`), and rerun the CLI tests.

- [ ] **Step 3: Open the pull request and stop**

Push with `git -c credential.helper='!/opt/homebrew/bin/gh auth git-credential' push -u origin <branch>`, read the last two merged pull requests' bodies for their shape, and open the build pull request in prose ending in `Verified:`. Watch `gh pr checks --watch`. Merging is Rob's word.
