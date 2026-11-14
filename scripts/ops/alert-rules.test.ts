// Keeps docs/runbooks/alert-rules.json (the alerting config the owner applies) in step with the
// code: monitor paths must be the services' real health routes, and the backup heartbeat must
// expect the cron schedule the backup service actually runs on.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");
const json = (p: string) => JSON.parse(readFileSync(resolve(ROOT, p), "utf8"));
const rules = json("docs/runbooks/alert-rules.json");

describe("alert-rules.json", () => {
  test("the backend monitor uses the readiness path Railway also checks", () => {
    const backend = rules.uptimeMonitors.find((m: { service: string }) => m.service === "backend");
    expect(backend.path).toBe(json("apps/backend/railway.json").deploy.healthcheckPath);
    expect(backend.path).toBe("/health/ready");
  });

  test("web and marketing monitors use their healthz routes", () => {
    for (const service of ["web", "marketing"]) {
      const m = rules.uptimeMonitors.find((x: { service: string }) => x.service === service);
      expect(m.path).toBe(json(`apps/${service}/railway.json`).deploy.healthcheckPath);
    }
  });

  test("every monitor checks the ok keyword and alerts after 2 failures", () => {
    for (const m of rules.uptimeMonitors) {
      expect(m.keyword).toBe('"status":"ok"');
      expect(m.alertAfterConsecutiveFailures).toBe(2);
    }
  });

  test("the backup heartbeat expects the backup cron schedule", () => {
    const cron = json("scripts/ops/backup.railway.json").deploy.cronSchedule;
    expect(rules.backupHeartbeat.schedule).toBe(cron);
    expect(rules.backupHeartbeat.timezone).toBe("UTC");
  });

  test("the backup cron service never restarts a failed run and runs backup-run.ts", () => {
    const cfg = json("scripts/ops/backup.railway.json");
    expect(cfg.deploy.restartPolicyType).toBe("NEVER");
    expect(cfg.deploy.startCommand).toBe("bun scripts/ops/backup-run.ts");
    expect(cfg.build.dockerfilePath).toBe("scripts/ops/backup.Dockerfile");
    expect(readFileSync(resolve(ROOT, cfg.build.dockerfilePath), "utf8")).toContain("postgres:18");
  });

  test("holds no secrets or URLs", () => {
    const raw = readFileSync(resolve(ROOT, "docs/runbooks/alert-rules.json"), "utf8");
    expect(raw).not.toMatch(/https?:\/\//);
    expect(raw).not.toMatch(/postgres(ql)?:\/\//);
    expect(raw).not.toMatch(/"[A-Za-z0-9+_-]{32,}={0,2}"/);
  });
});
