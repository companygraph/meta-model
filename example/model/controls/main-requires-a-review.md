---
id: 01a0fb1b-b534-79e9-a261-eda408034315
source: Local
kind: preventive
mode: automated
mitigates:
  - An unreviewed change reaches customers
enforces:
  - A change is reviewed before it ships
---

# Main requires a review

> The default branch refuses a merge that carries no approving review from someone other than its author.

## How it is carried out

A branch protection rule on the default branch requires one approving review before any pull request merges, and dismisses an approval when new commits are pushed after it.

## Applies to

| Type | Entity | Owner |
| --- | --- | --- |
| process | Delivery | |
