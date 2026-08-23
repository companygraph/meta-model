# Example instance

> A fictional company, described in CompanyGraph. Nothing here is real.

Northwind Atelier and Beacon Systems do not exist, and neither does Mira Halvorsen. The
content is invented so the shape can be read end to end without anyone's actual client or
revenue data being published.

It uses four core types — `profile`, `experience`, `skill`, `value` — and declares no packs.
That is the first release of the model, not a claim that four types describe a company.

```
values/                          say-the-hard-thing.md, craftsmanship.md
skills/                          java-programming.md, domain-driven-design.md
profiles/mira-halvorsen/         mira-halvorsen.md
  experiences/                   2018-northwind-atelier.md, 2022-beacon-systems.md
```

`profiles/` is a folder of folders because a profile owns its experiences. `skills/` is a
folder of files because nothing owns a skill.
