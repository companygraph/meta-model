# A KPI assesses a control

A control says what holds a rule, and the rules and controls spec of September 30 says a control's effectiveness is measured by a KPI, while a KPI's `measures` names a process and nothing else, so no KPI can say which control it watches. The family's first control worth watching is already being worn down without anyone seeing it: on each default branch the ruleset lets an admin bypass it, and in the month to October 3, 2026, 8 merges in robertblust/mental-model and 13 in companygraph/meta-model went through with their required checks not passed. This spec gives a KPI a field naming the controls it assesses, writes the first such KPI from that real case, and says where its weekly values are kept.

Status: decided by the owner on October 3, 2026: a KPI names the controls it assesses in a field of its own, `assesses`, rather than widening `measures`; the field is built together with the first KPI that uses it, Ruleset Bypasses; its values are kept in a reports bucket of its own per organization, `kpi-reports-<project>`, beside the chat's reports bucket and not inside it; the bypasses are read with a GitHub App per organization, with Administration read on all its repositories.

Amended by the owner later on October 3, 2026, once the first weeks were read: of 20 bypasses in week 39, 18 were merges of a branch that was behind main with every required check passed, and 2 were merges before a required check had run. The KPI counts only the second kind, the merges that went past a check, and is named Merges Past Their Checks; the weekly object keeps both kinds. The GitHub Apps gained Checks, Contents and Pull requests read to tell them apart.

## Where this comes from

The rules and controls spec (`2026-09-30-rules-risks-and-controls-design.md`) deferred this: "Pointing a KPI's `measures` at a control is a change to the `kpi` type, which this spec does not make." The control schema repeats that a control's effectiveness is measured "where the company measures it, by a KPI, never by a number on this page".

The grammar rules out the obvious widening. A frontmatter field points at one type; the form that reads a type per entry, `ref → by <Column>`, is a column's only, because a field has no row to read a type from (CONVENTIONS.md, the closed vocabulary). So `measures` cannot become "a process or a control" without turning into a table, which would rewrite every KPI the three family models hold (18, all naming Delivery or Answering).

CompanyGraph holds itself to "No type enters core before an instance has had to be written with it". A field is smaller than a type, but the reason is the same, so the field ships with a KPI that needs it.

GitHub keeps every evaluation of a ruleset as a rule suite, with its result: pass, fail or bypass, and for a bypass the rules it passed over (`GET /repos/{owner}/{repo}/rulesets/rule-suites`). Read on October 3, 2026, all 21 bypasses of the month were merges of pull requests whose `required_status_checks` had not passed, every one under the owner's account, which is also the account agents merge with, several in bursts within a minute. None was a direct push. The record reaches back one month.

## The field

The KPI schema gains one optional field:

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `assesses` | No | array of ref → control | The controls whose effectiveness this KPI's number tells, each the H1 of a file in `controls/`. Absent where it assesses none. |

`measures` is unchanged: it names the process whose performance the KPI measures. A KPI may carry both, either or neither.

Writing rules it adds:

- `assesses` names a control only where the number moving would tell how well that control works; a KPI that merely shares a subject with a control names none.
- A KPI that assesses a control says in `## What it can hide` what the control lets through that the number does not count.

The control schema's sentence becomes: "How well it works is measured, where the company measures it, by a KPI that names it in `assesses`, never by a number on this page." The rules and controls spec's deferral gets a line saying this spec makes the change.

The example instance gains one KPI that assesses its control, so the checks and the MCP server's tests see the edge. This is core 0.54.0 and the package v0.72.0: additive, nothing an instance holds breaks.

## Telling the bypasses apart

A rule suite with result `bypass` records that a rule did not pass when a change reached the default branch. In the family's repositories the rule is almost always required status checks, and the record does not say why. The weekly job classifies each bypass from the pull request that made it:

- **Behind main:** the pull request's head had every required check of the branch's rules completed with success before the merge, and the branch lacked commits the default branch had. The checks passed against a main that had since moved; nothing went untested on the pull request.
- **Past its checks:** a required check had not completed with success by the merge (still running, failed, or never reported), or the change reached the branch with no pull request at all, or a rule other than required status checks was bypassed. Something went past a check.

The required checks are the contexts the ruleset named at the merge, read from its history (`GET /repos/{owner}/{repo}/rulesets/{id}/history`); where that history cannot be read, as GitHub refuses it to an App, the rule suite's own count of required checks at the merge decides, met only by checks today's rules name (`GET /repos/{owner}/{repo}/rules/branches/{branch}`), and a check required today but not then can, if it ran green, stand in for one that never started; a check run counts when it completed with conclusion `success` at or before the pull request's `merged_at`. A bypass the job cannot classify, because the pull request, its check runs or the comparison cannot be read, counts as past its checks, the side a wrong guess can be undone from.

