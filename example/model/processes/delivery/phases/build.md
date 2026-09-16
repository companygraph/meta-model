---
source: Local
owner: Backend Engineer
executed-by:
  - Backend Engineer
  - Reviewer
gate-approvers:
  - Reviewer
escalation-authority: Reviewer
gate-to: Release
---

# Build

> Make the change and have it read, one track at a time.

## What it takes

An approved specification, and a branch off the platform's main line.

## Activities

### Code

1. Write the failing test, then the change that passes it.
2. Hand the diff to the Reviewer with the specification beside it.
3. Resolve every finding, or record why it stands.

### Docs

1. Draft the page from the specification.
2. Have the Reviewer read it against what the change actually does.

## What it produces

| Deliverable | Description |
| --- | --- |
| Reviewed change | Commits on a branch, with the suite passing and every finding resolved |
| Draft page | The customer-facing description of what changed, unpublished |

## What it never does

- Never changes a test's expectation to make it pass.
- Never publishes the page before the change is released.

## Gate

To leave Build, all of these hold:

- The suite passes on the branch.
- Every review finding is resolved or recorded with a reason.
- The branch does what the specification said, and nothing else.

Where they cannot be met, the Reviewer decides whether the branch is reworked or abandoned.
