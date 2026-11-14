import { Controller, Get, type INestApplication, Logger, type LoggerService } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as Sentry from "@sentry/node";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { registerReporter } from "../../src/observability/report";
import { requestContextMiddleware } from "../../src/observability/request-context.middleware";
import { initSentry } from "../../src/observability/sentry";
import { SENTINELS, startSink } from "../support/sentry-envelope";

// Decorators applied by hand (no decorator transform under test/).
class TraceController {
  get() {
    return { ok: true };
  }
}
Controller("trace")(TraceController);
Get(":id")(
  TraceController.prototype,
  "get",
  Object.getOwnPropertyDescriptor(TraceController.prototype, "get") as PropertyDescriptor,
);

async function runTrace(env: Record<string, string>): Promise<string[]> {
  const { envelopes, sink, port } = await startSink();
  const previousLogger = (Logger as unknown as { staticInstanceRef?: LoggerService })
    .staticInstanceRef;
  let app: INestApplication | undefined;
  try {
    initSentry({ SENTRY_DSN: `http://public@127.0.0.1:${port}/1`, ...env });
    const moduleRef = await Test.createTestingModule({ controllers: [TraceController] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.use(requestContextMiddleware);
    await app.init();
    await request(app.getHttpServer())
      .get(`/trace/${SENTINELS.body}?token=${SENTINELS.query}`)
      .set("authorization", SENTINELS.header)
      .set("cookie", `session=${SENTINELS.cookie}`)
      .set("x-request-id", "req-trace-0001")
      .expect(200);
    await Sentry.flush(5000);
    return envelopes;
  } finally {
    await app?.close();
    if (previousLogger) Logger.overrideLogger(previousLogger);
    await Sentry.close(2000);
    registerReporter(undefined);
    await new Promise<void>((resolve) => sink.close(() => resolve()));
  }
}

describe("Sentry request trace envelope (real SDK, local sink)", () => {
  it("sends a scrubbed transaction named by route template when sampled", async () => {
    const envelopes = await runTrace({ NODE_ENV: "production", SENTRY_TRACES_SAMPLE_RATE: "1" });
    const body = envelopes.join("");
    expect(body).toContain('"type":"transaction"');
    expect(body).toContain('"transaction":"GET /trace/:id"');
    expect(body).toContain('"request_id":"req-trace-0001"');
    for (const sentinel of Object.values(SENTINELS)) expect(body).not.toContain(sentinel);
    expect(body).not.toContain('"request"');
  });

  it("sends nothing when the sample rate is 0", async () => {
    const envelopes = await runTrace({ NODE_ENV: "production", SENTRY_TRACES_SAMPLE_RATE: "0" });
    expect(envelopes.join("")).not.toContain('"type":"transaction"');
  });
});
