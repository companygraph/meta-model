---
id: 01a14d30-995e-7487-a2b5-5fe1388f8b88
source: Local
kind: detective
mode: manual
mitigates:
  - An unreviewed change reaches customers
enforces:
  - A change is reviewed before it ships
performed-by: Reviewer
---

# An unapproved merge is read before the next release

> Before a release goes out, every change merged without a second person's approval is read by one.

## How it is carried out

Before Release, the Reviewer lists the pull requests merged to the default branch without an approving review from someone other than their author, from the repository host's pull request reviews, and reads each against what was asked; a finding holds the release until it is settled.

## Applies to

| Type | Entity | Owner |
| --- | --- | --- |
| phase | Release | Delivery |
