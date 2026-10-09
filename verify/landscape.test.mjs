// verify/landscape.test.mjs
// The landscape pack through its real schema: packs/landscape/ is read from disk, so the test
// fails if the schema and the checks part. The core types a system names are bare, as
// question-kind.test.mjs has them, since the test is about the pack's edges and not their targets.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { checkInstance } from "../lib/checks.mjs";

const pack = (n) => fs.readFileSync(new URL(`../packs/landscape/${n}-schema.md`, import.meta.url), "utf8");
const head = (type, location) => [`# ${type[0].toUpperCase()}${type.slice(1)} Schema`, "", `> A ${type}.`, "", "## File Location", "", `\`${location}\``, ""];
const bare = (type, location) => [...head(type, location), "## Frontmatter", "", "No YAML frontmatter.", "",
  "## Sections", "", "| Section | Required | Description |", "| --- | --- | --- |", ""].join("\n");
const PACKS = [{ name: "landscape", dir: "meta/landscape" }];
const S = "model/systems";
const list = (field, names) => names.length ? `${field}:\n${names.map((n) => `  - ${n}`).join("\n")}\n` : "";
const page = (h1, tagline) => `# ${h1}\n\n> ${tagline}\n`;
const system = ({ kind, vendor, lifecycle, criticality, owner, operator, processor, partOf, domain, realizes = [], serves = [], h1, tagline, body = "" }) => [
  "---", "source: Local", `kind: ${kind}`,
  ...(vendor ? [`vendor: ${vendor}`] : []), ...(lifecycle ? [`lifecycle: ${lifecycle}`] : []), ...(criticality ? [`criticality: ${criticality}`] : []),
  ...(owner ? [`owner: ${owner}`] : []), ...(operator ? [`operator: ${operator}`] : []), ...(processor ? [`processor: ${processor}`] : []),
  ...(partOf ? [`part-of: ${partOf}`] : []), ...(domain ? [`domain: ${domain}`] : []),
  ...(realizes.length ? [list("realizes", realizes).trimEnd()] : []), ...(serves.length ? [list("serves", serves).trimEnd()] : []),
  "---", "", page(h1, tagline) + body,
].join("\n");
const kindPage = (name, element, rank) => `---\nsource: Local\nrank: ${rank}\nelement: ${element}\n---\n\n# ${name}\n\n> A kind of system.\n\n## What it means\n\nWhat is of this kind, and what is not.\n`;
const connects = (rows) => `\n## Connects to\n\n| System | As | Carries | Via |\n| --- | --- | --- | --- |\n${rows.map((r) => `| ${r.join(" | ")} |`).join("\n")}\n`;
const holds = (rows) => `\n## Holds\n\n| Concept | Access |\n| --- | --- |\n${rows.map((r) => `| ${r.join(" | ")} |`).join("\n")}\n`;

