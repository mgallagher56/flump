export interface AuthenticatedUser {
  id: string;
  email?: string;
}

export interface TokenVerifier {
  /** Resolves the authenticated user, or throws on any failure. */
  verify(token: string): Promise<AuthenticatedUser>;
}

export const TOKEN_VERIFIER = "TOKEN_VERIFIER";
