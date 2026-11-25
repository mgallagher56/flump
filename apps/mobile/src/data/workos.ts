/**
 * The two WorkOS token calls (plan section 5.2): the code exchange and the refresh, both as a public
 * client with no secret (workos.com/docs/reference/authkit/authentication). They live in the data
 * door because only `src/data` may call `fetch` (O5 seam 2). Token values never reach a log, an error
 * or a thrown message: a failure is only `rejected` or `unavailable`.
 */
import type { AuthConfig } from "../config";

export interface Tokens {
  readonly accessToken: string;
  readonly refreshToken: string;
}

/**
 * `rejected`: WorkOS refused the code or refresh token (`invalid_grant`), so the session is over.
 * `unavailable`: anything else (no network, a timeout, a 5xx, a 429, an odd body). A refresh token
 * is never given up on an `unavailable`.
 */
export type TokenResult =
  | { ok: true; tokens: Tokens }
  | { ok: false; reason: "rejected" | "unavailable" };

export interface WorkosClient {
  exchangeCode(code: string, verifier: string): Promise<TokenResult>;
  refresh(refreshToken: string): Promise<TokenResult>;
}

export interface WorkosClientOptions extends Pick<AuthConfig, "authBaseUrl" | "clientId"> {
  fetch?: typeof fetch;
  /** Defaults to 15000. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;

const UNAVAILABLE: TokenResult = { ok: false, reason: "unavailable" };

function field(body: unknown, key: string): string | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const value: unknown = Reflect.get(body, key);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function createWorkosClient(options: WorkosClientOptions): WorkosClient {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const url = `${options.authBaseUrl}/user_management/authenticate`;

  async function authenticate(grant: Record<string, string>): Promise<TokenResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await (options.fetch ?? fetch)(url, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ client_id: options.clientId, ...grant }),
        signal: controller.signal,
      });
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        return UNAVAILABLE;
      }
      if (response.ok) {
        const accessToken = field(body, "access_token");
        const refreshToken = field(body, "refresh_token");
        return accessToken && refreshToken
          ? { ok: true, tokens: { accessToken, refreshToken } }
          : UNAVAILABLE;
      }
      if (
        (response.status === 400 || response.status === 401) &&
        field(body, "error") === "invalid_grant"
      ) {
        return { ok: false, reason: "rejected" };
      }
      return UNAVAILABLE;
    } catch {
      return UNAVAILABLE;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    exchangeCode: (code, verifier) =>
      authenticate({ grant_type: "authorization_code", code, code_verifier: verifier }),
    refresh: (refreshToken) =>
      authenticate({ grant_type: "refresh_token", refresh_token: refreshToken }),
  };
}
