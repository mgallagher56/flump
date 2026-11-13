import {
  ConsoleLogger,
  Controller,
  Get,
  type INestApplication,
  Logger,
  Param,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAppLogger } from "./logger";
import { requestContextMiddleware } from "./request-context.middleware";
import {
  escapeControl,
  ScrubbingConsoleLogger,
  sanitizeLogValue,
  sanitizeStack,
} from "./scrubbing-console-logger";

const EMAIL = "sentinel.person@pii-example.com";
const TOKEN = "SENTINELTOKENVALUE99";
const BALANCE = "987654";
const PASSWORD = "hunter2-sentinel";
const SENTINELS = [EMAIL, TOKEN, BALANCE, PASSWORD, "pii-example"];

@Controller()
class BoomController {
  @Get("boom/:id")
  plain(@Param("id") id: string): never {
    throw new Error(`lookup failed for ${EMAIL} id=${id} password=${PASSWORD}`);
  }

  @Get("provider/:id")
  provider(): never {
    const body = JSON.stringify({ balance: Number(BALANCE), token: TOKEN });
    throw new Error(`failed: ${body}`);
  }

  @Get("conn")
  conn(): never {
    throw new Error(`connect postgres://app:${PASSWORD}@db.internal:5432/flump refused`);
  }
}

function capture() {
  const chunks: string[] = [];
  const sink = (chunk: unknown): boolean => {
    chunks.push(String(chunk));
    return true;
  };
  vi.spyOn(process.stdout, "write").mockImplementation(sink as never);
  vi.spyOn(process.stderr, "write").mockImplementation(sink as never);
  return () => chunks.join("");
}

async function boot(env: Record<string, string>): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ controllers: [BoomController] }).compile();
  const app = moduleRef.createNestApplication({ logger: createAppLogger(env) });
  app.use(requestContextMiddleware);
  const quiet = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  await app.init();
  quiet.mockRestore();
  return app;
}

const MODES: Array<[string, Record<string, string>]> = [
  ["json", { LOG_FORMAT: "json" }],
  ["text", { LOG_FORMAT: "text" }],
];

