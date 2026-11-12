import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import {
  BadRequestException,
  Controller,
  type INestApplication,
  Logger,
  Post,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as Sentry from "@sentry/node";
import request from "supertest";
import { ObservabilityModule } from "../../src/observability/observability.module";
import { initSentry, WITHHELD } from "../../src/observability/sentry";

/** Strings that must never appear in an envelope. */
export const SENTINELS = {
  errorEmail: "sentinel.person@example.invalid",
  errorBearer: "Bearer SENTINELBEARERTOKEN9",
  body: "SENTINELBODYVALUE7",
  header: "SENTINELHEADERVALUE5",
  query: "SENTINELQUERYVALUE3",
  cookie: "SENTINELCOOKIEVALUE2",
};

export const PROVIDER_MESSAGE = "balance 12.5 for John Smith at Tesco Express";

// Decorators are applied by hand so this helper needs no decorator transform (vitest or bun).
class BoomController {
  boom(): never {
    throw new Error(`boom ${SENTINELS.errorEmail} ${SENTINELS.errorBearer}`);
  }
  provider(): never {
    throw new Error(PROVIDER_MESSAGE);
  }
  bad(): never {
    throw new BadRequestException(PROVIDER_MESSAGE);
  }
}
Controller("")(BoomController);
for (const name of ["boom", "provider", "bad"] as const) {
  Post(name)(
    BoomController.prototype,
    name,
    Object.getOwnPropertyDescriptor(BoomController.prototype, name) as PropertyDescriptor,
  );
}

export type Route = "boom" | "provider" | "bad";

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
  route: Route = "boom",
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

  // createNestApplication({ logger: false }) sets Nest's static Logger instance to undefined for
  // the whole process. Under `bun test ./scripts` every test file shares one process, so keep the
  // current instance and restore it, or later tests that read Nest's stdout (seed-cleanup-preview)
  // see nothing.
  const previousLogger = Logger.staticInstanceRef;
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
      .post(`/${route}?token=${SENTINELS.query}`)
      .set("authorization", SENTINELS.header)
      .set("cookie", `session=${SENTINELS.cookie}`)
      .set("x-request-id", "req-envelope-1")
      .send({ secret: SENTINELS.body });

    await Sentry.flush(5000);
    return { status: res.status, envelopes };
  } finally {
    await app?.close();
    if (previousLogger) Logger.overrideLogger(previousLogger);
    await Sentry.close(2000);
    await new Promise<void>((resolve) => sink.close(() => resolve()));
  }
}

/** Throws a descriptive error if an envelope leaks anything it must not. */
export function assertEnvelopeClean(result: EnvelopeResult, expectedMessage = WITHHELD): void {
  if (result.status !== 500) throw new Error(`expected 500, got ${result.status}`);
  const all = result.envelopes.join("\n");
  const exceptionEnvelope = result.envelopes.find((e) => e.includes('"exception"'));
  if (!exceptionEnvelope) throw new Error("no envelope with an exception reached the sink");
  for (const [name, value] of Object.entries(SENTINELS)) {
    if (all.includes(value)) throw new Error(`envelope leaked sentinel: ${name}`);
  }
  for (const leak of ["SENTINELBEARERTOKEN9", "John Smith", "Tesco"]) {
    if (all.includes(leak)) throw new Error(`envelope leaked ${leak}`);
  }
  const keys = ['"request"', '"headers"', '"query_string"', '"data"', '"cookies"', '"user"'];
  for (const key of [...keys, '"server_name"']) {
    if (all.includes(key)) throw new Error(`envelope contains ${key}`);
  }
  if (!all.includes(expectedMessage)) throw new Error(`envelope lacks ${expectedMessage}`);
  if (!all.includes("req-envelope-1")) throw new Error("request id tag missing");
}

/**
 * Throws if Nest's static Logger no longer writes to stdout. Run after `runEnvelopeScenario` so a
 * regression that leaves the logger silenced for the rest of a shared test process is caught here.
 */
export function assertNestLoggerRestored(): void {
  let out = "";
  const original = process.stdout.write;
  process.stdout.write = ((chunk: unknown) => {
    out += String(chunk);
    return true;
  }) as typeof process.stdout.write;
  try {
    new Logger("EnvelopeLoggerCheck").log("logger-restored-check");
  } finally {
    process.stdout.write = original;
  }
  if (!out.includes("logger-restored-check")) {
    throw new Error("Nest Logger stayed silenced after the envelope scenario");
  }
}
