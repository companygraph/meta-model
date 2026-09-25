---
source: Local
owner: Backend Engineer
measures: Delivery
unit: percent of deployments
direction: lower
read-with:
  - Change Lead Time
---

# Change Fail Rate

> The share of releases that need immediate intervention once they are in production.

## How it is measured

The releases of a calendar month that were followed, before the next planned release, by a rollback or a hotfix made because of them, divided by all releases of that month. A failure is what a customer or a check against production met, not a build that failed before anything shipped.

## What it can hide

It falls when fewer releases ship, and when a failure is folded into the next planned release instead of being named as one. Change Lead Time rising beside it shows the first.

## References

| What | URL |
| --- | --- |
| DORA's definition | https://dora.dev/guides/dora-metrics/ |
