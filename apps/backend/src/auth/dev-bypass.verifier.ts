import type { AuthenticatedUser, TokenVerifier } from "./token-verifier";

export const DEV_BYPASS_TOKEN = "mock-session-token";
export const DEV_USER: AuthenticatedUser = { id: "dev_user_123" };

export class DevBypassVerifier implements TokenVerifier {
  async verify(token: string): Promise<AuthenticatedUser> {
    if (token !== DEV_BYPASS_TOKEN) {
      throw new Error("invalid token");
    }
    // Local development only: the dev user counts as just signed in, so the recent-login check on
    // destructive routes (BE-04) does not block local testing.
    return { ...DEV_USER, authTime: Math.floor(Date.now() / 1000) };
  }
}
