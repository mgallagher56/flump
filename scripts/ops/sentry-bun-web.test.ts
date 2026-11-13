import { expect, test } from "bun:test";
import { existsSync } from "node:fs";

// Same guard as sentry-bun.test.ts: the web Sentry module resolves @flump/observability from its
// built dist, so jobs that run `bun test ./scripts` before building skip this check.
const observabilityBuilt = existsSync(
  new URL("../../packages/observability/dist/index.js", import.meta.url),
);

// Proves the web Sentry server module sends a scrubbed envelope under Bun (the production runtime).
test.skipIf(!observabilityBuilt)(
  "web Sentry envelope under Bun carries the exception and no sentinels",
  async () => {
    const bodies: string[] = [];
    const sink = Bun.serve({
      port: 0,
      async fetch(request) {
        bodies.push(await request.text());
        return new Response("{}");
      },
    });
    const sentinel = "sentinel.person@example.invalid";
    const dsn = `http://public@127.0.0.1:${sink.port}/1`;
    const errorSpy = console.error;
    console.error = () => {};
    try {
      const { flushSentry, initSentry, reportServerError } = await import(
        "../../apps/web/app/observability/sentry.server"
      );
      expect(initSentry({ SENTRY_DSN: dsn, SENTRY_ENVIRONMENT: "test" })).toBe(true);
      reportServerError(
        new Error(`boom ${sentinel}`),
        new Request(`http://localhost/x?token=SENTINELQUERYVALUE3`, {
          headers: { cookie: "wos-session=SENTINELCOOKIEVALUE2" },
        }),
      );
      await flushSentry(5000);
    } finally {
      console.error = errorSpy;
      await sink.stop(true);
    }
    const envelope = bodies.join("\n");
    expect(envelope).toContain("exception");
    expect(envelope).toContain("message withheld");
    expect(envelope).not.toContain(sentinel);
    expect(envelope).not.toContain("SENTINELQUERYVALUE3");
    expect(envelope).not.toContain("SENTINELCOOKIEVALUE2");
  },
  30_000,
);
