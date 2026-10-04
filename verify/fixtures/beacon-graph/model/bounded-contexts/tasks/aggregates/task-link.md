---
id: 01a1025c-047e-703e-9751-ea550fad7e37
source: beacon-platform
source-id: DOM-11
root: Task Link
members:
  - Link Type
---

# Task Link

> A task link keeps one directed relationship between two distinct tasks unique for its link type.

## Invariants

| Label | Invariant |
| --- | --- |
| INV-T16 | Two task links never share the same source, target and link type, a task is never linked to itself, and a link between tasks of different projects exists only when the caller's reach covers both projects. |

## Handled commands

| Command | Emits | When | Description |
| --- | --- | --- | --- |
| Create task link | | | Links a source task to a target task with a link type; refuses a self-link, a duplicate and a cross-project pair the caller may not reach. A `blocks` link re-evaluates whether the target is blocked. |
| Delete task link | | | Removes a link by its id or by its source, target and link type; a removed `blocks` link re-evaluates whether the target is still blocked. |

## References

| What | URL |
| --- | --- |
| Task lifecycle domain document | https://github.com/beacon-build/beacon-platform/blob/main/docs/domains/agent-tasks.md |
