---
source: Local
owner: Backend Engineer
measures: Delivery
unit: hours
direction: lower
read-with:
  - Change Fail Rate
---

# Change Lead Time

> The time a change takes from its first commit to running in production.

## How it is measured

For each release the Release phase ships, the time from the earliest commit it carries that no earlier release carried to the moment the release is live for customers; the value is the median over the releases of a calendar month. The commits come from the repository's history and the live moment from the deployment log.

## What it can hide

It shortens when changes get smaller and when review gets thinner, and only the first is progress. Thinner review shows as a higher Change Fail Rate, which is why the two are read together. A median also hides the change that waited a week behind a release.

## References

| What | URL |
| --- | --- |
| DORA's definition | https://dora.dev/guides/dora-metrics/ |
