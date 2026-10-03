# A KPI assesses a control: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A KPI names the controls it assesses, the first such KPI, Ruleset Bypasses, is counted every week from GitHub's rule-suite record, and its values are kept in a bucket of their own per organization.

**Architecture:** meta-model gains the optional KPI field `assesses: array of ref → control` (core 0.54.0, package v0.72.0). companygraph/mcp-server gains a Terraform module for the `kpi-reports-<project>` bucket and its `kpi-reporter` service account, a counting script, and a reusable workflow that runs it with the organization's GitHub App token; each MCP host calls the module from its own `infra/main.tf`, which its deploy workflow already applies on a merge to main, and calls the workflow on a weekly schedule. Each model writes the KPI once it is on v0.72.0.

**Tech Stack:** Node 22 ES modules and `node:test`, Terraform 1.9 with the google provider 8, GitHub Actions (`actions/create-github-app-token`, `google-github-actions/auth`), GitHub's REST API.

**Spec:** `docs/superpowers/specs/2026-10-03-a-kpi-assesses-a-control-design.md` (meta-model PR #239).

## Global Constraints

- The field is `assesses`, optional, typed `array of ref → control`; `measures` is unchanged.
- Core moves to 0.54.0 and the package to v0.72.0; nothing an instance holds breaks.
- The bucket is `kpi-reports-<project>`, in the project's region, uniform bucket-level access, public access prevention enforced, object versioning on, no lifecycle rule.
- The service account is `kpi-reporter`, with `roles/storage.objectUser` on that bucket only, impersonable only by runs of the host repository on `main` through the existing pool `github`.
- The object is `ruleset-bypasses/<ISO year>-W<ISO week, two digits>.json` with exactly the keys `kpi`, `organization`, `week`, `from`, `to`, `bypasses`, `repositories`, `unread`, `read_at`.
- A repository the App cannot read is listed in `unread` and counted in no total; it is never a zero.
- The job prints counts and repository names only, never a token, a key or a URL with a token.
- The App's id is the variable `KPI_APP_ID` and its key the secret `KPI_APP_PRIVATE_KEY`, in robertblust/mcp-blust-ch, companygraph/mcp-companygraph-io and guestgraph/mcp-guestgraph-io; they are set.
- Every merge, tag and release is on the owner's word; every model entry is shown to the owner in chat before it is committed.
- Every commit is authored by its seat with the trailers `Process`, `Phase`, `Track` and `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`, in the git register, with a `Verified:` line naming what ran.

## Review Focus

- A week's bounds in UTC: a rule suite pushed at Sunday 23:30 Zurich time is Sunday 21:30 UTC and belongs to that ISO week; the script takes `from`/`to` as UTC instants and filters `pushed_at` itself, since the API's `time_period` is relative to now. Task 2 pins it.
- Paging: an organization with more than 100 repositories, or a repository with more than 100 bypasses in a week, is read to its last page. Task 2 pins it.
- A 403 or 404 from one repository (a private repository without rulesets, as robertblust/xiny answered) must not fail the run or count as zero. Task 2 pins it.
- The workflow runs from `main` only, so a fork's pull request never sees the secret, and `kpi-reporter` refuses any other ref because the binding names `attribute.ref/refs/heads/main`. Task 2 pins the binding in Terraform and the trigger in the workflow.
- `assesses` naming a type other than control, or a control that does not exist, fails the instance check. Task 1 pins it.

## Decisions this plan makes that the spec leaves open

- **The module, the script and the reusable workflow live in companygraph/mcp-server**, and each host calls them at a tag, as it already calls mcp-server's deploy module and chat-server's report workflow; the host's own Terraform root gains a `module "kpi"` call. Three copies of the same code in three hosts would drift.
- **No new apply step.** Each host's `infra/` is applied by mcp-server's deploy workflow on a merge to main as `terraform@`, which already holds `storage.admin`, `iam.serviceAccountAdmin` and `projectIamAdmin`; the owner's Terraform step in the spec is the merge of the host's pull request.
- **The object is written with `gcloud storage cp`**, which `google-github-actions/auth` with `setup-gcloud` provides, so the script needs no cloud dependency and writes a local file the workflow uploads.

## Task 1: meta-model, the `assesses` field

**Files:**

- Modify: `core/kpi-schema.md`, `core/control-schema.md`, `docs/superpowers/specs/2026-09-30-rules-risks-and-controls-design.md`, `example/model/kpis/` (one new KPI), `verify/kpi.test.mjs`
- Possibly modify: `lib/checks.mjs` only if the field is not read from the schema (it should be: the checks read every field from the schema).

**Interfaces:**

- Produces: a KPI field `assesses` that resolves to `control`; the example KPI `Review Escapes` assessing the example control `Main requires a review`.

- [ ] **Step 1: Write the failing tests** in `verify/kpi.test.mjs`. Add to the tree a bare control schema and one control, and the tests:

```js
// added to tree(): the schema and one control the field may name
//   ["meta/core/control-schema.md", bare("control", "model/controls/*.md")],
//   ["model/controls/main-requires-a-review.md", "# Main requires a review\n\n> One holds.\n"],

test("a KPI naming a control in assesses passes", () => {
  assert.deepEqual(about([...GOOD, "assesses:", "  - Main requires a review"]), []);
});

test("assesses naming a control that does not exist fails by name", () => {
  assert.equal(about([...GOOD, "assesses:", "  - Nobody's control"], undefined, "Nobody's control").length, 1);
});

test("assesses naming an entity of another type fails, since the field names controls", () => {
  assert.equal(about([...GOOD, "assesses:", "  - Craftsmanship"], undefined, "Craftsmanship").length, 1);
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm run test:instance-checks`

Expected: the first test fails with an unknown frontmatter field (R15), since the schema does not declare `assesses` yet.

- [ ] **Step 3: Declare the field.** In `core/kpi-schema.md`, add after the `measures` row:

```markdown
| `assesses` | No | array of ref → control | The controls whose effectiveness this KPI's number tells, each the H1 of a file in `controls/`. Absent where it assesses none. |
```

Add to its writing rules, after the `serves` rule:

```markdown
- `assesses` names a control only where the number moving would tell how well that control works; a KPI that merely shares a subject with a control names none.
- A KPI that assesses a control says in `## What it can hide` what the control lets through that the number does not count.
```

In `core/control-schema.md`'s Purpose, replace "How well it works is measured, where the company measures it, by a KPI, never by a number on this page." with "How well it works is measured, where the company measures it, by a KPI that names it in `assesses`, never by a number on this page." In the rules and controls spec, after the sentence "Pointing a KPI's `measures` at a control is a change to the `kpi` type, which this spec does not make.", add "The spec of October 3, 2026, `2026-10-03-a-kpi-assesses-a-control-design.md`, makes it, with a field of its own."

- [ ] **Step 4: The example KPI.** Create `example/model/kpis/review-escapes.md`, with an id from `node bin/companygraph.mjs id`:

```markdown
---
id: <fresh id>
source: Local
owner: Backend Engineer
assesses:
  - Main requires a review
unit: changes per month
direction: lower
---

# Review Escapes

> The changes that reached the default branch without the review the ruleset asks for.

## How it is measured

The changes merged to the default branch in a calendar month whose ruleset evaluation was bypassed, read from the repository host's record of rule evaluations.

## What it can hide

A repository with no ruleset is never evaluated, so a change to it escapes without being counted; and an override made for a good reason counts the same as one made in a hurry.
```

Check `owner` names a role the example holds (`ls example/model/roles`); use the one Change Fail Rate names if `Backend Engineer` is absent.

- [ ] **Step 5: Run the tests and the checks**

Run: `npm run test:instance-checks && npm run verify && npm run build:check && npm run typecheck`

Expected: all pass, the three new tests included, and verify's example check reads the new KPI.

- [ ] **Step 6: The MCP server's example edge.** No change here; Task 3 takes this release into mcp-server, whose tests read the example.

- [ ] **Step 7: Commit** as `Implementer <implementer@companygraph.io>`, Track Code, subject `A KPI names the controls it assesses`, with a `Verified:` line naming the counts. Run `sh conventions/conventions-format` first.

## Task 2: mcp-server, the bucket, the count and the weekly workflow

**Files:**

- Create: `deploy/google/kpi/main.tf`, `deploy/google/kpi/variables.tf`, `deploy/google/kpi/outputs.tf`, `lib/bypasses.mjs`, `bin/bypasses.mjs`, `test/bypasses.test.mjs`, `.github/workflows/kpi-google.yml`
- Modify: `.github/workflows/test.yml` (validate the new module), `package.json` (`files` if bin/ and lib/ are listed there), README's deploy section (one paragraph)

**Interfaces:**

- Produces: module inputs `project`, `project_number`, `region`, `repository_id`; outputs `bucket`, `service_account`. `lib/bypasses.mjs` exports `isoWeek(date): { week: "YYYY-Www", from: Date, to: Date }` for the ISO week containing `date`, `lastWeek(now): same` for the week that ended before `now`, and `countBypasses({ repositories, suites, from, to }): Promise<{ bypasses, repositories, unread }>` where `repositories` is `string[]` and `suites(repo) → Promise<{ status: number, items: { pushed_at: string, result: string }[] }>` is called once per repository and pages itself. `bin/bypasses.mjs` reads `GITHUB_TOKEN`, `ORGANIZATION`, `OUT` from the environment and writes the object to `OUT`.

- [ ] **Step 1: Write the failing tests** in `test/bypasses.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { isoWeek, lastWeek, countBypasses } from "../lib/bypasses.mjs";

test("an ISO week runs Monday 00:00 to the next Monday 00:00 UTC, and week 1 holds the year's first Thursday", () => {
  assert.deepEqual(isoWeek(new Date("2026-10-02T12:00:00Z")), { week: "2026-W40", from: new Date("2026-09-28T00:00:00Z"), to: new Date("2026-10-05T00:00:00Z") });
  assert.equal(isoWeek(new Date("2027-01-01T00:00:00Z")).week, "2026-W53");
  assert.equal(isoWeek(new Date("2026-01-01T00:00:00Z")).week, "2026-W01");
});

test("the week that ended is the one before the week of now", () => {
  assert.equal(lastWeek(new Date("2026-10-05T06:00:00Z")).week, "2026-W40");
});

const at = (iso) => ({ pushed_at: iso, result: "bypass" });
test("bypasses are counted inside the week only, per repository, and a repository with none is a zero", async () => {
  const data = { a: [at("2026-09-28T00:00:00Z"), at("2026-10-04T23:59:59Z"), at("2026-10-05T00:00:00Z")], b: [] };
  const r = await countBypasses({ repositories: ["a", "b"], suites: async (x) => ({ status: 200, items: data[x] }), from: new Date("2026-09-28T00:00:00Z"), to: new Date("2026-10-05T00:00:00Z") });
  assert.deepEqual(r, { bypasses: 2, repositories: { a: 2, b: 0 }, unread: [] });
});

test("a repository that cannot be read is unread, never a zero, and the run goes on", async () => {
  const r = await countBypasses({ repositories: ["a", "x"], suites: async (x) => (x === "x" ? { status: 403, items: [] } : { status: 200, items: [at("2026-09-29T10:00:00Z")] }), from: new Date("2026-09-28T00:00:00Z"), to: new Date("2026-10-05T00:00:00Z") });
  assert.deepEqual(r, { bypasses: 1, repositories: { a: 1 }, unread: ["x"] });
});

test("a result other than bypass is not counted", async () => {
  const r = await countBypasses({ repositories: ["a"], suites: async () => ({ status: 200, items: [{ pushed_at: "2026-09-29T10:00:00Z", result: "pass" }] }), from: new Date("2026-09-28T00:00:00Z"), to: new Date("2026-10-05T00:00:00Z") });
  assert.equal(r.bypasses, 0);
});
```

And for the CLI, a test that runs `bin/bypasses.mjs` against a fake API (a local `http` server on port 0 given as `GITHUB_API_URL`) answering two pages of repositories (the second via a `Link: rel="next"` header) and one repository's 403, and asserts the written object's keys equal exactly the constraint's list, `kpi` is `"Ruleset Bypasses"`, and stdout holds no `ghs_` token text.

- [ ] **Step 2: Run them to see them fail**

Run: `npm test`

Expected: FAIL, `Cannot find module '../lib/bypasses.mjs'`.

- [ ] **Step 3: Write `lib/bypasses.mjs` and `bin/bypasses.mjs`.** `isoWeek` computes Monday 00:00 UTC of the date's ISO week and the ISO week-year from that week's Thursday; `lastWeek(now)` is `isoWeek(now - 7 days)`. `countBypasses` calls `suites` per repository, counts items with `result === "bypass"` and `from <= pushed_at < to`, and puts a non-200 repository in `unread`. The CLI lists repositories with `GET /installation/repositories?per_page=100` following `Link` headers, reads each with `GET /repos/{full_name}/rulesets/rule-suites?time_period=month&rule_suite_result=bypass&per_page=100` following `Link` headers (a month always covers the week that ended on a Monday run), writes `{ kpi: "Ruleset Bypasses", organization, week, from, to, bypasses, repositories, unread, read_at }` as JSON to `OUT`, and prints `organization week bypasses read/unread` and each repository with a non-zero count. The API base is `GITHUB_API_URL` or `https://api.github.com`. No dependency is added.

- [ ] **Step 4: The Terraform module** in `deploy/google/kpi/`, following `deploy/google/terraform/`'s style and comment density:

```hcl
# variables.tf
variable "project" { type = string }
variable "project_number" { type = string }
variable "region" { type = string }

# main.tf
terraform {
  required_version = ">= 1.9"
  required_providers { google = { source = "hashicorp/google", version = "~> 8.0" } }
}
locals {
  main_runs = "principalSet://iam.googleapis.com/projects/${var.project_number}/locations/global/workloadIdentityPools/github/attribute.ref/refs/heads/main"
}
resource "google_storage_bucket" "kpi" {
  name                        = "kpi-reports-${var.project}"
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  versioning { enabled = true }
}
resource "google_service_account" "reporter" {
  account_id   = "kpi-reporter"
  display_name = "Writer of the organization's KPI values"
}
resource "google_storage_bucket_iam_member" "reporter" {
  bucket = google_storage_bucket.kpi.name
  role   = "roles/storage.objectUser"
  member = "serviceAccount:${google_service_account.reporter.email}"
}
resource "google_service_account_iam_member" "reporter_wif" {
  service_account_id = google_service_account.reporter.name
  role               = "roles/iam.workloadIdentityUser"
  member             = local.main_runs
}

# outputs.tf
output "bucket" { value = google_storage_bucket.kpi.name }
output "service_account" { value = google_service_account.reporter.email }
```

The pool's provider admits only the host repository's tokens (its attribute condition names the repository id), so `main_runs` is that repository's runs on main, as chat-server's analyst binding has it.

In `.github/workflows/test.yml`'s terraform job, add `terraform -chdir=deploy/google/kpi init -backend=false -input=false` and `terraform -chdir=deploy/google/kpi validate`.

- [ ] **Step 5: The reusable workflow** `.github/workflows/kpi-google.yml`, following chat-server's `report-google.yml`:

```yaml
# The week's KPI values of an organization, called by its MCP host on its own schedule. The run
# reads the organization's rule suites with its GitHub App and writes the week's object to the
# project's kpi-reports bucket as kpi-reporter, which only a run on main can act as. The log
# carries counts and repository names, never a token.
name: kpi
on:
  workflow_call:
jobs:
  ruleset-bypasses:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v5
      - run: jq -r '"PROJECT=\(.project)\nPROJECT_NUMBER=\(.project_number)"' deployment.json >> "$GITHUB_ENV"
      - uses: actions/create-github-app-token@v2
        id: app
        with:
          app-id: ${{ vars.KPI_APP_ID }}
          private-key: ${{ secrets.KPI_APP_PRIVATE_KEY }}
          owner: ${{ github.repository_owner }}
      - uses: google-github-actions/auth@v3
        with:
          workload_identity_provider: projects/${{ env.PROJECT_NUMBER }}/locations/global/workloadIdentityPools/github/providers/github
          service_account: kpi-reporter@${{ env.PROJECT }}.iam.gserviceaccount.com
      - uses: google-github-actions/setup-gcloud@v2
      - uses: actions/setup-node@v7
        with:
          node-version: 22
      - run: npm ci
      - name: the week's ruleset bypasses
        env:
          GITHUB_TOKEN: ${{ steps.app.outputs.token }}
          ORGANIZATION: ${{ github.repository_owner }}
          OUT: ${{ runner.temp }}/week.json
        run: node node_modules/companygraph-mcp-server/bin/bypasses.mjs
      - name: the object, kept
        run: |
          week=$(jq -r .week "$RUNNER_TEMP/week.json")
          gcloud storage cp "$RUNNER_TEMP/week.json" "gs://kpi-reports-$PROJECT/ruleset-bypasses/$week.json"
```

The checkout is the calling host's, whose root `package.json` pins `companygraph-mcp-server` at a tag, so `npm ci` installs the release the host chose and the run executes that release's `bin/bypasses.mjs`, as chat-server's report runs the chat release the host's `chat/` pins. Add `bin/bypasses.mjs` and `lib/bypasses.mjs` to `package.json`'s `files` if it lists files.

- [ ] **Step 6: Run everything**

Run: `npm test` and `terraform -chdir=deploy/google/kpi init -backend=false -input=false && terraform -chdir=deploy/google/kpi validate`, and `actionlint .github/workflows/kpi-google.yml` if actionlint is installed (`brew list actionlint`; otherwise say it did not run).

Expected: the tests pass, the module validates.

- [ ] **Step 7: Commit** as `Implementer <implementer@companygraph.io>`, Track Code, subject `The server ships the weekly ruleset-bypass count and its bucket`, with a `Verified:` line.

## Task 3: the releases, on the owner's word

- [ ] meta-model: a release PR moving package.json and the lock to 0.72.0, both workflow refs to v0.72.0, and `core/manifest.json` and `packs/software/manifest.json` to 0.54.0; release notes naming the field; merge, tag v0.72.0 and publish, each on the owner's word.
- [ ] mcp-server: take meta-model v0.72.0 (the pin and its lockfile, proved against the tag's commit; the interface document regenerated), then a release PR to v0.52.0, carrying Task 2; merge, tag and publish on the owner's word.

## Task 4: the three hosts

For each of robertblust/mcp-blust-ch, companygraph/mcp-companygraph-io, guestgraph/mcp-guestgraph-io, one pull request:

- [ ] `infra/main.tf`: add

```hcl
module "kpi" {
  source         = "git::https://github.com/companygraph/mcp-server.git//deploy/google/kpi?ref=v0.52.0"
  project        = local.d.project
  project_number = local.d.project_number
  region         = local.d.region
}
output "kpi_bucket" { value = module.kpi.bucket }
```

- [ ] Move every mcp-server pin to v0.52.0 together (package.json, deploy.yml, the `module "mcp"` and bootstrap sources), as the last mcp-server move did.
- [ ] `.github/workflows/kpi.yml`:

```yaml
name: kpi
on:
  schedule:
    - cron: "0 6 * * 1"
  workflow_dispatch:
jobs:
  kpi:
    uses: companygraph/mcp-server/.github/workflows/kpi-google.yml@v0.52.0
    secrets: inherit
```

- [ ] The pull request's terraform plan (run as `terraform-plan@`) shows the bucket, the service account and the two bindings to add and nothing to destroy; the PR body quotes the plan's summary line.
- [ ] After the owner merges and the deploy applies, run the workflow by hand (`gh workflow run kpi.yml -R <host>`), confirm it succeeds, and read the object back with the owner's `gcloud storage cat` or the run log's count; compare with a count read directly.

## Task 5: the three models

- [ ] Upgrade each instance to meta-model v0.72.0 (one PR each), as on October 2.
- [ ] Draft the KPI Ruleset Bypasses for companygraph/mental-model first, from the spec's section, assessing its control "Main takes a change only through a green, current pull request", with `## References` naming the weekly workflow and the bucket; put it to the owner in chat; commit on his word as the Writer; then the same for robertblust and guestgraph in their voices.
- [ ] The content re-pins of hosts and sites follow, on the owner's word, as on October 3.
