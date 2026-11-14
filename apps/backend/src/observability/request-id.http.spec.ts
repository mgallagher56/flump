import {
  Controller,
  Get,
  type INestApplication,
  Injectable,
  Logger,
  type LoggerService,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { applySecurity } from "../config/security.config";
import { createAppLogger } from "./logger";
import { runWithRequestContext } from "./request-context";
import { requestContextMiddleware } from "./request-context.middleware";
import { ScrubbingConsoleLogger } from "./scrubbing-console-logger";

// M14 integration: an inbound x-request-id travels over HTTP into AsyncLocalStorage, back out on
// the response, and onto every log line written while serving the request, including a service's
// own log written after an await.

@Injectable()
class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  async load(): Promise<{ ok: true }> {
    await new Promise((resolve) => setTimeout(resolve, 5));
    this.logger.log("ledger loaded");
    return { ok: true };
  }
}

@Controller("ledger")
class LedgerController {
  constructor(private readonly ledger: LedgerService) {}

  @Get()
  get() {
    return this.ledger.load();
  }
}

const INBOUND = "web-7f3c2a91-req.01";

describe("request id over HTTP (M14)", () => {
  let app: INestApplication;
  let lines: Record<string, unknown>[] = [];
  const previousLogger = (Logger as unknown as { staticInstanceRef?: LoggerService })
    .staticInstanceRef;

  beforeAll(async () => {
    vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
      for (const line of String(chunk).split("\n")) {
        if (line.startsWith("{")) lines.push(JSON.parse(line) as Record<string, unknown>);
      }
      return true;
    });
    const moduleRef = await Test.createTestingModule({
      controllers: [LedgerController],
      providers: [LedgerService],
    }).compile();
    app = moduleRef.createNestApplication({
      bodyParser: false,
      logger: createAppLogger({ LOG_FORMAT: "json" }),
    });
    app.use(requestContextMiddleware);
    applySecurity(app, { NODE_ENV: "test" });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
    if (previousLogger) Logger.overrideLogger(previousLogger);
  });

  beforeEach(() => {
    lines = [];
  });

  it("echoes an inbound id and stamps it on the service log and the access log", async () => {
    const res = await request(app.getHttpServer()).get("/ledger").set("x-request-id", INBOUND);
    expect(res.status).toBe(200);
    expect(res.headers["x-request-id"]).toBe(INBOUND);

    const service = lines.find((l) => l.context === "LedgerService");
    expect(service).toMatchObject({ message: "ledger loaded", requestId: INBOUND });
    const access = lines.find((l) => l.context === "HttpAccess");
    expect(access?.requestId).toBe(INBOUND);
    expect(access?.message).toMatchObject({ requestId: INBOUND, route: "/ledger", status: 200 });
  });

  it("replaces an unsafe inbound id and still ties the lines together", async () => {
    const res = await request(app.getHttpServer())
      .get("/ledger")
      .set("x-request-id", "short id; DROP");
    const id = res.headers["x-request-id"] as string;
    expect(id).not.toContain("DROP");
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(lines.find((l) => l.context === "LedgerService")?.requestId).toBe(id);
  });

  it("keeps concurrent requests apart", async () => {
    const ids = ["concurrent-aaaa-1", "concurrent-bbbb-2", "concurrent-cccc-3"];
    await Promise.all(
      ids.map((id) => request(app.getHttpServer()).get("/ledger").set("x-request-id", id)),
    );
    const serviceIds = lines.filter((l) => l.context === "LedgerService").map((l) => l.requestId);
    expect([...serviceIds].sort()).toEqual(ids);
  });

  it("writes no request id outside a request", () => {
    new Logger("Boot").log("not in a request");
    const line = lines.find((l) => l.context === "Boot");
    expect(line).toBeDefined();
    expect(line).not.toHaveProperty("requestId");
  });
});

describe("ScrubbingConsoleLogger request id outside JSON mode", () => {
  it("prints [rid:<id>] after the context inside a request, nothing outside", () => {
    const writes: string[] = [];
    const spy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation((chunk: string | Uint8Array) => {
        writes.push(String(chunk));
        return true;
      });
    const logger = new ScrubbingConsoleLogger({ colors: false });
    runWithRequestContext({ requestId: INBOUND }, () => logger.log("inside", "Ctx"));
    logger.log("outside", "Ctx");
    // A value that slipped past the middleware's check is never printed.
    runWithRequestContext({ requestId: "bad id\nforged" }, () => logger.log("forged", "Ctx"));
    spy.mockRestore();
    expect(writes[0]).toContain(`[Ctx] [rid:${INBOUND}] inside`);
    expect(writes[1]).not.toContain("rid:");
    expect(writes[2]).not.toContain("rid:");
    expect(writes.join("")).not.toContain("forged\n[");
  });
});
