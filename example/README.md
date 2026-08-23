# Example instance

> A fictional company, described in CompanyGraph. Nothing here is real.

Northwind Atelier and Beacon Systems do not exist, and neither does Mira Halvorsen. The
content is invented so the shape can be read end to end without anyone's actual client or
revenue data being published.

It uses five core types — `profile`, `experience`, `skill`, `proficiency-level`, `value` —
and declares no packs. That is the first release of the model, not a claim that five types
describe a company.

```
values/                          say-the-hard-thing.md, craftsmanship.md
skills/                          java-programming.md, domain-driven-design.md
proficiency-levels/              familiar.md, competent.md, proficient.md, expert.md
profiles/mira-halvorsen/         mira-halvorsen.md
  experiences/                   2018-northwind-atelier.md, 2022-beacon-systems.md
```

`profiles/` is a folder of folders because a profile owns its experiences. `skills/` is a
folder of files because nothing owns a skill.

There are no schemas here. This instance is read beside `core/` and is written against the
schemas there — one copy, which cannot drift from a second. An adopter who takes `core/` away
has no such neighbour and keeps a copy; where is theirs to decide, so long as it is not inside
a folder named for a type.
