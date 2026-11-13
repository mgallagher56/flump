// Dependency-free so the web Bun test can share it without importing the backend.

/** Keys that must never appear anywhere in an envelope sent by the hardened init. */
export const LEAKY_KEYS = [
  '"request"',
  '"headers"',
  '"query_string"',
  '"data"',
  '"cookies"',
  '"user"',
  '"server_name"',
  // v11 can add host, device, locale and module metadata that v10 did not send.
  '"os"',
  '"device"',
  '"culture"',
  '"cloud_resource"',
  '"app"',
  '"modules"',
  '"ip_address"',
  '"vars"',
  '"pre_context"',
  '"post_context"',
];

/**
 * Throws if any envelope contains a leaky key, a dynamic sampling context in its header, or an sdk
 * header with more than name and version. Shared by the backend and web Bun envelope tests.
 */
export function assertNoLeakedKeys(envelopes: string[]): void {
  const all = envelopes.join("\n");
  for (const key of LEAKY_KEYS) {
    if (all.includes(key)) throw new Error(`envelope contains ${key}`);
  }
  for (const envelope of envelopes) {
    const header = JSON.parse(envelope.split("\n")[0] ?? "{}") as Record<string, unknown>;
    if ("trace" in header) throw new Error("envelope header carries a dynamic sampling context");
    const sdkKeys = Object.keys((header.sdk ?? {}) as Record<string, unknown>).sort();
    if (sdkKeys.join() !== "name,version") {
      throw new Error(`envelope sdk header has unexpected keys: ${sdkKeys.join()}`);
    }
  }
}
