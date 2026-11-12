import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Controller, type INestApplication, Post } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as Sentry from "@sentry/node";
import request from "supertest";
import { ObservabilityModule } from "../../src/observability/observability.module";
import { initSentry } from "../../src/observability/sentry";

/** Strings that must never appear in an envelope. */
export const SENTINELS = {
  errorEmail: "sentinel.person@example.invalid",
  errorBearer: "Bearer SENTINELBEARERTOKEN9",
  body: "SENTINELBODYVALUE7",
  header: "SENTINELHEADERVALUE5",
  query: "SENTINELQUERYVALUE3",
};

// Decorators are applied by hand so this helper needs no decorator transform (vitest or bun).
class BoomController {
  boom(): never {
    throw new Error(`boom ${SENTINELS.errorEmail} ${SENTINELS.errorBearer}`);
  }
}
Controller("boom")(BoomController);
Post()(
  BoomController.prototype,
  "boom",
  Object.getOwnPropertyDescriptor(BoomController.prototype, "boom") as PropertyDescriptor,
);

export interface EnvelopeResult {
  status: number;
  envelopes: string[];
}

/**
 * Starts a local sink, points Sentry at it, throws a sentinel-laden error through a Nest app
 * and returns everything the sink received. Works under vitest (node) and `bun test`.
 */
export async function runEnvelopeScenario(
  extraEnv: Record<string, string> = {},
): Promise<EnvelopeResult> {
  const envelopes: string[] = [];
  const sink = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      envelopes.push(Buffer.concat(chunks).toString("utf8"));
      res.writeHead(200, { "content-type": "application/json" });
      res.end("{}");
    });
  });
  await new Promise<void>((resolve) => sink.listen(0, "127.0.0.1", resolve));
  const port = (sink.address() as AddressInfo).port;

  let app: INestApplication | undefined;
  try {
    initSentry({ SENTRY_DSN: `http://public@127.0.0.1:${port}/1`, ...extraEnv });
    const moduleRef = await Test.createTestingModule({
      imports: [ObservabilityModule],
      controllers: [BoomController],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();

    const res = await request(app.getHttpServer())
      .post(`/boom?token=${SENTINELS.query}`)
      .set("authorization", SENTINELS.header)
      .set("x-request-id", "req-envelope-1")
      .send({ secret: SENTINELS.body });

    await Sentry.flush(5000);
    return { status: res.status, envelopes };
  } finally {
    await app?.close();
    await Sentry.close(2000);
    await new Promise<void>((resolve) => sink.close(() => resolve()));
  }
}

/** Throws a descriptive error if an envelope leaks anything it must not. */
export function assertEnvelopeClean(result: EnvelopeResult): void {
  if (result.status !== 500) throw new Error(`expected 500, got ${result.status}`);
  const all = result.envelopes.join("\n");
  const exceptionEnvelope = result.envelopes.find((e) => e.includes('"exception"'));
  if (!exceptionEnvelope) throw new Error("no envelope with an exception reached the sink");
  for (const [name, value] of Object.entries(SENTINELS)) {
    if (all.includes(value)) throw new Error(`envelope leaked sentinel: ${name}`);
  }
  if (all.includes("SENTINELBEARERTOKEN9")) throw new Error("envelope leaked bearer token");
  for (const key of ['"request"', '"headers"', '"query_string"', '"data"', '"cookies"']) {
    if (all.includes(key)) throw new Error(`envelope contains ${key}`);
  }
  if (!all.includes("req-envelope-1")) throw new Error("request id tag missing");
}
