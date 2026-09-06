# `## Also at` on `profile` and `identity` — design

> A person and a company keep presences elsewhere — a code host, a network, a newsletter — and
> the model had no place for them. One optional section on two types, the same table on both,
> and a site that reads its `sameAs` from the model instead of typing it in.

## 1. The finding

The reference instance is a company of one, and its author publishes on Substack. Asked where
that address goes, the model had no answer. `identity` has one `url`, the company's own address
on the web, and that is blust.ch. `profile` has none at all. The two links blust.ch already
claims for the person, GitHub and LinkedIn, live only in the page's JSON-LD as `sameAs`, typed
into `index.html` by hand: the site says something about the person that the model does not
say, which is the one thing the reference instance exists to make impossible.

Two answers were weighed before this one. A single post can be an experience of kind Community
with a `url`, the way the 3AP article is held, and that stays right for posts: it is dated, it
evidences skills, and the timeline shows it. It does not hold a standing fact, that the person
*is* at an address, which is what a profile page and a search engine want. The other answer
was to leave the standing link to the site. That keeps the model smaller by one section and
keeps the disagreement the finding is about.

## 2. The change

Both `profile-schema.md` and `identity-schema.md` gain one optional section, declared in the
sections table with the `Table.` marker R9 asks for and placed last:

| Section | Required | Description |
| --- | --- | --- |
| `## Also at` | No | Table. One row per presence the subject maintains elsewhere; its columns are declared below. |

Under the caption the shape requires — `` `## Also at` is a table with these columns: `` — the
same two columns on both types:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Where` | Yes | string | The place, in plain words — GitHub, LinkedIn, Substack |
| `URL` | Yes | string | The subject's own page there |

The section's paragraph in each schema says what it is for and what it is not: a presence the
subject maintains, named by the place and addressed by the profile page there — never a single
post, an article or a recording, which document an experience and belong in that experience's
`## References`. On `profile` it follows `## Summary`; on `identity` it follows `## What it is`.

The writing rules gain two lines on each type. One row per place, and a place the subject no
longer maintains has no row, because the table is what a reader will follow. The URL is the
page that is the subject's own on that place, not a search, a feed or a post: what a reader
lands on has to be the subject.

## 3. Why this shape

**A table, not a field.** CONVENTIONS.md already decides it: a field whose value is a list of
records is a table wearing YAML, and goes in the body with its columns declared. A presence is
a record — a place and an address — and a list of bare URLs would lose the place, which is the
half a reader scans.

**The same table on both types.** A company keeps presences as a person does: a GitHub
organization, a LinkedIn page. Giving the section to `profile` alone would have meant a second
release the first time an instance's company wanted one, and two types that ask the same
question in different words. `experience` keeps `## References` and does not get this section,
because what an experience links to documents the period, not the subject.

**`Where | URL`, and not a third column.** A handle — `@robblust` — is in the URL already, and
every column is a cell every instance has to fill. The `What | URL` pair on `## References` was
the model, with `Where` for a place where `What` named a kind of document.

**Not a `source`.** A source is where a page's facts are mastered. A presence elsewhere masters
nothing here; it is a fact about the subject, held by the subject's own page.

## 4. Parser, checks and the example

**No parser change.** Since core 0.9.0 the parser decides per table whether it is references or
data: a table in which no cell of any row resolves to an entity is data, draws no edge, and
keeps its cells as they are. That is what `## References` needed and what `## Also at` is. The
suite gains one fixture — a profile and an identity with the section — asserting that both
parse with the table present as data and that no edge leaves either page for it, so the rule
this design leans on is pinned by a test rather than assumed.

**Shape checks.** `npm run verify` holds the schemas to R9. The new section is declared with
`Table.` in the sections table and its column table follows a caption naming it, which is the
shape every other table section has.

**The example.** Beacon Systems gets one row on its identity and one profile gets one on its
own page, with addresses under `example.invalid`, the reserved domain the example already uses
for its email addresses, so the fixture and the example both show the section without pointing
at anything real.

## 5. The instance and the sites

**robertblust/mental-model** re-vendors core at 0.14.0, recomputes the hashes in its manifest,
and adds the section to the profile with three rows: GitHub, LinkedIn, Substack. The identity
gets the GitHub row alone: the repositories under that account are the company's work, while
LinkedIn and Substack are the person's. The validate skill runs before the commit, as the
instance's own agent file requires.

**blust.ch** moves its meta-model pin for the parser and its model pin to the instance's new
commit, and gains a build step beside the one that writes the principles page: it reads the
profile's `## Also at` rows from the model and writes the person's `sameAs` array in the home
page's JSON-LD between two markers, with a check mode the suite runs so a hand edit or a stale
copy fails CI. The model page needs nothing: the card draws every table a page holds, and a
URL cell is already an outside link.

**companygraph.io** moves its meta-model pin and rebuilds the example pages, which is how the
example's new rows reach its model and example pages.

## 6. Version

Core goes to **0.14.0**, a minor. The section is optional on both types, so every instance on
0.13.x conforms under 0.14.0 without touching a page; an instance takes it by re-vendoring
`core/` and recomputing its manifest hashes, as with every core release. The parser is
byte-identical to 0.13.2, so a consumer of it moves its pin and reads the same shape.

## 7. What no check reaches

**A place that shares a name with an entity.** The parser's per-table rule reads the cells:
a table becomes references the moment any cell of any row resolves to an entity. `Where` names
a place in plain words, and a place can share a name with a source — an instance mastered in
Google Workspace that also lists a presence at Google Workspace would see its `## Also at`
table read as references, its other rows failing R4. Nothing in the schema stops it. The
writing rule says what `Where` is, the fixture pins the data case, and the better rule — a
table whose declared columns carry no `ref →` type is data by declaration — is a parser change
this design does not make and names for the day the collision is met.

**A URL that is not the subject.** Nothing verifies that the page at a URL is the subject's
own, or still exists. The writing rule asks for it; only the reader can check it, as with
every URL the model holds.
