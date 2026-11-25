import { runChecks } from "./runChecks";

// Jest runs on Node (V8). The same function runs on Hermes on a device or emulator; see the
// engine check Maestro flow and docs/audit/plans/E12-spike-notes.md.
describe("runChecks", () => {
  const saved = process.env.EXPO_PUBLIC_API_URL;
  afterEach(() => {
    if (saved === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = saved;
  });

  it("passes every tax vector and formatting case on this engine", () => {
    const report = runChecks();
    expect(report.vectors.failedIds).toEqual([]);
    // The engine's own test pins the exact count; here it must at least cover both regions' income tax.
    expect(report.vectors.checked).toBeGreaterThan(60);
    expect(report.formatting.mismatches).toEqual([]);
    expect(report.formatting.checked).toBeGreaterThan(10);
    expect(report.jsEngine).toBe("Not Hermes");
  });

  it("shows the API address when it is set", () => {
    process.env.EXPO_PUBLIC_API_URL = "http://localhost:3000";
    expect(runChecks().apiAddress).toBe("http://localhost:3000");
  });

  it("says the address is not set, with the reason, when it is missing", () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    expect(runChecks().apiAddress).toBe("Not set (EXPO_PUBLIC_API_URL is not set.)");
  });
});
