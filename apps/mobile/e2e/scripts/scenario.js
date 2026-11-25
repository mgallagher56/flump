// Changes the fixture server's scenario mid-flow without a reset (E12 S2a), for example to reject
// refreshes after a sign-in. SCENARIO is a JSON patch.
const res = http.post("http://127.0.0.1:8787/__fixture/scenario", {
  headers: { "Content-Type": "application/json" },
  body: SCENARIO,
});
if (res.status !== 204) throw new Error(`Fixture scenario refused: ${res.status}`);
