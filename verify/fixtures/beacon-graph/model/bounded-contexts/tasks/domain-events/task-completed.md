---
id: 01a1025c-048b-795e-a56e-4acc28f06a86
source: beacon-platform
source-id: DOM-11
emitted-by: Task
---

# Task completed

> A task reached `done`, closed by its holder or by an integrator on the holder's behalf.

## Payload

| Attribute | Term | Type | Many | Description |
| --- | --- | --- | --- | --- |
| Task | Task | | | The task that was completed |
| Time spent | | number | | The hours worked on it |
| Completed by | | string | | The agent that closed it, which differs from the holder when an integrator closed it |

## References

| What | URL |
| --- | --- |
| Task event catalog | https://github.com/beacon-build/beacon-platform/blob/main/docs/domains/agent-tasks.md |
