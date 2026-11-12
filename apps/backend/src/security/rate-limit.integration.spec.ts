import {
  type CanActivate,
  Controller,
  type ExecutionContext,
  Get,
  type INestApplication,
  Injectable,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FinanceController } from "../../src/finance.controller";
import { HealthController } from "../../src/health/health.controller";
import { McpController } from "../../src/mcp.controller";
import { RateLimit, SkipRateLimit } from "../../src/security";
import { RATE_LIMIT_CLASS, RATE_LIMIT_SKIP } from "../../src/security/rate-limit.decorator";
import { SecurityModule } from "../../src/security/security.module";
import { UserProfileController } from "../../src/user-profile.controller";

@Injectable()
class FakeAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const id = req.headers["x-test-user"];
    if (typeof id === "string") req.user = { id };
    return true;
  }
}

@Controller()
@UseGuards(FakeAuthGuard)
class ProbeController {
  @Post("reset")
  @RateLimit("credential")
  reset() {
    return { ok: true };
  }

  @Get("things")
  things() {
    return { ok: true };
  }

  @Post("things")
  create() {
    return { ok: true };
  }
}

@Controller("health")
@SkipRateLimit()
class ProbeHealthController {
  @Get()
  live() {
    return { status: "ok" };
  }
}

@Controller()
class ProbeMcpController {
  @Post("mcp")
  mcp() {
    return { ok: true };
  }
}

describe("rate limiting (E20-N13)", () => {
  let app: INestApplication;
  let base = "";

  const call = (method: string, path: string, user?: string) =>
    fetch(`${base}${path}`, { method, headers: user ? { "x-test-user": user } : {} });

  // Sequential chunks of parallel requests: fast, without exhausting the listen backlog.
  const burst = async (n: number, method: string, path: string, user?: string) => {
    const out: Response[] = [];
    for (let sent = 0; sent < n; sent += 20) {
      const size = Math.min(20, n - sent);
      out.push(
        ...(await Promise.all(Array.from({ length: size }, () => call(method, path, user)))),
      );
    }
    return out;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SecurityModule],
      controllers: [ProbeController, ProbeHealthController, ProbeMcpController],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.listen(0, "127.0.0.1");
    base = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 429 with Retry-After on the 4th credential request, per user", async () => {
    for (let i = 0; i < 3; i++) {
      expect((await call("POST", "/reset", "alice")).status).toBe(201);
    }
    const blocked = await call("POST", "/reset", "alice");
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
    expect((await blocked.json()).error).toBe("rate_limited");
    // A different user is unaffected.
    expect((await call("POST", "/reset", "bob")).status).toBe(201);
  });

  it("does not limit reads at low volume, and counts writes separately from reads", async () => {
    const reads = await burst(20, "GET", "/things", "carol");
    expect(reads.every((r) => r.status === 200)).toBe(true);
    expect((await call("POST", "/things", "carol")).status).toBe(201);
  });

  it("never limits /health or /mcp", async () => {
    const health = await burst(350, "GET", "/health");
    expect(health.every((r) => r.status === 200)).toBe(true);
    const mcp = await burst(350, "POST", "/mcp");
    expect(mcp.every((r) => r.status === 201)).toBe(true);
  });

  it("applies the per-IP ceiling to non-exempt routes", async () => {
    // Health and mcp above did not consume the IP budget, earlier tests used about 26 of 300.
    const results = await burst(320, "GET", "/things");
    const limited = results.filter((r) => r.status === 429);
    expect(limited.length).toBeGreaterThan(0);
    expect(limited[0].headers.get("retry-after")).not.toBeNull();
  });
});
