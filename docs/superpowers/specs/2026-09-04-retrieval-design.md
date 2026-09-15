# The graph is the index, not the corpus

Retrieval-augmented generation is the obvious thing to reach for once an instance outgrows a
context window, and the obvious way to do it is wrong. This spec says where retrieval belongs
in a CompanyGraph, what it is allowed to do there, and what it must never be allowed to do.

Nothing here is built. It is a design, written down before the first line, because the failure
mode it guards against is one that looks like success.

## The problem retrieval is being asked to solve

An instance is Markdown, and a small one is read whole. That is the whole trick: an agent
loads the graph, follows references by name, and every claim it makes cites a path that
opens. There is no similarity, no ranking, no confidence — a reference either resolves or it
is an error, which is R4.

That stops working twice.

**It stops at size.** A company of one is a few hundred files. A multi-person instance is
thousands, and grows with the company rather than with the model. At some point the graph
does not fit, and something has to choose what enters the context.

**It stops at vocabulary.** Navigation by name requires knowing the names. Someone who has
not read the conventions asks about "the thing that breaks when a group books" and no
reference resolves, because they did not use a canonical name — they used their own words.
The graph cannot answer a question it cannot address.

Those are two different failures and they want different answers. Conflating them is how the
wrong design gets built.

## Why embedding the instance is the wrong answer

The tempting design: chunk every entity file, embed the chunks, retrieve top-k, generate.

It destroys the only properties that make the graph worth having.

- **A type becomes text.** The schema says this file is a `process` owned by a `group`. An
  embedding says it is 800 tokens that mention scheduling. Retrieval then competes with a
  fact the model already knows for certain.
- **A reference becomes a coincidence.** `owner: Platform` is an edge. Chunked, it is a word
  that happens to appear near other words. The graph's edges are exact and free; similarity
  is approximate and expensive, and it is being used to rediscover them.
- **A citation stops being a path.** Today a claim cites `model/processes/check-in.md` and a
  reader opens it. A chunk citation points at an offset into a file that has since moved, and
  the reader has to take it on trust. R4 exists so that a name resolving to nothing is an
  error rather than a guess; retrieval reintroduces the guess one layer up, where no rule
  reaches it.
- **It cannot say "there is no such thing."** Navigation can: the reference does not resolve,
  and that is a complete, correct answer. Top-k retrieval always returns k results. A
  question about a capability the company does not have comes back with the three most
  similar ones and a fluent paragraph, and nothing in the pipeline knows the difference.

That last one is the failure that looks like success, and it is why this is a spec and not a
ticket.

## The design

**The graph is the index. The corpus is everything else.**

Entity bodies are never embedded. What gets retrieved is the unstructured material the graph
points into and does not contain: the company's wiki pages, its chat history, its incident
write-ups, its meeting notes, its customer correspondence. The graph says what exists and who
owns it; that material says what was discussed, tried and decided in prose nobody structured.

Four steps, and retrieval appears in two of them.

**1 — Resolve vocabulary.** Embed only taglines and definitions: the `>` line every entity
carries, plus its canonical name and type. For a thousand-entity instance that is a thousand
short strings, cheap enough to rebuild on every commit. A question in someone's own words is
matched against that index to produce *candidate entity names*, and nothing else. This step
answers no question. It translates a person's vocabulary into the graph's, which is exactly
the thing navigation cannot do and the thing embeddings are actually good at.

**2 — Navigate.** From the resolved entities, follow references: the owner, the decisions
that produced it, the measures attached to it, the roles accountable for it. Exact, typed,
no ranking. This is the ordinary agent pass over a graph, unchanged, except that it now
starts from the right place.

**3 — Retrieve, scoped.** Only now does retrieval touch the corpus, and only within the
boundary navigation established: the wiki space that entity owns, the channel that role
owns, the incidents referencing that capability. The graph has cut the corpus by orders of
magnitude before a single vector is compared, which is why this retrieval can afford to be
narrow and precise rather than broad and lucky.

