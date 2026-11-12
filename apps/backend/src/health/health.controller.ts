import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Controller, Get, HttpStatus, Res } from "@nestjs/common";
import type { Response } from "express";
import { DataSource } from "typeorm";
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

@Controller("health")
@SkipRateLimit()
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  live(@Res({ passthrough: true }) res: Response) {
    res.setHeader("Cache-Control", "no-store");
    return { status: "ok" };
  }

  @Get("ready")
  async ready(@Res({ passthrough: true }) res: Response) {
    res.setHeader("Cache-Control", "no-store");
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), READINESS_TIMEOUT_MS);
      });
      const [, rows] = await Promise.race([
        Promise.all([
          this.dataSource.query("SELECT 1"),
          this.dataSource.query(MIGRATIONS_COUNT_SQL),
        ]),
        timeout,
      ]);
      // Fewer executed than loaded means a migration is pending: not ready. Negated >= so a
      // malformed result (NaN) also reads as not ready.
      if (!(Number(rows?.[0]?.n) >= this.dataSource.migrations.length)) {
        res.status(HttpStatus.SERVICE_UNAVAILABLE);
        return { status: "unavailable" };
      }
      return { status: "ok", version: VERSION, commit: readCommit() };
    } catch {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
      return { status: "unavailable" };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
