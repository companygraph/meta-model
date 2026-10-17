// The package as a consumer takes it. Every other test here imports from the repository's own
// tree, where `exports` is never read; this one packs the repository, installs the tarball into
// an empty project and reaches it only through `exports`, as beacon does. What it holds:
// every entry of `exports` resolves and loads, the declaration it names is in the tarball, the
// bin is, and a small graph written the way beacon writes one passes the instance checks
// against the core and the pack the tarball carries (R1 to R18).
//
// Nothing leaves the machine: the package has no dependency, so the install reads the tarball
// and nothing else, and the test runs the same on Linux and on Windows.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PKG = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const GRAPH = join(ROOT, "verify", "fixtures", "beacon-graph");
const NAME = PKG.name;

// npm is run through the node that runs this test, so no shell and no PATH lookup is involved:
// `npm_execpath` is set when the test runs under `npm run`, and the copy beside node is the
// fallback for `node --test verify/consumer.test.mjs`.
const npmCli = () => {
  const named = process.env.npm_execpath;
  if (named && /npm-cli\.c?js$/.test(named)) return named;
  const beside = [
    join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"),
    join(dirname(process.execPath), "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"),
  ].find(existsSync);
  assert.ok(beside, "no npm-cli.js beside node, and npm_execpath does not name one");
  return beside;
};
const npm = (args, cwd) =>
  execFileSync(process.execPath, [npmCli(), ...args], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

// Code run as the consumer's own module, in the consumer's project, so a specifier resolves the
// way it does for them.
const inProject = (cwd, code, ...args) =>
  execFileSync(process.execPath, ["--input-type=module", "-e", code, ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

let work;
let project;
let installed;

before(() => {
  work = mkdtempSync(join(tmpdir(), "consumer-"));
  const out = join(work, "pack");
  project = join(work, "project");
  for (const dir of [out, project]) mkdirSync(dir);

  // `--ignore-scripts`: the pack of a repository whose scripts are build steps must not run one.
  const packed = JSON.parse(npm(["pack", "--json", "--ignore-scripts", "--pack-destination", out], ROOT));
  const tarball = join(out, packed[0].filename);

  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "consumer", private: true, type: "module" }));
  npm(["install", "--offline", "--ignore-scripts", "--no-audit", "--no-fund", "--no-package-lock", tarball], project);
  installed = join(project, "node_modules", NAME);
});

after(() => {
  if (work) rmSync(work, { recursive: true, force: true });
});

test("the tarball carries what `exports` and `bin` name", () => {
  for (const [entry, target] of Object.entries(PKG.exports))
    for (const [condition, file] of Object.entries(target))
      assert.ok(existsSync(join(installed, file)), `${entry} names ${file} for "${condition}", and the tarball does not carry it`);
  for (const [bin, file] of Object.entries(PKG.bin))
    assert.ok(existsSync(join(installed, file)), `bin ${bin} names ${file}, and the tarball does not carry it`);
});

test("every entry of `exports` loads from the installed package", () => {
  const specifiers = Object.keys(PKG.exports).map((entry) => `${NAME}/${entry.slice(2)}`);
  const loaded = JSON.parse(
    inProject(
      project,
      `const out = {};
       for (const spec of process.argv.slice(1)) out[spec] = Object.keys(await import(spec)).length;
       console.log(JSON.stringify(out));`,
      ...specifiers,
    ),
  );
  for (const spec of specifiers) assert.ok(loaded[spec] > 0, `${spec} loads and exports nothing`);
});

test("an entry that is not in `exports` is not reachable", () => {
  assert.throws(
    () => inProject(project, `await import(process.argv[1])`, `${NAME}/lib/ids.mjs`),
    /ERR_PACKAGE_PATH_NOT_EXPORTED/,
  );
});

// The consumer's side of the check, run in the consumer's project: the graph and the core and
// pack of the installed package, put into the map the instance checks take. `mutate` is the
// source of a function that may change that map before it is checked.
const checkGraph = (mutate = "() => {}") => {
  const code = `
    import { readFileSync, readdirSync, statSync } from "node:fs";
    import { join } from "node:path";
    import { checkInstance } from "${NAME}/checks";
    import { parseInstance } from "${NAME}/instance";
    const [installed, graph] = process.argv.slice(1);
    const files = new Map();
    const walk = (root, dir, as) => {
      for (const entry of readdirSync(join(root, dir))) {
        const child = dir ? dir + "/" + entry : entry;
        if (statSync(join(root, child)).isDirectory()) walk(root, child, as);
        else files.set(as + "/" + child, readFileSync(join(root, child), "utf8").replace(/\\r\\n/g, "\\n"));
      }
    };
    walk(join(graph, "model"), "", "model");
    walk(join(installed, "core"), "", "meta/core");
    walk(join(installed, "packs", "software"), "", "meta/software");
    (${mutate})(files);
    const { failures, skipped } = checkInstance(files, {
      core: "meta/core",
      model: "model",
      packs: [{ name: "software", dir: "meta/software" }],
    });
    const model = new Map([...files].filter(([p]) => p.startsWith("model/")).map(([p, t]) => [p.slice(6), t]));
    const schemas = new Map([...files].filter(([p]) => p.startsWith("meta/") && p.endsWith("-schema.md")).map(([p, t]) => [p.split("/").pop(), t]));
    let entities = 0, parseError = null;
    try { entities = parseInstance(model, { sub: "model/", schemas }).entities.length; } catch (e) { parseError = e.message; }
    console.log(JSON.stringify({ failures, skipped, entities, parseError }));
  `;
  return JSON.parse(inProject(project, code, installed, GRAPH));
};

test("a beacon graph passes R1 to R18 against the core and the pack the tarball carries", () => {
  const { failures, skipped, entities, parseError } = checkGraph();
  assert.equal(parseError, null, "the parser the package ships refuses the graph");
  assert.deepEqual(failures, [], `the graph fails its own checks:\n${failures.join("\n")}`);
  assert.deepEqual(skipped, [], "a type of the core or the pack has no schema in the tarball");
  assert.ok(entities > 0, "the graph parsed to no entities");
});

test("the same graph fails when a reference is broken", () => {
  // The pass above proves nothing if the checks cannot fail through the package, so one
  // reference the graph holds is pointed at nothing and a failure is asked for.
  const { failures, parseError } = checkGraph(`(files) => {
    const path = "model/risks/an-agent-posts-an-entry.md";
    files.set(path, files.get(path).replace("owner: Owner", "owner: Nobody At All"));
  }`);
  assert.match(parseError ?? "", /Nobody At All/, "the parser let the broken reference through");
  assert.ok(failures.some((f) => f.includes("an-agent-posts-an-entry.md") && f.includes("Nobody At All")), `no failure named the broken reference; got: ${failures.join(" | ") || "none"}`);
});
