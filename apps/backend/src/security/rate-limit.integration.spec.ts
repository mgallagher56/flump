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
import {
  CLIENT_IP_HEADER,
  CLIENT_IP_KEY_ENV,
  CLIENT_IP_SIG_HEADER,
  signClientIp,
} from "../../src/security/signed-client-ip";
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
});

describe("per-IP ceiling (E20-N13)", () => {
  it("allows exactly 300 requests per minute, then returns 429 with Retry-After", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SecurityModule],
      controllers: [ProbeController],
    }).compile();
    const fresh = moduleRef.createNestApplication();
    await fresh.listen(0, "127.0.0.1");
    try {
      const url = `${await fresh.getUrl()}/things`;
      let status: number[] = [];
      for (let sent = 0; sent < 300; sent += 20) {
        const batch = await Promise.all(Array.from({ length: 20 }, () => fetch(url)));
        status = status.concat(batch.map((r) => r.status));
      }
      expect(status.every((c) => c === 200)).toBe(true);
      const blocked = await fetch(url);
      expect(blocked.status).toBe(429);
      expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
    } finally {
      await fresh.close();
    }
  });
});

describe("per-IP ceiling keyed by the signed client IP (M9)", () => {
  // A made-up test key, not a real secret.
  const KEY = "k".repeat(40);
  const saved = process.env[CLIENT_IP_KEY_ENV];

  afterAll(() => {
    if (saved === undefined) delete process.env[CLIENT_IP_KEY_ENV];
    else process.env[CLIENT_IP_KEY_ENV] = saved;
  });

  it("gives each signed browser address its own bucket; a bad signature keys on the socket", async () => {
    process.env[CLIENT_IP_KEY_ENV] = KEY;
    const moduleRef = await Test.createTestingModule({
      imports: [SecurityModule],
      controllers: [ProbeController],
    }).compile();
    const fresh = moduleRef.createNestApplication();
    await fresh.listen(0, "127.0.0.1");
    try {
      const url = `${await fresh.getUrl()}/things`;
      const as = (ip: string, sig = signClientIp(KEY, ip)) =>
        fetch(url, { headers: { [CLIENT_IP_HEADER]: ip, [CLIENT_IP_SIG_HEADER]: sig } });
      let status: number[] = [];
      for (let sent = 0; sent < 300; sent += 20) {
        const batch = await Promise.all(Array.from({ length: 20 }, () => as("203.0.113.7")));
        status = status.concat(batch.map((r) => r.status));
      }
      expect(status.every((c) => c === 200)).toBe(true);
      expect((await as("203.0.113.7")).status).toBe(429);
      // Another web user behind the same web server is unaffected.
      expect((await as("198.51.100.9")).status).toBe(200);
      // A forged header is ignored: the request counts against the socket address instead.
      expect((await as("203.0.113.7", "v1=1.deadbeef")).status).toBe(200);
    } finally {
      await fresh.close();
    }
  });
});
