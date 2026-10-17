// The product kind and the product's kind, held by the instance checks through their real
// schemas: both files are read from disk so the test fails if a schema and the checks part. The
// schemas they reference are bare, as question-kind.test.mjs has them, and a question kind named
// like a product kind is there to prove the reference resolves by its declared type.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { checkInstance } from "../lib/checks.mjs";

const real = (type) => fs.readFileSync(new URL(`../core/${type}-schema.md`, import.meta.url), "utf8");
const head = (type, location) => [`# ${type[0].toUpperCase()}${type.slice(1)} Schema`, "", `> A ${type}.`, "", "## File Location", "", `\`${location}\``, ""];
// Once any schema carries an id every one must, so each bare schema carries a distinct one.
let nextId = 0;
const bare = (type, location) => ["---", `id: 01a00000-0000-7000-8000-${String(++nextId).padStart(12, "0")}`, "---", "", ...head(type, location), "## Frontmatter", "", "No YAML frontmatter.", "",
  "## Sections", "", "| Section | Required | Description |", "| --- | --- | --- |", ""].join("\n");

const kind = (name, rank, { meaning = true } = {}) => ["---", "source: Local", `rank: ${rank}`, "---", "", `# ${name}`, "", "> What sort of thing these products are.", "",
  ...(meaning ? ["## What it means", "", "Opened by a customer. A thing a developer connects is API.", ""] : [])].join("\n");
const product = (name, fm) => ["---", ...fm, "---", "", `# ${name}`, "", "> What it is, and who opens it.", ""].join("\n");

const tree = ({ kinds = [["Application", 10], ["API", 20]], fm = ["source: Local", "domain: Pricing", "kind: Application"], fm2 = ["source: Local", "domain: Pricing", "kind: API"], products = true, missingMeaning = false } = {}) => new Map([
  ["meta/core/product-kind-schema.md", real("product-kind")],
  ["meta/core/product-schema.md", real("product")],
  ["meta/core/source-schema.md", bare("source", "model/sources/*.md")],
  ["meta/core/domain-schema.md", bare("domain", "model/domains/*.md")],
  ["meta/core/question-kind-schema.md", bare("question-kind", "model/question-kinds/*.md")],
  ["model/sources/local.md", "# Local\n\n> Here.\n"],
  ["model/domains/pricing.md", "# Pricing\n\n> What things cost.\n"],
  ["model/question-kinds/company.md", "# Company\n\n> Questions about the company.\n"],
  ...kinds.map(([n, r], i) => [`model/product-kinds/${n.toLowerCase()}.md`, kind(n, r, { meaning: !(missingMeaning && i === 0) })]),
  ...(products ? [
    ["model/products/billing-console.md", product("Billing Console", fm)],
    ["model/products/usage-api.md", product("Usage API", fm2)],
  ] : []),
]);
const failures = (opts) => checkInstance(tree(opts), { core: "meta/core", model: "model" }).failures;
const about = (where, opts, ...words) => failures(opts).filter((f) => f.includes(where) && words.every((w) => f.includes(w)));

test("two products each naming a kind, and kinds with distinct ranks and every section, pass", () => {
  assert.deepEqual(failures(undefined), []);
});

test("a product with no kind fails", () => {
  assert.equal(about("products/billing-console.md", { fm: ["source: Local", "domain: Pricing"] }, "no `kind`").length, 1);
});

test("a product still carrying audience fails as a field the schema does not declare", () => {
  const f = about("products/billing-console.md", { fm: ["source: Local", "domain: Pricing", "kind: Application", "audience: Finance"] }, "audience");
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /`audience` is not declared by the product schema/);
});

test("a kind naming no product kind fails", () => {
  assert.equal(about("products/billing-console.md", { fm: ["source: Local", "domain: Pricing", "kind: Gadget"] }, "\"Gadget\"").length, 1);
});

test("a kind naming a question kind of that name fails, because the reference resolves by its declared type", () => {
  assert.equal(about("products/billing-console.md", { fm: ["source: Local", "domain: Pricing", "kind: Company"] }, "\"Company\"").length, 1);
});

test("two product kinds sharing a rank fail naming both", () => {
  assert.equal(about("product-kind", { kinds: [["Application", 10], ["API", 10]] }, "share rank 10", "\"Application\"", "\"API\"").length, 1);
});

test("a rank that is not a number fails", () => {
  assert.equal(about("product-kinds/application.md", { kinds: [["Application", "first"], ["API", 20]] }, "rank").length, 1);
});

test("a product kind with no What it means fails, so the folder is read", () => {
  assert.equal(about("product-kinds/application.md", { missingMeaning: true }, "no `## What it means`").length, 1);
});

test("a kind no product names fails, and the message says it is unused rather than folded", () => {
  const f = about("product-kinds/page.md", { kinds: [["Application", 10], ["API", 20], ["Page", 30]] }, "0 product pages name it in `kind`");
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /vocabulary nobody uses: name it from a page or remove it \(R16\)/);
  assert.doesNotMatch(f[0], /folded/);
});

test("products and no kinds at all fail on each product's missing kind and nowhere else", () => {
  const f = failures({ kinds: [], fm: ["source: Local", "domain: Pricing"], fm2: ["source: Local", "domain: Pricing"] });
  assert.equal(f.length, 2, f.join("\n"));
  assert.ok(f.every((x) => x.includes("no `kind`")), f.join("\n"));
});

test("an instance with kinds and no products passes, since there is nothing to gather yet", () => {
  assert.deepEqual(failures({ products: false }), []);
});

test("a kind written as a list of two names fails once, as a reference naming more than one entity", () => {
  for (const kind of ["kind: [Application, API]", "kind:\n  - Application\n  - API"]) {
    const f = about("products/billing-console.md", { fm: ["source: Local", "domain: Pricing", kind] });
    assert.equal(f.length, 1, f.join("\n"));
    assert.match(f[0], /`kind` is declared `ref → product-kind` and carries a list; a reference names one entity \(R9\)/);
  }
});

test("a scalar kind passes, and a field declared array of ref → <type> written as a list still does", () => {
  assert.deepEqual(about("products/billing-console.md", undefined), []);
  const files = tree();
  files.set("meta/core/feature-schema.md", ["---", "id: 01a00000-0000-7000-8000-0000000000ff", "---", "", ...head("feature", "model/features/*.md"), "## Frontmatter", "", "| Field | Required | Type | Description |", "| --- | --- | --- | --- |", "| `products` | Yes | array of ref → product | Products. |", "", "## Sections", "", "| Section | Required | Description |", "| --- | --- | --- |", ""].join("\n"));
  files.set("model/features/export.md", "---\nproducts:\n  - Billing Console\n  - Usage API\n---\n\n# Export\n\n> Exports.\n");
  const f = checkInstance(files, { core: "meta/core", model: "model" }).failures.filter((x) => x.includes("features/export.md"));
  assert.deepEqual(f, []);
});
