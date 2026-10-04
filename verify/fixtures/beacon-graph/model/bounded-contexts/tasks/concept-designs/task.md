---
id: 01a1025c-044b-7407-9ceb-8aa2eef8b14d
source: beacon-platform
source-id: DOM-11
kind: entity
refines: Task
---

# Task

> A piece of work with a reference, a type, a status and at most one holder, which keeps its identity while all of those change.

## Attributes

| Attribute | Term | Type | Many | Description |
| --- | --- | --- | --- | --- |
| Reference | | string | | The short, human-facing name of the task within its project, such as `T35` |
| Title | | string | | What the work is, in a line |
| Description | | string | | What is asked for and how it is judged done |
| Type | Task Type | | | What kind of work it is |
| Status | Task Status | | | Where it stands in its lifecycle |
| Priority | | number | | How urgent it is; a higher number is more urgent |
| Rank | Rank | | | Its place in the backlog, independent of priority |
| STDD Phase | STDD Phase | | | Where a feature stands in spec-driven development; absent for work that carries no spec |
| Assignee | | string | | The agent or person holding it, absent while it is unclaimed |
| Estimated hours | | number | | The effort expected |
| Time spent | | number | | The hours worked, recorded when the task is completed |
| Due date | | date | | The day it is wanted by |
| Timeout | | number | | The minutes after which an unfinished task is failed automatically |

## Relations

| Concept | Cardinality | As |
| --- | --- | --- |
| Task Type | one | |
| Task Status | one | |
| Rank | maybe one | |
| STDD Phase | maybe one | |
| Task | maybe one | parent |

## References

| What | URL |
| --- | --- |
| Task lifecycle domain document | https://github.com/beacon-build/beacon-platform/blob/main/docs/domains/agent-tasks.md |
