import type { AuthenticatedUser } from "./token-verifier";

export type { AuthenticatedUser };

/**
 * The request as a handler behind AuthGuard sees it: `user` is set by the guard from the verified
 * token (never from the body), and `requestId` by the request-context middleware. Controllers type
 * `@Req()` with this instead of `any`.
 */
export interface AuthenticatedRequest {
  user: AuthenticatedUser;
  requestId?: string;
}
