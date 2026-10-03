---
id: 01a1025c-047b-7048-a697-491331bf0489
source: beacon-platform
source-id: DOM-11
root: Task
members:
  - Task Status
  - Task Type
  - Rank
  - STDD Phase
---

# Task

> A task keeps its status, holder, parent and place in the backlog consistent as it moves from queued to a final state.

## Invariants

| Label | Invariant |
| --- | --- |
| INV-T1 | A task in a final status (`done`, `failed` or `cancelled`) never changes status again. |
| INV-T2 | A claim succeeds only on a `queued` task, and when two agents claim the same task at once exactly one of them holds it afterwards. |
| INV-T5 | A queued task can be canceled by anyone, and a claimed task only by the agent that holds it. |
| INV-T6 | A blocked task returns to `queued` only when every task that blocks it has reached `implementation_done` or `done`. |
| INV-T11 | A task without a rank sorts after every ranked task. |
| INV-T13 | `implementation_done` is reachable only from `in_progress`, and `done` only from `implementation_done`. |
| INV-T14b | A task in a final status still accepts a change of estimated hours, parent or deployed release, and of nothing else. |
| INV-T17 | Ranking a task changes the rank of that task only; no other task's rank is rewritten. |
| INV-T18 | A task cannot change into a type that holds no children while it has children, a container cannot be closed while a child is not `done`, and a task cannot be attached to a parent that is already closed. |
| INV-F153-3 | A milestone is created or retyped with a non-blank version, and a patch cannot blank the version of an existing milestone. |

## Handled commands

| Command | Description |
| --- | --- |
| Create task | Adds a task in `queued`, or in `blocked` when it is created already blocked; refuses a milestone without a version. |
| Claim task | Gives a queued task to the calling agent; refuses a task that is not `queued`. |
| Start task | Moves a claimed task to `in_progress`; refuses a task that has no holder. |
| Hand over task | Moves an `in_progress` task to `implementation_done`, ready for the integrator. |
| Defer task | Parks an `in_progress` task as `deferred` with its cause recorded; a deferred task can be queued or claimed again. |
| Complete task | Moves an `implementation_done` task to `done` with the hours spent; refuses anyone but the holder, except an integrator acting on behalf of the holder. |
| Fail task | Moves a task to `failed`; refuses anyone but the holder. |
| Cancel task | Moves a task to `cancelled`; refuses a claimed task to anyone but its holder. |
| Reassign task | Returns a non-final task to `queued` for a new holder, or hands an `implementation_done` task directly to the integrator. |
| Rank task | Places a task at the top, the bottom, or before or after another task in the backlog. |
| Advance STDD phase | Moves a feature one step along the STDD phases, or back from `challenge` to `spec`; refuses any other jump. |

## State transitions

- `queued` moves to `claimed` when it is claimed and to `blocked` while another task blocks it. `blocked` returns to `queued` once all blockers are handed over.
- `claimed` moves to `in_progress` when work starts, and back from `in_progress` to `claimed` for a re-spec.
- `in_progress` moves to `implementation_done` on handover and to `deferred` when parked.
- `deferred` moves back to `queued` or to `claimed`.
- `implementation_done` moves to `done` when the integrator completes it.
- `claimed`, `in_progress` and `implementation_done` move to `failed`.
- `queued`, `claimed`, `in_progress`, `deferred` and `implementation_done` move to `cancelled`.

## References

| What | URL |
| --- | --- |
| Task lifecycle domain document | https://github.com/beacon-build/beacon-platform/blob/main/docs/domains/agent-tasks.md |
