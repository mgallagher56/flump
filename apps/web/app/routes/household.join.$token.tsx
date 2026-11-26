import { HouseholdInvitationToken } from "@flump/api-contract";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { redirect } from "react-router";
import { householdNotFound, householdSwitchOn } from "~/features/household/household.server";
import {
  clearHouseholdInviteCookie,
  householdInviteCookie,
} from "~/features/household/household-cookie.server";

// The token is in this URL: the title stays generic and nothing here renders.
export const meta: MetaFunction = ({ error }) => [
  { title: error ? "We cannot find that page | Flump" : "Flump" },
];

/**
 * A household invitation link, `/household/join/<token>` (E34 C3). The token moves into a
 * short-lived HttpOnly cookie and the browser goes on to `/household/join` at once, so the token
 * leaves the address bar and is never in a Referer, the history entry or any page the app renders.
 * With the household switch off the page is the ordinary 404, before any cookie is set. Otherwise
 * only the shape is checked here; `/household/join` asks the backend whether the link can be used.
 */
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  if (!(await householdSwitchOn(request.signal))) throw householdNotFound();
  const token = params.token ?? "";
  const cookie = HouseholdInvitationToken.safeParse(token).success
    ? householdInviteCookie(token, request)
    : clearHouseholdInviteCookie(request);
  return redirect("/household/join", {
    headers: { "Set-Cookie": cookie, "Cache-Control": "no-store" },
  });
};

export default function HouseholdJoinTokenRoute() {
  return null;
}

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
