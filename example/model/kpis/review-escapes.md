---
id: 01a10040-3005-7db7-a01b-d031d4bebf58
source: Local
owner: Backend Engineer
assesses:
  - Main requires a review
unit: changes per month
direction: lower
---

# Review Escapes

> The changes that reached the default branch without the review the ruleset asks for.

## How it is measured

The changes merged to the default branch in a calendar month whose ruleset evaluation was bypassed, read from the repository host's record of rule evaluations.

## What it can hide

A repository with no ruleset is never evaluated, so a change to it escapes without being counted; and an override made for a good reason counts the same as one made in a hurry.
