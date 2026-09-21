---
source: Local
owner: Backend Engineer
executed-by:
  - Backend Engineer
supported-by:
  - Reviewer
gate-approvers:
  - Reviewer
escalation-authority: Reviewer
gate-to: Build
---

# Specify

> Write down what the change must do, before anyone writes how it does it.

## What it takes

A request from the platform's users, and the part of the system it will touch, read rather than remembered.

## Activities

1. State the request as one sentence.
2. Name the approaches worth considering, and recommend one.
3. Write down what the change must do, and what it is explicitly not doing.

## What it produces

| Deliverable | Description |
| --- | --- |
| Specification | What the change must do, the approach chosen, and what was left out |

## What it never does

- Never writes the change it specifies.
- Never leaves a question unasked because an assumption would be convenient.

## Gate

To leave Specify, all of these hold:

- The request is stated as one sentence.
- The approach is chosen and the rejected ones are named.
- What the change will not do is written down.

Where they cannot be met, the Reviewer decides whether the request is reshaped or dropped.
