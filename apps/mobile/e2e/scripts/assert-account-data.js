// After the export or the deletion flow (E12 S9): reads the fixture server's stats on the runner.
// EXPORTS is the number of export files served; DELETIONS the number of deletions that removed the
// login. Either may be left out.
const res = http.get("http://127.0.0.1:8787/__fixture/stats");
if (res.status !== 200) throw new Error(`Fixture stats failed: ${res.status}`);
const stats = json(res.body);
if (typeof EXPORTS !== "undefined" && String(stats.exports) !== EXPORTS) {
  throw new Error(`Expected ${EXPORTS} exports, got ${stats.exports}`);
}
if (typeof DELETIONS !== "undefined" && String(stats.deletions) !== DELETIONS) {
  throw new Error(`Expected ${DELETIONS} deletions, got ${stats.deletions}`);
}
