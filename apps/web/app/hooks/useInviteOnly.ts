import { useRouteLoaderData } from "react-router";

/**
 * Whether the beta is invite-only, from the root loader (the backend's public `GET /app/beta`).
 * Without root data (the root loader itself failed) it answers "invite-only", so a failure never
 * brings "Sign up" back.
 */
export function useInviteOnly(): boolean {
  const rootData = useRouteLoaderData("root") as { inviteOnly?: unknown } | undefined;
  return rootData?.inviteOnly !== false;
}