const tree = (change = (m) => m) => change(new Map([
  ["meta/landscape/system-schema.md", pack("system")],
  ["meta/landscape/system-kind-schema.md", pack("system-kind")],
  ["meta/core/source-schema.md", bare("source", "model/sources/*.md")],
  ["meta/core/domain-schema.md", bare("domain", "model/domains/*.md")],
  ["meta/core/feature-schema.md", bare("feature", "model/features/*.md")],
  ["meta/core/process-schema.md", bare("process", "model/processes/<process>/<process>.md")],
  ["meta/core/concept-schema.md", bare("concept", "model/concepts/*.md")],
  ["meta/core/seat-schema.md", bare("seat", "model/seats/*.md")],
  ["meta/core/data-processor-schema.md", bare("data-processor", "model/data-processors/*.md")],
  ["model/sources/local.md", page("Local", "Here.")],
  ["model/domains/retail.md", page("Retail", "Where a customer buys.")],
  ["model/features/ring-up-a-sale.md", page("Ring up a sale", "Take what a customer buys and total it.")],
  ["model/features/pay-by-card.md", page("Pay by card", "Settle a sale with a card.")],
  ["model/processes/close-the-day/close-the-day.md", page("Close the day", "What a store does after the last sale.")],
  ["model/processes/close-the-day/phases/README.md", "# Phases\n\n> Nothing yet.\n"],
  ["model/processes/close-the-day/tracks/README.md", "# Tracks\n\n> Nothing yet.\n"],
  ["model/concepts/sale.md", page("Sale", "One purchase at a till.")],
  ["model/concepts/article.md", page("Article", "One thing the company sells.")],
  ["model/concepts/customer.md", page("Customer", "Who buys.")],
  ["model/seats/store-manager.md", page("Store Manager", "Runs a store.")],
  ["model/seats/it-operations.md", page("IT Operations", "Keeps the systems running.")],
  ["model/data-processors/tillpay.md", page("Tillpay", "Settles card payments.")],
  ["model/system-kinds/till-software.md", kindPage("Till software", "application-component", 10)],
  ["model/system-kinds/store-device.md", kindPage("Store device", "device", 20)],
  ["model/system-kinds/server.md", kindPage("Server", "node", 30)],
  ["model/system-kinds/network.md", kindPage("Network", "communication-network", 40)],
  [`${S}/point-of-sale.md`, system({ kind: "Till software", vendor: "Tillworks", lifecycle: "active", criticality: "high", owner: "Store Manager", operator: "IT Operations", partOf: "Store server", realizes: ["Ring up a sale", "Pay by card"], h1: "Point of sale", tagline: "The till software a sale is rung up on.",
    body: connects([["Payment terminal", "Card payment", "Sale", "USB"], ["Payment terminal", "Terminal status", "", "USB"]]) + holds([["Sale", "master"], ["Article", "reads"]]) })],
  [`${S}/payment-terminal.md`, system({ kind: "Store device", vendor: "Tillpay", processor: "Tillpay", lifecycle: "active", criticality: "high", h1: "Payment terminal", tagline: "The card reader beside each till." })],
  [`${S}/store-server.md`, system({ kind: "Server", lifecycle: "active", operator: "IT Operations", partOf: "Store network", serves: ["Close the day"], h1: "Store server", tagline: "The machine in the back office the store's applications run on." })],
  [`${S}/store-network.md`, system({ kind: "Network", domain: "Retail", h1: "Store network", tagline: "The store's wired and wireless network." })],
  [`${S}/article-master.md`, system({ kind: "Till software", lifecycle: "active", domain: "Retail", h1: "Article master", tagline: "Where an article is created and priced.", body: holds([["Article", "master"], ["Customer", "master"]]) })],
]));
const failures = (files) => checkInstance(files, { core: "meta/core", model: "model", packs: PACKS }).failures;
const edit = (path, from, to) => (m) => m.set(path, m.get(path).replace(from, to));
const only = (f, ...words) => f.filter((x) => words.every((w) => x.includes(w)));

test("a small instance written in the pack passes, two interfaces to one system and a device under a processor included", () => {
  assert.deepEqual(failures(tree()), []);
});