## The first KPI: Merges Past Their Checks

Written in companygraph/mental-model first, since CompanyGraph decides its vocabulary, then in robertblust/mental-model and guestgraph/mental-model, each in its own voice and each entry put to the owner before it is committed.

- `direction: lower`, `unit: merges per week`.
- `assesses`: the instance's control "Main takes a change only through a green, current pull request".
- `## How it is measured`: the bypasses classified past their checks, on the default branches of the organization's repositories, in one ISO week, read from GitHub's rule-suite record and each bypass's pull request by the weekly job below.
- `## What it can hide`: a repository with no ruleset is never evaluated; a check that is not required does not count; a merge behind main with its checks passed is not counted although its checks ran against an older main; and a required check that a path filter skipped counts as past its checks although nothing was skipped on purpose.
- `## References`: the weekly job, and the bucket where the values are kept.

Whether it gets `serves` or `read-with` is the instance's to say when it is written.

## Where the values are kept

Each organization keeps its reports in one place: the Google Cloud project its MCP host already runs in (blust-ch-mcp, companygraph-io-mcp, guestgraph-io-mcp, all in europe-west6). The chat's reports stay in `chat-reports-<project>`, which deletes after 83 days because they quote visitors. KPI values quote nobody and are a series that must outlive that, so they get a bucket of their own:

- `kpi-reports-<project>`, in the project's region, uniform bucket-level access, public access prevention enforced, object versioning on, no deletion rule.
- A service account `kpi-reporter`, with `roles/storage.objectUser` on that bucket only, impersonable by a run of the host repository's `main` through the workload identity pool the host's bootstrap made.
- Both in the MCP host's own Terraform, not in chat-server's: a KPI is not the chat's.
- One object per KPI per week: `ruleset-bypasses/<ISO year>-W<ISO week>.json`, holding `{ "kpi": "Merges Past Their Checks", "organization", "week", "from", "to", "bypasses", "past_checks", "behind_main", "repositories": { "<owner>/<repo>": { "bypasses": n, "past_checks": n, "behind_main": n } }, "unread", "read_at" }`, where `bypasses` is the sum of the other two. A run for a week already written replaces it; versioning keeps the earlier object.

## The weekly job

It runs from each organization's MCP host repository, where the variable `KPI_APP_ID` and the secret `KPI_APP_PRIVATE_KEY` are kept:

| Organization | Repository |
| --- | --- |
| robertblust | `robertblust/mcp-blust-ch` |
| companygraph | `companygraph/mcp-companygraph-io` |
| guestgraph | `guestgraph/mcp-guestgraph-io` |

The host is the right home for now, decided by the owner on October 3, 2026: the project, its identity pool, its Terraform and its reports bucket are set up from there, the chat's weekly report already runs there, and the App's key stays with the one job that uses it. A repository of its own per organization, such as `<org>/reports`, is cleaner and becomes worth its pool admission and Terraform once several organization-wide jobs exist. The host repositories are public; the job runs only on schedule and by hand from `main`, where a fork's pull request never receives the secret, and it prints counts only.

A workflow in each of those repositories, on Monday morning and by hand, for the ISO week that ended:

1. Exchanges the organization's GitHub App key (`KPI_APP_ID`, `KPI_APP_PRIVATE_KEY`) for an installation token with `actions/create-github-app-token`.
2. Lists the organization's repositories and, per repository, the rule suites on its default branch with result `bypass` in the week, following pages; a repository the App cannot read is named in the log and counted as unread, never as zero.
3. Classifies each bypass as behind main or past its checks, as above, from its pull request, that head's check runs, the comparison with the default branch and the branch's rules.
4. Writes the week's object to `kpi-reports-<project>` through `google-github-actions/auth` as `kpi-reporter`.
5. Prints the counts and the repositories it read, never anything else.

The owner's steps, which no run can take: create the three GitHub Apps (Administration, Checks, Contents and Pull requests: Read-only, installed on all repositories), add `KPI_APP_ID` as a variable and `KPI_APP_PRIVATE_KEY` as a secret in each host repository, and apply each host's Terraform.

## Tests

meta-model: the field resolves to a control and refuses another type; the example's KPI carries it; the release check and every suite pass. Each host: the job's counting is a script with a fake rule-suite answer, testing paging, the week's bounds in UTC, an unreadable repository, and the object's shape; the Terraform is planned in CI where the host already plans it. Each model: the KPI passes its instance's checks.

## Not part of this

A chart or a page showing the values: the bucket holds them, and a surface can read them later. A KPI for any other control. Whether `measures` should ever take more than a process. The family report in robertblust/conventions, which keeps reading pins and does not count bypasses.
