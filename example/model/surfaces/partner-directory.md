---
source: Local
url: https://directory.example.invalid/beacon-systems
---

# Partner directory

> The listing a buyer reaches from the directory's search, maintained by hand because the
> directory takes no feed.

## What it shows

- **Company name and one-line description** — the identity's H1 and its tagline, unchanged.
- **The long description** — the identity's `## What it is`, cut to the directory's limit.
- **Capabilities** — the skills held at Proficient or Expert, under their own names.
- **Contact** — the identity's `email` and `url`.

## Projection rules

- The long description is the identity's `## What it is` up to the limit below, cut at a
  paragraph and never mid-sentence. Nothing is written for the directory that is not in the
  model first.
- Capabilities carry no proficiency level. The directory shows a flat list and a level beside
  a name it does not explain reads as a grade, so the level decides which skills appear rather
  than appearing itself.
- Skills held at Familiar or Competent are left out. The listing is what the company sells, and
  a capability still being learned is not.
- No profile is named. The directory lists companies, and a person named here would be a fact
  about the company that the company's own identity does not carry.

## Constraints

- The long description is at most 600 characters, the directory's limit, read from its editor
  on 2026-01-05.
- Every capability named is a skill in the model, spelled as that skill's H1.
- The contact address resolves to the company and not to a person.
