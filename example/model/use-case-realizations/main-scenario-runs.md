---
id: 01a17b8e-0a61-7da5-90bd-7b421db1b2cc
source: Local
rank: 20
evidence: satisfies
---

# Main scenario runs

> The main success scenario runs from the trigger to the goal, and the use case does not yet run end to end.

## What it means

A use case is at Main scenario runs when the product has the code for every step of its main success scenario and the page shows where, in at least one `## Evidence` row. It stays at the level until every extension is built and a test walks the scenario as well. A page enters the level when the last step is built, moves up to Runs end to end when the last extension is built and a test walks the scenario, and moves down to Not started when a step is removed. While a use case is at this level, a reader may rely on the goal being reached when nothing goes wrong, and not on what `## Realization` names as missing.