test("an element outside the seven fails under R8", () => {
  const f = failures(tree(edit("model/system-kinds/store-device.md", "element: device", "element: gadget")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /store-device\.md.*gadget.*\(R8\)/);
});

test("a kind naming no system kind fails as R4 alone", () => {
  // The Network kind is then named by no system, so its own R16 gather fails beside the R4.
  const f = failures(tree(edit(`${S}/store-network.md`, "kind: Network", "kind: Cable")));
  assert.equal(only(f, "(R4)").length, 1, f.join("\n"));
  assert.match(only(f, "(R4)")[0], /store-network\.md.*"Cable".*\(R4\)/);
  assert.equal(f.length, 2, f.join("\n"));
});

test("a kind no system names fails, and the message says it is unused", () => {
  const f = failures(tree((m) => m.set("model/system-kinds/sensor.md", kindPage("Sensor", "equipment", 50))));
  assert.equal(f.length, 1, f.join("\n"));
  assert.ok(f[0].includes("0 system pages name it in `kind`"), f[0]);
  assert.match(f[0], /vocabulary nobody uses/);
});

test("a lifecycle outside its tokens fails under R8", () => {
  const f = failures(tree(edit(`${S}/point-of-sale.md`, "lifecycle: active", "lifecycle: live")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /point-of-sale\.md.*live.*\(R8\)/);
});

test("a part-of naming no system fails as R4 alone", () => {
  const f = failures(tree(edit(`${S}/point-of-sale.md`, "part-of: Store server", "part-of: Ghost")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /point-of-sale\.md.*"Ghost".*\(R4\)/);
});

test("a realizes naming no feature fails as R4, and a processor naming a seat fails as R4, since a reference resolves by its declared type", () => {
  const a = failures(tree(edit(`${S}/point-of-sale.md`, "  - Pay by card", "  - Pay by cheque")));
  assert.equal(only(a, "point-of-sale.md", "\"Pay by cheque\"", "(R4)").length, 1, a.join("\n"));
  const b = failures(tree(edit(`${S}/payment-terminal.md`, "processor: Tillpay", "processor: IT Operations")));
  assert.equal(only(b, "payment-terminal.md", "\"IT Operations\"", "(R4)").length, 1, b.join("\n"));
});

test("an Access outside its tokens fails under R8", () => {
  const f = failures(tree(edit(`${S}/point-of-sale.md`, "| Article | reads |", "| Article | looks |")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /point-of-sale\.md.*looks.*\(R8\)/);
});

test("a backticked master is R8's alone and is not counted as a second master", () => {
  const f = failures(tree(edit(`${S}/point-of-sale.md`, "| Article | reads |", "| Article | `master` |")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /\(R8\)/);
});

test("a Carries naming no concept fails as R4 alone, because a qualifier resolves as a reference does", () => {
  const f = failures(tree(edit(`${S}/point-of-sale.md`, "| Payment terminal | Card payment | Sale | USB |", "| Payment terminal | Card payment | Receipt | USB |")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /point-of-sale\.md.*"Receipt".*\(R4\)/);
});

test("two rows naming one system with the same As fail once, and a second row with a blank As fails", () => {
  const same = failures(tree(edit(`${S}/point-of-sale.md`, "| Payment terminal | Terminal status |", "| Payment terminal | Card payment |")));
  assert.equal(only(same, "point-of-sale.md", "Card payment", "(R16)").length, 1, same.join("\n"));
  const blank = failures(tree(edit(`${S}/point-of-sale.md`, "| Payment terminal | Terminal status |", "| Payment terminal | |")));
  assert.equal(only(blank, "point-of-sale.md", "As", "(R16)").length, 1, blank.join("\n"));
});

test("a part-of circle of two fails once naming both", () => {
  const f = failures(tree(edit(`${S}/store-network.md`, "kind: Network\n", "kind: Network\npart-of: Store server\n")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /`part-of` runs in a circle.*"Store network".*"Store server".*\(R16\)/);
});

test("two systems holding one concept as master fail once naming both", () => {
  const f = failures(tree(edit(`${S}/point-of-sale.md`, "| Article | reads |", "| Article | master |")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /"Article" is in the "## Holds" Concept of model\/systems\/article-master\.md and model\/systems\/point-of-sale\.md; a concept is in the "## Holds" Concept, in a row whose `Access` is `master`, of one system at most \(R16\)/);
});

test("one master beside writers and readers passes, and a system holding two concepts as master passes", () => {
  const f = failures(tree((m) => {
    edit(`${S}/point-of-sale.md`, "| Article | reads |", "| Article | writes |")(m);
    edit(`${S}/store-server.md`, "> The machine in the back office the store's applications run on.\n", `> The machine in the back office the store's applications run on.\n${holds([["Article", "reads"], ["Sale", "reads"]])}`)(m);
    return m;
  }));
  assert.deepEqual(f, []);
});

test("an Access off the list is R8's alone and is not counted as a master", () => {
  const f = failures(tree(edit(`${S}/point-of-sale.md`, "| Article | reads |", "| Article | Master |")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /\(R8\)/);
});

test("two systems writing one concept pass, since only the master rows count", () => {
  const f = failures(tree((m) => {
    edit(`${S}/point-of-sale.md`, "| Article | reads |", "| Article | writes |")(m);
    edit(`${S}/article-master.md`, "| Article | master |", "| Article | writes |")(m);
    return m;
  }));
  assert.deepEqual(f, []);
});
