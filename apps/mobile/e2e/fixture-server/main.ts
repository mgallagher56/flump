/**
 * Starts the e2e fixture server (E12 S2c) for Maestro flows on an Android emulator:
 *
 *   bun apps/mobile/e2e/fixture-server/main.ts
 *
 * The emulator reaches it as http://10.0.2.2:8787. Nothing here is secret: the client id is a
 * made-up test value and the signing key is created in memory on each start.
 */
import { EMULATOR_HOST, FIXTURE_PORT, startFixtureServer } from "./server";

/** The client id the `e2e` build profile gives the app. Not a WorkOS id. */
export const E2E_CLIENT_ID = "client_e2e_fixture";

const port = Number(process.env.FIXTURE_PORT ?? FIXTURE_PORT);

startFixtureServer({
  port,
  clientId: E2E_CLIENT_ID,
  publicOrigin: `http://${EMULATOR_HOST}:${port}`,
}).then(
  (server) => {
    console.log(`Fixture server on ${server.origin} (the emulator uses ${server.publicOrigin})`);
  },
  (error: unknown) => {
    console.error("Fixture server did not start:", error);
    process.exit(1);
  },
);
