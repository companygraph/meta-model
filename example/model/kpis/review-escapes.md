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

> The changes that reached the default branch without the review its protection asks for.

## How it is measured

The pull requests merged to the default branch in a calendar month without an approving review from someone other than their author, read from the repository host's pull request reviews.

## What it can hide

A change pushed to the default branch without a pull request carries no reviews to read, so it escapes without being counted; and an override made for a good reason counts the same as one made in a hurry.
