import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from "@nestjs/common";
import { DataSource } from "typeorm";
import {
  COUNTER_POLICY_NAME,
  describeRetentionReport,
  purgeTable,
  RETENTION_POLICIES,
  runRetentionPurge,
} from "./retention";

/** The first check waits this long after boot, plus up to a minute of jitter (D5 revised). */
export const FIRST_CHECK_DELAY_MS = 3 * 60 * 1000;
const FIRST_CHECK_JITTER_MS = 60 * 1000;
/** Between checks. Each check sweeps expired request counters and runs the purge if it is due. */
export const CHECK_INTERVAL_MS = 15 * 60 * 1000;
/** A full purge is due once the last successful run is this old: daily. */
const RUN_EVERY_MS = 24 * 60 * 60 * 1000;

const COUNTER_POLICY = RETENTION_POLICIES.find((p) => p.name === COUNTER_POLICY_NAME);

/** On unless RETENTION_SCHEDULE_ENABLED is false (the env schema allows only true or false). */
export function retentionScheduleEnabled(env: Record<string, string | undefined>): boolean {
  return env.RETENTION_SCHEDULE_ENABLED?.trim().toLowerCase() !== "false";
}

/**
 * Runs the retention purge inside the backend (ruling D5, revised 25 Nov 2026). Every instance
 * checks every 15 minutes, starting a few minutes after boot; the purge itself takes the advisory
 * lock and skips when another run holds it or a run succeeded within the last day, so any number
 * of instances, restarts and the optional cron command never run it twice. Each check uses one
 * dedicated connection from the pool, released at once. A failure is logged (error name only) and
 * retried at the next check; it never reaches the request path or stops the process.
 */
@Injectable()
export class RetentionScheduler implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger("Retention");
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running: Promise<void> | undefined;
  private stopped = false;

  constructor(private readonly dataSource: DataSource) {}

  onApplicationBootstrap(): void {
    if (!retentionScheduleEnabled(process.env)) {
      this.logger.log("retention schedule off (RETENTION_SCHEDULE_ENABLED=false)");
    }
    // Scheduled even when off: the switch is read at each check, so turning it back on needs no
    // restart wherever the platform lets a variable change without one.
    this.schedule(FIRST_CHECK_DELAY_MS + Math.floor(Math.random() * FIRST_CHECK_JITTER_MS));
  }

  async onModuleDestroy(): Promise<void> {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    // Let a run in progress finish its batch and release its lock and connection.
    await this.running;
  }

  private schedule(delayMs: number): void {
    if (this.stopped) return;
    this.timer = setTimeout(() => {
      this.running = this.check().finally(() => {
        this.running = undefined;
        this.schedule(CHECK_INTERVAL_MS);
      });
    }, delayMs);
    // Never keeps the process alive on its own.
    this.timer.unref?.();
  }

  /** One check. Never throws. Public for tests. */
  async check(now: Date = new Date()): Promise<void> {
    if (this.stopped || !retentionScheduleEnabled(process.env)) return;
    const runner = this.dataSource.createQueryRunner();
    try {
      await runner.connect();
      if (COUNTER_POLICY) await purgeTable(runner, COUNTER_POLICY, now);
      const report = await runRetentionPurge(runner, now, RETENTION_POLICIES, {
        trigger: "schedule",
        skipIfSucceededWithinMs: RUN_EVERY_MS,
      });
      // Skips are the normal case between daily runs (or another instance is running): not logged.
      if (!report.skipped) {
        for (const line of describeRetentionReport(report)) this.logger.log(line);
      }
    } catch (error) {
      // The error name only: a database error can quote values from the statement.
      const name = error instanceof Error ? error.name : "error";
      this.logger.error(`retention run failed (${name}); retrying at the next check`);
    } finally {
      await runner.release().catch(() => undefined);
    }
  }
}
