---
id: 01a1025c-0446-7326-b055-320e2379439b
source: beacon-platform
source-id: DOM-11
classification: supporting
realizes:
  - Tasks
---

# Tasks

> The context that keeps the work people and agents are asked to do, from the request to the finished result, and leaves the identity and credentials of the agents who do it to the context that owns agents.

## Responsibilities

- Hold a task from creation to a terminal state, moving it only along the lifecycle's legal transitions.
- Hand a task to exactly one holder at a time, and refuse a second claim on it.
- Hold a task back while another task blocks it, and release it once every blocker has been handed over.
- Keep the backlog in a stable order that is independent of priority.
- Group tasks under a parent, and refuse to close a parent while a child is still open.
- Record the relationships between tasks as typed links.
- Tell other contexts when a task is assigned, unblocked, completed or failed.

## References

| What | URL |
| --- | --- |
| Task lifecycle domain document | https://github.com/beacon-build/beacon-platform/blob/main/docs/domains/agent-tasks.md |
| Task work surface domain document | https://github.com/beacon-build/beacon-platform/blob/main/docs/domains/platform-tasks.md |
