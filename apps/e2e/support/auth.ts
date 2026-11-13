import path from "node:path";

/** Saved by global setup: holds only the test-only dev session cookie. Git-ignored. */
export const AUTH_STATE = path.resolve(import.meta.dirname, "../.auth/state.json");