**4 — Answer with both citations.** Graph claims cite paths that resolve. Corpus claims cite
documents that exist, each one reachable from an entity the reader can also open. A claim
supported by neither is not made.

## Retrieval never generates a claim

Both retrieval steps are constrained to a job that is checkable.

Step 1 returns names that must exist. A name it proposes is passed through the same resolver
R4 governs; a hallucinated entity fails to resolve and the step reports that it found no
match, which is a correct answer. Retrieval cannot invent a name because the graph decides
what is a name.

Step 3 returns documents that must be citable. It selects; it does not summarize into fact.
Anything asserted from a retrieved document is quoted or cited, so a reader can check it
against the source rather than against the model's fluency.

This is the same discipline the conventions already apply elsewhere: an unresolvable
reference is an error rather than a warning, and every validation pass names what it did not
check. Retrieval joins that regime rather than sitting outside it.

## What is deliberately not built

- **No vector store in the repository.** The instance stays plain Markdown in git, readable
  and diffable with no service running. The tagline index is derived and rebuildable from the
  files; losing it costs a rebuild, not a fact. An index committed beside the content would
  become a second source of truth that nothing validates.
- **No embedding of entity bodies**, even as an optimization, even behind a flag. The moment
  a body is embedded, someone will retrieve one, and the citation-is-a-path property is gone
  quietly rather than loudly.
- **No answers from step 1.** It is tempting to let a strong tagline match short-circuit
  straight to a response. That converts a name resolver into an oracle, and it will be right
  often enough that the times it is wrong go unnoticed.
- **No ranking of graph claims.** Two entities either both apply or the reference says which
  one does. A confidence score attached to a structural fact is a category error.

## Three further uses, and why they come later

Each of these is real and none is in the first slice. They are recorded here so that the
first slice is not designed to exclude them.

**Drift detection.** Retrieve the corpus and compare it against what the graph asserts, then
report the contradictions: the process page says one thing, the people doing the process
describe another. This is retrieval used to find disagreement rather than to answer
questions, and it addresses the failure mode that eventually kills every knowledge base —
not being wrong on the day it was written, but being right then and never revisited.

**Decision archaeology.** "Why did we stop doing this?" is answered by an instance's git
history and its superseded decisions, which are numerous, chronological and naturally
filtered by an entity's own path. The commit log of a CompanyGraph is a decision record that
nothing currently reads.

**Intake.** Someone writes a paragraph; retrieval proposes which entities it touches and
which ones do not exist yet, so the graph grows by conversation rather than by schema
knowledge. This is how an instance gets contributions from people who will not read
`core/CONVENTIONS.md`, and it is the same step 1 with a different consumer.

## Success criteria

- A question asked in words that appear nowhere in the graph reaches the right entity, and
  the answer cites paths that open.
- A question about something the company does not have is answered with the fact that it
  does not, not with the nearest three things it does.
- Deleting the derived index and rebuilding it changes no answer.
- Every sentence of an answer is traceable to a resolving path or a citable document, and an
  answer that would need a third kind of support is not produced.

## Open questions

- **What is the corpus, concretely?** It is instance-specific by nature, and core must not
  name a wiki, a chat tool or an issue tracker. The boundary between a portable interface —
  "a corpus is a set of documents addressable by an owner and a URL" — and the connectors an
  instance supplies is not drawn yet.
- **Where does the tagline index live?** Derived and rebuildable is settled; whether it is
  built by the tooling on demand or cached in a location the conventions declare is not.
- **Does this need a rule number?** The constraints in *Retrieval never generates a claim* are
  the kind of thing `CONVENTIONS.md` enforces, but they govern a consuming tool rather than
  the shape of an instance, and nothing in R1-R15 governs a consumer today. Adding the first
  such rule is a bigger decision than this design.
