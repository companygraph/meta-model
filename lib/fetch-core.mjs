// The core of another release, as a map of file to text. The one place this tooling reaches the
// network, and the fetch is an argument so a test answers from a fixture instead: a release's
// tarball is not something to download in a suite that must run offline.
export async function fetchCore(tag, get = globalThis.fetch) {
  const url = `https://codeload.github.com/companygraph/meta-model/tar.gz/refs/tags/${tag}`;
  const answer = await get(url);
  if (!answer.ok) throw new Error(`${tag} could not be fetched: ${answer.status}`);
  const { extractCore } = await import("./untar.mjs");
  return extractCore(new Uint8Array(await answer.arrayBuffer()));
}
