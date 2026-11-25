// Sets the fixture server's scenario before a flow launches the app (E12 S2a). Maestro runs this on
// the runner, where the fixture server listens on loopback. SCENARIO is a JSON patch from the flow,
// for example {"account": "not-invited"}; "{}" keeps the defaults. Every flow starts from a reset.
const base = "http://127.0.0.1:8787";
const reset = http.post(`${base}/__fixture/reset`, { body: "" });
if (reset.status !== 204) throw new Error(`Fixture reset failed: ${reset.status}`);
if (typeof SCENARIO !== "undefined" && SCENARIO !== "{}") {
  const res = http.post(`${base}/__fixture/scenario`, {
    headers: { "Content-Type": "application/json" },
    body: SCENARIO,
  });
  if (res.status !== 204) throw new Error(`Fixture scenario refused: ${res.status}`);
}
