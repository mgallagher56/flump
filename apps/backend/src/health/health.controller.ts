import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Controller, Get, HttpCode, HttpStatus, Inject, Res } from "@nestjs/common";
import type { Response } from "express";
import { DataSource } from "typeorm";
import { BOOT_CONFIG, type BootConfig } from "../config/config.module";
import { readLastRetentionSuccess } from "../jobs/retention";
import { retentionScheduleEnabled } from "../jobs/retention.scheduler";
import { SkipRateLimit } from "../security/rate-limit.decorator";

const READINESS_TIMEOUT_MS = 2000;
// TypeORM's default migrations table (typeorm.options.ts sets no migrationsTableName).
const MIGRATIONS_COUNT_SQL = "SELECT count(*)::int AS n FROM migrations";

// Read via fs (not a JSON import) because tsconfig rootDir is ./src. The relative path
// resolves to apps/backend/package.json from both src/health and dist/health.
function readVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, "../../package.json"), "utf8"));
    return typeof pkg.version === "string" ? pkg.version : "unknown";
  } catch {
    return "unknown";
  }
}

const VERSION = readVersion();

function readCommit(): string {
  const sha = process.env.RAILWAY_GIT_COMMIT_SHA?.trim();
  return sha ? sha.slice(0, 7) : "unknown";
}

function hoursSince(at: Date | null): number | null {
  if (!at || Number.isNaN(at.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - at.getTime()) / 3_600_000));
}

@Controller("health")
@SkipRateLimit()
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(BOOT_CONFIG) private readonly bootConfig: BootConfig,
  ) {}

  @Get()
  @HttpCode(200)
  live(@Res({ passthrough: true }) res: Response) {
    res.setHeader("Cache-Control", "no-store");
    return { status: "ok" };
  }

  @Get("ready")
  @HttpCode(200)
  async ready(@Res({ passthrough: true }) res: Response) {
    res.setHeader("Cache-Control", "no-store");
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), READINESS_TIMEOUT_MS);
      });
      const [, rows, retentionAt] = await Promise.race([
        Promise.all([
          this.dataSource.query("SELECT 1"),
          this.dataSource.query(MIGRATIONS_COUNT_SQL),
          // Never makes the service unready: an unreadable record reads as no run.
          readLastRetentionSuccess(this.dataSource).catch(() => null),
        ]),
        timeout,
      ]);
      // Fewer executed than loaded means a migration is pending: not ready. Negated >= so a
      // malformed result (NaN) also reads as not ready.
      if (!(Number(rows?.[0]?.n) >= this.dataSource.migrations.length)) {
        res.status(HttpStatus.SERVICE_UNAVAILABLE);
        return { status: "unavailable" };
      }
      // Retired variables still set are counted, never named (the names are in the boot log). They
      // do not make the service unready: nothing reads them.
      return {
        status: "ok",
        version: VERSION,
        commit: readCommit(),
        configWarnings: this.bootConfig.configWarnings.length,
        // D5 revised: whole hours since the last complete retention purge (null: none recorded),
        // and whether this instance's schedule is on. Over 24 hours means a run is late.
        retentionLastRunHoursAgo: hoursSince(retentionAt),
        retentionSchedule: retentionScheduleEnabled(process.env) ? "on" : "off",
      };
    } catch {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
      return { status: "unavailable" };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
