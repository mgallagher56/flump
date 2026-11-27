// After the Budget flow's edit (E12 S10): reads the fixture server's stats on the runner.
// BUDGET_WRITES is the number of budget writes (adds, edits and deletes) the server saved, so a
// what-if input that sent a request, or a save that never left the phone, fails the flow.
const res = http.get("http://127.0.0.1:8787/__fixture/stats");
if (res.status !== 200) throw new Error(`Fixture stats failed: ${res.status}`);
const stats = json(res.body);
if (String(stats.budgetWrites) !== BUDGET_WRITES) {
  throw new Error(`Expected ${BUDGET_WRITES} budget writes, got ${stats.budgetWrites}`);
}
