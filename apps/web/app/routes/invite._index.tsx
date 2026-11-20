import { RedeemBetaInviteResponse } from "@flump/api-contract";
import { Button, EmptyState, Illustration, PageBody } from "@repo/ui";
import { configure, getSignUpUrl } from "@workos-inc/authkit-react-router";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { data, Link, redirect, useLoaderData } from "react-router";
import { clearInviteCookie, readInviteCookie } from "~/features/invites/invite-cookie.server";
import { backendFetch } from "~/services/backend-client.server";
import { BackendError } from "~/services/backend-error";
import { throwRouteError } from "~/services/route-error.server";
import { getAuthSession } from "~/utils/auth.server";
import { isDevSessionEnabled } from "~/utils/devSession.server";

export const meta: MetaFunction = () => [{ title: "Invite | Flump" }];

type InviteOutcome = "unusable" | "busy";

/**
 * Where an invite link lands once its token is in the cookie (`invite.$token.tsx`).
 * - Signed out: off to sign-up (the one way to sign-up while the beta is invite-only), coming back
 *   here once signed in. Someone with an account can switch to sign-in on that screen.
 * - Signed in: the backend redeems the invite as this person, the cookie is cleared, and the app
 *   opens. A link that cannot be used (used, cancelled, expired) gets one plain page.
 */
export const loader = async (args: LoaderFunctionArgs) => {
  const { request } = args;
  const token = readInviteCookie(request);
  const headers = { "Set-Cookie": clearInviteCookie(request), "Cache-Control": "no-store" };
  if (!token) return data({ outcome: "unusable" as InviteOutcome }, { headers });

  const session = await getAuthSession(args, { ensureSignedIn: false });
  if (!session.accessToken) {
    // Keep the cookie: it is needed again when sign-up comes back here.
    if (isDevSessionEnabled(process.env)) return redirect("/login");
    const url = new URL(request.url);
    if (
      process.env.NODE_ENV === "development" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    ) {
      configure((key: string) =>
        key === "WORKOS_REDIRECT_URI" ? `${url.origin}/callback` : process.env[key],
      );
    }
    const signUp = await getSignUpUrl("/invite", request);
    return redirect(signUp.url, { headers: signUp.headers });
  }

  try {
    await backendFetch("/beta/invites/redeem", {
      accessToken: session.accessToken,
      method: "POST",
      body: { token },
      idempotencyKey: false,
      signal: request.signal,
      schema: RedeemBetaInviteResponse,
    });
  } catch (error) {
    if (error instanceof BackendError && error.status === 410) {
      return data({ outcome: "unusable" as InviteOutcome }, { headers });
    }
    if (error instanceof BackendError && error.status === 429) {
      return data({ outcome: "busy" as InviteOutcome }, { headers });
    }
    throwRouteError(error);
  }
  return redirect("/app", { headers });
};

const COPY: Record<InviteOutcome, { title: string; description: string }> = {
  unusable: {
    title: "This invite link cannot be used",
    description:
      "It may have been used already, cancelled or expired. Ask the person who sent it for a new one.",
  },
  busy: {
    title: "We could not use this invite link right now",
    description: "Wait a few minutes, then open the link again.",
  },
};

export default function InviteRoute() {
  const { outcome } = useLoaderData<typeof loader>();
  const copy = COPY[outcome];
  return (
    <PageBody>
      <EmptyState
        action={
          <Button asChild variant="outline">
            <Link to="/">Go to the home page</Link>
          </Button>
        }
        description={copy.description}
        headingLevel="h1"
        id="invite-outcome"
        illustration={<Illustration scene="empty-accounts" size="sm" />}
        title={copy.title}
      />
    </PageBody>
  );
}
