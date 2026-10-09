# A product names its kind

Core's `product` carries an optional `audience`, a free-text grouping whose own description says that whether an audience becomes an entity "is deliberately open". An instance has now decided it. A retailer the owner keeps a confidential instance for ships three sorts of thing under one type: the chocolate it sells, the channels a customer buys it through, a store or an online shop, and what its IT provides so that a store, a café or a payroll run works, each a product in core's sense, something the company ships that somebody uses on its own, and each opened by somebody else. A word in a frontmatter field cannot say who opens an IT product and where a channel stops and the thing sold through it begins. Core gains `product-kind`, the instance's own set of sorts of product, each a page that says who opens one and what it excludes, and a product names its kind, as a question, a decision and an experience name theirs. `audience` goes.

Status: decided by the owner on October 9, 2026, one question at a time. A kind is an entity and not an enum, because what a company ships is a fact about that company and the kinds differ from one instance to the next; `audience` is dropped rather than kept beside the kind, since who opens a product is what the kind's own page says and a second copy on every product is what the family's one-side rule exists to end; `kind` is required, so every product in every instance names one, as every question does; and the change ships on its own, ahead of a pack for the application and technology layers that the same instance asked for, because this one moves every instance and that one moves none until an instance takes it.

## The type

`product-kind` is owned by nothing, so its files sit in the container, `model/product-kinds/*.md`, beside `products/`, as `question-kinds/` sits beside `questions/` and for the same reason: every product in the instance claims one of the same few, and what each kind covers lives once rather than on every product.

```markdown
# Product Kind Schema

> Required structure for product kind files.

## File Location

`model/product-kinds/*.md`

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |
| `rank` | Yes | number | The kind's position wherever products are drawn grouped. Spaced in tens so a kind can be added without renumbering the others. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Label]` | Yes | The canonical name. Every product references this exact string. |
| `> [Summary]` | Yes | One-paragraph summary of what sort of thing the products of this kind are |
| `## What it means` | Yes | Who opens a product of this kind, which products belong to it, and which do not |
| `## References` | No | Table. What a reader can open to learn more about the kind; its columns are declared below. |
```

`## References` is the What and URL table every type carries.

Purpose, as the schema will say it: a kind answers "what sort of thing does this company ship?", the question a reader cannot otherwise ask of a folder that holds a box of pralines, an online shop and the systems behind a store side by side. Its value is that the answer is a reference rather than a word: two products of one kind are the same sort of thing, a surface can draw the products of one kind together, and the chat can say what the company ships from the model rather than from its own reading. A kind holds at least one product; a kind no product names is vocabulary nobody uses, and leaves.

Writing rules:

- `## What it means` says who opens a product of this kind, a customer, a franchisee, the company's own staff, since that is the one sentence that tells a channel from the systems behind it, and it has nowhere else to live. It is where `audience` went.
- `## What it means` says what the kind excludes as well as what it covers. The boundary between a channel and the thing sold through it, or between what IT provides and what the business sells, is where every disagreement will be.
- `## What it means` is about the sort of thing, never about how well a product of it does, how many there are or what they earn. Those belong to the product, or to nothing in the model.
- The H1 names what the product *is*, `Channel`, `IT product`, not the type it belongs to, `Product`, and not a market or a business unit.
- The page writes names and prose in the model's language (R14), as every page does.

## What `product` declares after it

| Before | After |
| --- | --- |
| `audience`, No, string, "Free-text grouping, e.g. `Staff`. Whether an audience becomes an entity of its own is deliberately open." | gone |
| nothing | `kind`, Yes, ref → product-kind, "What sort of thing this product is, the H1 of a file in `product-kinds/`" |

The product's writing rules gain one line: `kind` is the one a reader looking for this product would look under first; a product that seems to need two is two products, or sits where most readers would look for it. The rule that the tagline names what the product is and who opens it stays: who opens *this* product is the product's own sentence, and the kind says who opens products of its sort. The schema keeps its id (R18), and so does every product, so every `products` reference on a feature keeps its value.

The retailer's instance shows the set carrying: Chocolate at rank 10, opened by a customer, holding the pralines, truffles, tablets and snacks; Channel at 20, opened by a customer in person or online, holding the chocolateries, the online shop, the flagship house and the gift card; IT product at 30, opened by staff in a store, a café or an office, holding what its architecture model calls the IT products, the store systems, the ERP, HR, finance, franchise management and the rest, whose features are the capabilities that model draws for each. The example company's three products split by who opens them: Application, opened by a customer's finance team, holding the Billing Console; Page, opened by a payer who follows a link, holding the Invoice Page; API, opened by a developer, holding the Usage API.

## What the code says

`TYPES` in `lib/checks.mjs` gains `product-kind` at `product-kinds`, gathering products by `kind` with `least` 1: every kind is named by at least one product. The question kind asks for two because a question alone has no reason to be grouped; a company with one application and one API has two products of two kinds, and each kind is right. Nothing else in the code names the type: the checks read `kind` as a `ref → product-kind` from the schema, as they read a question's, and R8 holds `rank` to a number as it does today. The parser, the MCP server, the plugin and the sites read the schema and need no change for the type; none of them reads `audience`, so nothing loses a field it drew.

A test `verify/product-kind.test.mjs`, after `verify/question-kind.test.mjs`, reads both real schemas from disk and proves that a product naming a kind passes, that a product without one fails, that a kind no product names fails, that two kinds of one rank fail, and that a kind without `## What it means` fails. `package.json` runs it with the instance checks. The example takes the three kinds above, its three products name them and drop `audience`, and `example/model/README.md` and the README's list of types name `product-kind` after `product`. The validate skill's gap line and any skill under `agents/` that writes a product name the kind beside the domain.

## How an instance gets across

Nothing is migrated. No instance writes `audience`; the example did, and the example is content of this repository. `upgrade` moves the vendored core and the instance's checks then refuse every product that names no kind, which is the work of the re-pin: one kind file per sort of thing the company ships and one `kind:` line per product. The four instances hold between one and nine products each, so the re-pin is a page or three and a line per product, written by hand and read in review, where a migration would have to invent the kinds it cannot know.

## The order it ships in

1. meta-model: the schema, the product's field, the check, the test, the example and the skills, released as the next minor with the next core version. By the family's practice a release that breaks every instance in 0.x is the next minor; the notes say that every product now names a kind and that the re-pin writes them.
2. The instances re-pin, each with its kinds: robertblust's one, companygraph's one, guestgraph's and the retailer's as their owners name them. Each re-pin is its own pull request, shown before it is committed.
3. robertblust/conventions: one glossary row for `product kind` beside the existing row for `kind`, its German, `Produktart` as proposed, settled by the translator from the reviewed English.
4. The MCP deployments and the sites take the instances' new commits in their next content re-pin; no code moves for this change.

## What was left out

A page drawing products grouped by kind, on any site; nothing draws products today, and `rank` waits for the first page that does. A kind holding at least two products, as a question kind does. A kind on a feature. Carrying the retailer's IT products into the model with the systems behind them, which is the landscape pack, specified next and shipped on its own.

## What it costs

One release that breaks every instance, each carried across by a re-pin that writes its kinds by hand; one new schema, one field moved from a word to a reference, one check entry, one test, three example pages and three edited; and a glossary row.
