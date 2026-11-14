import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { AgentAuditService } from "./agent-audit.service";

type Env = Record<string, string | undefined>;

export const PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000;
/** First run shortly after boot, so a frequently redeployed service still purges. */
export const PURGE_FIRST_RUN_MS = 5 * 60 * 1000;

/**
 * Off under tests (`NODE_ENV=test`, which Vitest sets) and when `AGENT_AUDIT_PURGE_ENABLED=false`; on everywhere else, so the 13-month
 * retention holds without anyone remembering to turn it on.
 */
export function isPurgeSchedulerEnabled(env: Env): boolean {
  const flag = env.AGENT_AUDIT_PURGE_ENABLED?.trim().toLowerCase();
  if (flag === "false") return false;
  if (flag === "true") return true;
  return env.NODE_ENV !== "test";
}

/**
 * Runs `AgentAuditService.purgeOlderThan13Months()` daily (E17-N17, re-plan PR D). A plain timer
 * rather than @nestjs/schedule: one job does not justify a dependency. The purge is an idempotent
 * DELETE, so overlapping runs from more than one instance are harmless. Timers are unref'd so they
 * never hold the process open, and cleared on shutdown.
 */
@Injectable()
export class AgentAuditPurgeScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AgentAuditPurgeScheduler.name);
  private firstRun: ReturnType<typeof setTimeout> | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(private readonly audit: AgentAuditService) {}

  onModuleInit(): void {
    if (!isPurgeSchedulerEnabled(process.env)) return;
    this.start();
  }

  onModuleDestroy(): void {
    this.stop();
  }

  start(): void {
    this.stop();
    this.firstRun = setTimeout(() => void this.runOnce(), PURGE_FIRST_RUN_MS);
    this.interval = setInterval(() => void this.runOnce(), PURGE_INTERVAL_MS);
    this.firstRun.unref?.();
    this.interval.unref?.();
  }

  stop(): void {
    if (this.firstRun) clearTimeout(this.firstRun);
    if (this.interval) clearInterval(this.interval);
    this.firstRun = null;
    this.interval = null;
  }

  /** One purge; never throws. Returns the rows deleted, or null when skipped or failed. */
  async runOnce(now: Date = new Date()): Promise<number | null> {
    if (this.running) return null;
    this.running = true;
    try {
      const deleted = await this.audit.purgeOlderThan13Months(now);
      if (deleted > 0) this.logger.log(`agent_audit_purge deleted=${deleted}`);
      return deleted;
    } catch (err) {
      this.logger.error(`agent_audit_purge failed: ${err instanceof Error ? err.name : "error"}`);
      return null;
    } finally {
      this.running = false;
    }
  }
}
