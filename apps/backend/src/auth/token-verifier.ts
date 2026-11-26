export interface AuthenticatedUser {
  id: string;
  email?: string;
  /**
   * When the person last actively signed in, in seconds since the epoch (the WorkOS `auth_time`
   * claim, kept across token refreshes). Absent when the token does not carry it.
   */
  authTime?: number;
  /**
   * The WorkOS session the token belongs to (the verified `sid` claim), so the app can end its own
   * session on sign-out. Absent when the token does not carry a non-empty string `sid`, and always
   * absent under the dev bypass.
   */
  sessionId?: string;
}

export interface TokenVerifier {
  /** Resolves the authenticated user, or throws on any failure. */
  verify(token: string): Promise<AuthenticatedUser>;
}

export const TOKEN_VERIFIER = "TOKEN_VERIFIER";