describe("ScrubbingConsoleLogger through a Nest app", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Logger.overrideLogger(false);
  });

  describe.each(MODES)("%s mode", (_name, env) => {
    it("keeps PII out of the unhandled-error output (message and stack)", async () => {
      const app = await boot(env);
      const out = capture();
      const res = await request(app.getHttpServer()).get(`/boom/${EMAIL}`);
      await app.close();
      expect(res.status).toBe(500);
      const text = out();
      expect(text).toContain("ExceptionsHandler");
      expect(text.toLowerCase()).toContain("error");
      for (const s of SENTINELS) expect(text).not.toContain(s);
    });

    it("scrubs a provider-style Error built from an upstream body", async () => {
      const app = await boot(env);
      const out = capture();
      await request(app.getHttpServer()).get("/provider/1");
      await app.close();
      const text = out();
      expect(text).toContain("failed:");
      for (const s of SENTINELS) expect(text).not.toContain(s);
    });

    it("scrubs connection URL credentials", async () => {
      const app = await boot(env);
      const out = capture();
      await request(app.getHttpServer()).get("/conn");
      await app.close();
      const text = out();
      expect(text).not.toContain(PASSWORD);
      expect(text).toContain("postgres://");
    });

    it("keeps the request id, route template, status and context on the access line", async () => {
      const app = await boot(env);
      const out = capture();
      const res = await request(app.getHttpServer()).get("/boom/abc");
      await app.close();
      const requestId = res.headers["x-request-id"] as string;
      const text = out();
      expect(requestId).toMatch(/^[0-9a-f-]{36}$/);
      expect(text).toContain(requestId);
      expect(text).toContain("/boom/:id");
      expect(text).toContain("HttpAccess");
      expect(text).toContain("500");
    });

    it("keeps stack frames readable (function, file and line)", async () => {
      const app = await boot(env);
      const out = capture();
      await request(app.getHttpServer()).get("/boom/abc");
      await app.close();
      expect(out()).toMatch(/BoomController\.plain/);
      expect(out()).toMatch(/scrubbing-console-logger\.spec\.ts:\d+:\d+/);
    });
  });

  describe("direct logger calls", () => {
    it("scrubs objects passed as messages, by key and by value", () => {
      const out = capture();
      createAppLogger({ LOG_FORMAT: "json" }).log(
        { token: TOKEN, password: PASSWORD, nested: { note: `email ${EMAIL}` }, ok: "fine" },
        "Ctx",
      );
      const parsed = JSON.parse(out());
      expect(parsed.context).toBe("Ctx");
      expect(parsed.level).toBe("log");
      expect(parsed.message.ok).toBe("fine");
      for (const s of SENTINELS) expect(out()).not.toContain(s);
    });

    it("scrubs error() with an Error object, its cause and own fields", () => {
      const out = capture();
      const cause = new Error(`inner ${EMAIL}`);
      const err = Object.assign(new Error(`outer password=${PASSWORD}`, { cause }), {
        query: `select * from t where email='${EMAIL}'`,
        code: "ECONNREFUSED",
        detail: BALANCE,
      });
      createAppLogger({ LOG_FORMAT: "json" }).error(err, "Ctx");
      const text = out();
      for (const s of SENTINELS) expect(text).not.toContain(s);
      expect(text).toContain("ECONNREFUSED");
      expect(text).toContain("inner");
    });

    it("scrubs error() with a stack parameter and structured params", () => {
      const out = capture();
      const logger = createAppLogger({ LOG_FORMAT: "text" });
      logger.error(
        `bad ${EMAIL}`,
        `Error: bad ${EMAIL}\n    at fn (/Users/someone/proj/src/a.ts:10:5)`,
        "Ctx",
      );
      logger.warn("with params", { apiKey: TOKEN, requestId: "x", count: 3 });
      const text = out();
      for (const s of SENTINELS) expect(text).not.toContain(s);
      expect(text).toContain("src/a.ts:10:5");
      expect(text).not.toContain("someone");
      expect(text).toContain("[Ctx]");
    });

    it("scrubs a trailing string mistaken for a context", () => {
      const out = capture();
      createAppLogger({ LOG_FORMAT: "json" }).log("msg", `detail ${EMAIL}`);
      expect(out()).not.toContain(EMAIL);
    });

    it("handles non-string, function and class messages", () => {
      const out = capture();
      const logger = createAppLogger({ LOG_FORMAT: "json" });
      logger.log(() => `lazy ${EMAIL}`);
      logger.log(BoomController);
      logger.log(42);
      logger.log([TOKEN]);
      expect(out()).not.toContain(EMAIL);
      expect(out()).toContain("BoomController");
    });

    it("keeps levels", () => {
      const out = capture();
      const logger = createAppLogger({ LOG_FORMAT: "json" });
      logger.warn("w");
      logger.debug?.("d");
      logger.verbose?.("v");
      logger.fatal?.("f");
      expect(out()).toMatch(/"level":"warn"/);
      expect(out()).toMatch(/"level":"fatal"/);
    });
  });

  describe("sanitizers", () => {
    it("falls back to a generic Error name and handles a stackless error", () => {
      const e = new Error(`m ${EMAIL}`);
      e.name = "Bad name with spaces";
      e.stack = undefined;
      const out = sanitizeLogValue(e) as Error;
      expect(out.name).toBe("Error");
      expect(out.stack).not.toContain(EMAIL);
    });

    it("truncates deep cause chains and AggregateError members", () => {
      let e: Error = new Error("leaf");
      for (let i = 0; i < 10; i++) e = new Error(`l${i}`, { cause: e });
      let depth = 0;
      let cur: unknown = sanitizeLogValue(e);
      while (cur instanceof Error) {
        depth += 1;
        cur = cur.cause;
      }
      expect(depth).toBeLessThanOrEqual(7);
      expect(cur).toBe("[truncated]");
      const agg = new AggregateError([new Error(`a ${EMAIL}`), "plain"], "agg");
      const cleaned = sanitizeLogValue(agg) as Error & { errors: unknown[] };
      expect(String((cleaned.errors[0] as Error).message)).not.toContain(EMAIL);
      expect(cleaned.errors).toHaveLength(2);
    });

    it("keeps a non-error non-string cause as scrubbed data", () => {
      const e = new Error("x", { cause: { token: TOKEN } });
      const out = sanitizeLogValue(e) as Error;
      expect(JSON.stringify(out.cause)).not.toContain(TOKEN);
    });

    it("sanitises stacks without frames and non-frame trailing lines", () => {
      expect(sanitizeStack(`just text ${EMAIL}`)).not.toContain(EMAIL);
      const s = sanitizeStack(`Error: x\n    at a (/home/bob/a.ts:1:1)\nCaused by: ${EMAIL}`);
      expect(s).not.toContain(EMAIL);
      expect(s).not.toContain("bob");
      expect(s).toContain("a.ts:1:1");
    });

    it("caps stack size, lines and frame length", () => {
      const frame = `    at fn (/srv/${"d".repeat(2000)}/a.ts:1:1)`;
      const s = sanitizeStack(`Error: x\n${Array(500).fill(frame).join("\n")}`);
      expect(s.split("\n").length).toBeLessThanOrEqual(200);
      expect(Math.max(...s.split("\n").map((l) => l.length))).toBeLessThanOrEqual(500);
    });

    it("keeps access-log fields only when they have a safe shape", () => {
      const id = "123e4567-e89b-12d3-a456-426614174000";
      const ok = sanitizeLogValue({
        requestId: id,
        method: "GET",
        route: "/api/v1/open-banking/connections/:id/sync-transactions",
        status: 200,
        durationMs: 12.3,
        aborted: true,
      });
      expect(ok).toEqual({
        requestId: id,
        method: "GET",
        route: "/api/v1/open-banking/connections/:id/sync-transactions",
        status: 200,
        durationMs: 12.3,
        aborted: true,
      });
      const bad = sanitizeLogValue({
        requestId: TOKEN.repeat(3),
        method: EMAIL,
        route: `/x?token=${TOKEN}`,
        status: 123456,
        durationMs: -1,
        aborted: "yes",
        other: 1,
      }) as Record<string, unknown>;
      expect(JSON.stringify(bad)).not.toContain(TOKEN);
      expect(JSON.stringify(bad)).not.toContain(EMAIL);
      expect(bad.status).toBe("[redacted]");
    });

    it("passes through null prototype objects and primitives", () => {
      const o = Object.create(null);
      o.ok = "fine";
      expect(sanitizeLogValue(o)).toEqual({ ok: "fine" });
      expect(sanitizeLogValue(true)).toBe(true);
      expect(sanitizeLogValue(undefined)).toBeUndefined();
    });
  });

  describe.each(MODES)("fails closed (%s mode)", (_name, env) => {
    const hostile: Array<[string, () => unknown]> = [
      [
        "throwing getter",
        () => ({
          ok: "fine",
          get boom(): string {
            throw new Error(`getter ${EMAIL}`);
          },
        }),
      ],
      [
        "throwing message getter",
        () => {
          const e = new Error("x");
          Object.defineProperty(e, "message", {
            get() {
              throw new Error(`msg ${EMAIL}`);
            },
          });
          return e;
        },
      ],
      [
        "proxy with throwing ownKeys",
        () =>
          new Proxy(
            { secret: EMAIL },
            {
              ownKeys() {
                throw new Error(EMAIL);
              },
            },
          ),
      ],
      [
        "throwing lazy message",
        () => () => {
          throw new Error(EMAIL);
        },
      ],
    ];

    it.each(hostile)("prints a placeholder and never throws (%s)", (_label, make) => {
      const out = capture();
      const logger = createAppLogger(env);
      expect(() => logger.log(make(), "Ctx")).not.toThrow();
      expect(() => logger.error(make(), "Ctx")).not.toThrow();
      expect(() => logger.warn("m", make())).not.toThrow();
      const text = out();
      expect(text).toContain("[log scrubbing failed]");
      expect(text).toContain("Ctx");
      expect(text).not.toContain(EMAIL);
    });

    it("prints a placeholder for hostile params and omits an unsafe context", () => {
      const out = capture();
      const logger = createAppLogger(env);
      logger.log("m", {
        get boom(): string {
          throw new Error(EMAIL);
        },
      });
      expect(out()).not.toContain(EMAIL);
      expect(out()).toContain("log scrubbing failed");
    });
  });

  describe("fail-closed internals", () => {
    class Hostile extends ScrubbingConsoleLogger {
      fail(level: "log" | "error", ctx: unknown, boom = false): void {
        if (boom) {
          vi.spyOn(process.stdout, "write").mockImplementation(() => {
            throw new Error("pipe closed");
          });
          vi.spyOn(process.stderr, "write").mockImplementation(() => {
            throw new Error("pipe closed");
          });
        }
        // biome-ignore lint/suspicious/noExplicitAny: reach the protected seam
        (this as any).printFailure(level, ctx);
      }
    }

    it("prints a safe context only when it has the class-name shape", () => {
      const out = capture();
      new Hostile().fail("log", "Good");
      new Hostile().fail("log", `bad ${EMAIL}`);
      expect(out()).toContain("Good");
      expect(out()).not.toContain(EMAIL);
    });

    it("never throws even if writing fails", () => {
      expect(() => new Hostile().fail("error", "Ctx", true)).not.toThrow();
    });

    it("printStackTrace falls back to the placeholder when printing throws", () => {
      const out = capture();
      const logger = new ScrubbingConsoleLogger();
      // biome-ignore lint/suspicious/noExplicitAny: spy on the protected seam
      vi.spyOn(ConsoleLogger.prototype as any, "printStackTrace").mockImplementation(() => {
        throw new Error(EMAIL);
      });
      // biome-ignore lint/suspicious/noExplicitAny: reach the protected seam
      expect(() => (logger as any).printStackTrace("Error: x\n    at f (/a.js:1:1)")).not.toThrow();
      expect(out()).toContain("[log scrubbing failed]");
      expect(out()).not.toContain(EMAIL);
    });

    it("drops a non-string error stack and non-object params result", () => {
      const out = capture();
      // biome-ignore lint/suspicious/noExplicitAny: reach the protected seam
      (new ScrubbingConsoleLogger({ json: true }) as any).printMessages(
        ["m"],
        "Ctx",
        "error",
        "stderr",
        { raw: EMAIL },
        "not-an-object",
      );
      expect(out()).not.toContain(EMAIL);
      expect(out()).toContain("log scrubbing failed");
    });
  });

  describe("stack rebuilding", () => {
    it("redacts free text after the first frame line", () => {
      const stack = `Error: bad\n    at x (a.js:1:1) alice@example.com 4111 1111 1111 1111\n    at y (b.js:2:2)`;
      const out = sanitizeStack(stack);
      expect(out).not.toContain("alice@example.com");
      expect(out).not.toContain("4111");
      expect(out).toContain("at [redacted]");
    });

    it("redacts free text hidden in an Error stack and text-mode output", () => {
      const out = capture();
      const err = new Error(`bad\n    at x (a.js:1:1) ${EMAIL} 4111 1111 1111 1111`);
      createAppLogger({ LOG_FORMAT: "text" }).error(err);
      expect(out()).not.toContain(EMAIL);
      expect(out()).not.toContain("4111");
    });

    it("strips query and hash from frame paths and handles home dirs in any case", () => {
      const s = sanitizeStack(
        "Error: x\n    at f (file:///Users/Bob/app/a.js?token=abc#h:3:4)\n    at g (C:\\USERS\\Bob\\a.js:1:2)\n    at /HOME/bob/b.js:5:6",
      );
      expect(s).not.toContain("token=abc");
      expect(s).not.toContain("Bob");
      expect(s).not.toContain("bob");
      expect(s).toContain("a.js:3:4");
      expect(s).toContain("b.js:5:6");
    });

    it("accepts async, new and alias frames and anonymous locations", () => {
      const s = sanitizeStack(
        "Error: x\n    at async Promise.all (index 0)\n    at new Promise (<anonymous>)\n    at Object.fn [as run] (/a/b.js:1:1)",
      );
      expect(s.split("\n")).toHaveLength(4);
      expect(s).toContain("[as run]");
    });

    it("redacts a free-text line that merely starts with 'at '", () => {
      const s = sanitizeStack(`Error: x\n    at a b c password is hunter2 ${EMAIL}`);
      expect(s).not.toContain(EMAIL);
    });
  });

  describe("untrusted frame lines", () => {
    it.each([
      ["a plain name with a relative location", "fail\n    at jdoe (a.js:1:1)", ["jdoe"]],
      ["a card number as the name", "x\n    at 4111111111111111 (/a.js:1:1)", ["4111"]],
      ["an email as the location", "x\n    at f (user@example.com:1:1)", ["user@example.com"]],
      ["a token-like location", "x\n    at f (sk_live_abcdef:1:1)", ["sk_live_abcdef"]],
      ["a bare email location", "x\n    at jane.doe@mail.com:1:1", ["jane.doe"]],
      ["a bare word", "x\n    at hunter2", ["hunter2"]],
      ["an email in the path", "x\n    at f (/srv/jane@mail.com/a.js:1:1)", ["jane@mail.com"]],
    ])("replaces %s", (_label, stack, leaked) => {
      const out = sanitizeStack(stack);
      for (const l of leaked) expect(out).not.toContain(l);
      expect(out).toContain("at [redacted]");
    });

    it("keeps real frames with special locations", () => {
      const out = sanitizeStack(
        "Error: x\n    at Array.map (<anonymous>)\n    at f (node:internal/a:1:2)\n    at g (native)\n    at h (/a/b.js:3:4)",
      );
      expect(out).not.toContain("[redacted]");
    });

    it("demotes an alias that the scrubber would change", () => {
      expect(sanitizeStack("x\n    at f [as 4111111111111111] (/a.js:1:1)")).toContain(
        "at [redacted]",
      );
    });
  });

  describe("no-stack output matches the stock logger", () => {
    const count = (fn: () => void): number => {
      const out = capture();
      fn();
      const n = out().split("\n").length;
      vi.restoreAllMocks();
      return n;
    };

    it("error('m') and error(new Error()) print no extra line", () => {
      const stock = new ConsoleLogger({ colors: false });
      const ours = createAppLogger({ LOG_FORMAT: "text" });
      expect(count(() => ours.error("m"))).toBe(count(() => stock.error("m")));
      expect(count(() => ours.error(new Error()))).toBe(count(() => stock.error(new Error())));
      expect(count(() => ours.error("m"))).toBe(2);
    });

    it("never prints a literal undefined", () => {
      const out = capture();
      createAppLogger({ LOG_FORMAT: "text" }).error("m");
      expect(out()).not.toContain("undefined");
    });
  });

  describe("log forging and terminal injection", () => {
    it("text mode escapes line breaks and control characters in messages", () => {
      const out = capture();
      new ScrubbingConsoleLogger({ colors: false }).log(
        "a\n[Nest] 1  - x     LOG [Fake] forged\r\x1b[2Jb c\x07",
      );
      const text = out();
      expect(text.split("\n")).toHaveLength(2);
      expect(text).not.toContain("\x1b");
      expect(text).not.toContain("\r");
      expect(text).not.toContain(" ");
      expect(text).not.toContain("\x07");
      expect(text).toContain("\\n[Nest]");
      expect(text).toContain("\\x1b[2J");
    });

    it("text mode escapes a multi-line Error message in the stack line", () => {
      const out = capture();
      new ScrubbingConsoleLogger({ colors: false }).error(
        new Error("a\n[Nest] 1  - x    LOG forged\x1b[2J"),
      );
      const text = out();
      expect(text).not.toContain("\x1b");
      expect(text).not.toMatch(/^\[Nest\] 1 {2}- x/m);
    });

    it("text mode escapes control characters in the context and stack output", () => {
      const out = capture();
      const logger = new ScrubbingConsoleLogger({ colors: false });
      logger.error("m", "Error: x\n    at f (/a.js:1:1)\x1b[2J", "bad\x1bctx has spaces");
      expect(out()).not.toContain("\x1b");
    });

    it("JSON mode stays valid JSON for hostile text", () => {
      const out = capture();
      createAppLogger({ LOG_FORMAT: "json" }).log("a\n\r\x1b[2J b");
      expect(() => JSON.parse(out())).not.toThrow();
    });

    it("escapeControl handles high code points and plain text", () => {
      expect(escapeControl("ok\ttab")).toBe("ok\ttab");
      expect(escapeControl("\u0085\r\n\x01\u2028")).toBe("\\x85\\r\\n\\x01\\u2028");
    });
  });

  describe("access-log pass-through", () => {
    const base = {
      requestId: "123e4567-e89b-12d3-a456-426614174000",
      method: "GET",
      route: "/a/:id",
      status: 200,
      durationMs: 1.5,
    };

    it("does not pass through partial or extended objects", () => {
      const a = sanitizeLogValue({ route: "hunter2hunter2passwordxyzhunter2hunter2" }) as Record<
        string,
        unknown
      >;
      expect(JSON.stringify(a)).not.toContain("hunter2");
      const b = sanitizeLogValue({
        route: "tok_live_abc123DEF456ghi789JKL012mno345",
        method: "GET",
      });
      expect(JSON.stringify(b)).not.toContain("abc123DEF456");
      const c = sanitizeLogValue({ ...base, extra: EMAIL });
      expect(JSON.stringify(c)).not.toContain(EMAIL);
      expect((c as Record<string, unknown>).durationMs).toBe("[redacted]");
    });

    it("rejects routes that are not templates", () => {
      for (const route of [`/${"a".repeat(40)}`, `/x?token=${TOKEN}`]) {
        const out = sanitizeLogValue({ ...base, route }) as Record<string, unknown>;
        expect(out.route).not.toBe(route);
      }
      expect(sanitizeLogValue({ ...base, route: "unmatched" })).toEqual({
        ...base,
        route: "unmatched",
      });
      expect(sanitizeLogValue({ ...base, aborted: true })).toEqual({ ...base, aborted: true });
      expect(
        (sanitizeLogValue({ ...base, aborted: "yes" }) as Record<string, unknown>).requestId,
      ).toBe("[redacted]");
    });
  });

  describe("error field passthrough", () => {
    it("keeps SQLSTATE, errno names, numeric status and severity but not other fields", () => {
      const e = Object.assign(new Error("x"), {
        code: "23505",
        statusCode: 503,
        status: 500,
        errno: -111,
        severity: "ERROR",
        detail: `Key (email)=(${EMAIL}) exists`,
        statusText: EMAIL,
      });
      const out = sanitizeLogValue(e) as unknown as Record<string, unknown>;
      expect(out.code).toBe("23505");
      expect(out.statusCode).toBe(503);
      expect(out.status).toBe(500);
      expect(out.errno).toBe(-111);
      expect(out.severity).toBe("ERROR");
      expect(JSON.stringify(out)).not.toContain(EMAIL);
    });

    it("redacts unsafe shapes of those fields", () => {
      const e = Object.assign(new Error("x"), {
        code: `has spaces ${EMAIL}`,
        statusCode: 123456,
        severity: EMAIL,
      });
      expect(JSON.stringify(sanitizeLogValue(e))).not.toContain(EMAIL);
    });
  });

  describe("bounded work", () => {
    it.each([
      ["long message", "a".repeat(200_000)],
      ["token run", "password=".repeat(25_000)],
      ["quotes", `secret="${"a ".repeat(100_000)}`],
      ["at signs", "x:y@".repeat(50_000)],
    ])("prints %s quickly and capped", (_label, input) => {
      const out = capture();
      const logger = createAppLogger({ LOG_FORMAT: "json" });
      const start = performance.now();
      logger.log(input);
      logger.error(new Error(input));
      logger.error("m", `Error: ${input}\n    at f (/a/b.ts:1:1)`);
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(1000);
      expect(out().length).toBeLessThan(200_000);
    });
  });
});
