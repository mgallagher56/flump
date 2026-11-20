import { BetaInviteToken } from "@flump/api-contract";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { redirect } from "react-router";
import { clearInviteCookie, inviteCookie } from "~/features/invites/invite-cookie.server";

// The token is in this URL: the title stays generic and nothing here renders.
export const meta: MetaFunction = () => [{ title: "Invite | Flump" }];

/**
 * An invite link, `/invite/<token>`. The token moves into a short-lived HttpOnly cookie and the
 * browser goes on to `/invite` at once, so the token leaves the address bar and is never in a
 * Referer, the history entry the rest of the flow runs from, or any page the app renders. Only the
 * shape is checked here; the backend decides whether the link can be used.
 */
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const token = params.token ?? "";
  const cookie = BetaInviteToken.safeParse(token).success
    ? inviteCookie(token, request)
    : clearInviteCookie(request);
  return redirect("/invite", { headers: { "Set-Cookie": cookie, "Cache-Control": "no-store" } });
};

export default function InviteTokenRoute() {
  return null;
}
