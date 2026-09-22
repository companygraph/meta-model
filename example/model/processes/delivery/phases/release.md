---
source: Local
owner: Reviewer
executed-by:
  - Reviewer
supported-by:
  - Backend Engineer
gate-approvers:
  - Reviewer
  - Backend Engineer
escalation-authority: Reviewer
---

# Release

> Put the change in front of the platform's users, and the page with it.

## What it takes

A branch that left Build, and the draft page written beside it.

## Activities

1. Merge the branch and tag the release.
2. Publish the page.
3. Watch the platform until the change has been exercised by real traffic.

## What it produces

| Deliverable | Description |
| --- | --- |
| Released change | Merged, tagged, and running for users |
| Published page | The page describing the change, live on the customer site |

## What it never does

- Never releases and publishes in the opposite order.
- Never leaves a release untagged.

## Gate

Release is the last phase. The work is done when all of these hold:

- The change is merged and tagged.
- The page is live.
- The change has been exercised in production without incident.

Where they cannot be met, the Reviewer decides whether the release is rolled back.
