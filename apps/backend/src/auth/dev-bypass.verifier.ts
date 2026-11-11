import type { AuthenticatedUser, TokenVerifier } from "./token-verifier";

export const DEV_BYPASS_TOKEN = "mock-session-token";
export const DEV_USER: AuthenticatedUser = { id: "dev_user_123" };

export class DevBypassVerifier implements TokenVerifier {
  async verify(token: string): Promise<AuthenticatedUser> {
    if (token !== DEV_BYPASS_TOKEN) {
      throw new Error("invalid token");
    }
    return DEV_USER;
  }
}
