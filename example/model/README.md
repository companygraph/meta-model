# Example instance

> A fictional company, described in CompanyGraph. Nothing here is real.

Northwind Atelier and Beacon Systems do not exist, and neither do Mira Halvorsen and Tomas Reyes. The
content is invented so the shape can be read end to end without anyone's actual client or
revenue data being published.

It uses eight core types — `identity`, `vision`, `profile`, `experience`, `skill`,
`proficiency-level`, `value`, `source` — and declares no packs. That is what core ships, not a
claim that eight types describe a company.

```
identity.md                      Beacon Systems — the company all of this is about
vision.md                        billing nobody has to explain
values/                          say-the-hard-thing.md, craftsmanship.md
sources/                         local.md, google-workspace.md
skills/                          java-programming.md, domain-driven-design.md,
                                 product-discovery.md
proficiency-levels/              familiar.md, competent.md, proficient.md, expert.md
profiles/mira-halvorsen/         mira-halvorsen.md
  experiences/                   2018-northwind-atelier.md, 2022-beacon-systems.md
profiles/tomas-reyes/            tomas-reyes.md
  experiences/                   2019-northwind-atelier.md, 2021-orbit-conference.md,
                                 2022-beacon-systems.md
```

`profiles/` is a folder of folders because a profile owns its experiences. `skills/` is a
folder of files because nothing owns a skill. `identity.md` and `vision.md` are files directly
in the container because a company has one of each: the filesystem carries the cardinality, so
no rule has to state it (R6, R13).

Everything here sits under `model/`. What an instance keeps beside it — the vendored `meta/`,
its tooling, its working documents — is not content and is never walked as content.

There are no schemas here. This instance is read beside `core/` and is written against the
schemas there — one copy, which cannot drift from a second. An adopter who takes `core/` away
has no such neighbor and keeps a copy; where is theirs to decide, so long as it is not inside
a folder named for a type.
