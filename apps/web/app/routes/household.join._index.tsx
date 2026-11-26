import {
  AcceptHouseholdInvitationResponse,
  HouseholdInvitationPreviewResponse,
  HouseholdResponse,
} from "@flump/api-contract";
import { Button, Card, EmptyState, Heading, Illustration, PageBody } from "@repo/ui";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "react-router";
import {
  data,
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { SharingHelpLine } from "~/features/household/components/SharingHelpLine";
import {
  ALREADY_IN_HOUSEHOLD_MESSAGE,
  INVITE_UNUSABLE_MESSAGE,
  JOIN_BUSY_MESSAGE,
} from "~/features/household/household";
import {
  householdNotFound,
  householdSwitchOn,
  isAlreadyInHousehold,
  isBackendStatus,
} from "~/features/household/household.server";
import {
  clearHouseholdInviteCookie,
  readHouseholdInviteCookie,
} from "~/features/household/household-cookie.server";
import { joinActions, joinCard, joinText } from "~/features/household/household-join.styles";
import { backendFetch } from "~/services/backend-client.server";
import { BackendError } from "~/services/backend-error";
import { throwRouteError } from "~/services/route-error.server";
import { getAuthSession } from "~/utils/auth.server";

export type JoinOutcome = "ready" | "unusable" | "already" | "busy";

export const meta: MetaFunction = ({ error }) => [
  { title: error ? "We cannot find that page | Flump" : "Join a household | Flump" },
];

/**
 * Asks the backend whether households are on. With the switch off it answers 404, and this page
 * then answers exactly like a page that does not exist. Any other failure is an ordinary error.
 */
async function probeHousehold(accessToken: string, signal: AbortSignal) {
  try {
    return await backendFetch("/household", { accessToken, signal, schema: HouseholdResponse });
  } catch (error) {
    if (isBackendStatus(error, 404)) throw householdNotFound();
    throwRouteError(error);
  }
}

/** The outcome for a failed preview or accept, or a thrown response for anything else. */
function outcomeFor(error: unknown): Exclude<JoinOutcome, "ready"> {
  if (isBackendStatus(error, 410, "invite_unusable")) return "unusable";
  if (isAlreadyInHousehold(error)) return "already";
  if (isBackendStatus(error, 429)) return "busy";
  if (isBackendStatus(error, 404)) throw householdNotFound();
  throwRouteError(error);
}

/**
 * With the switch off the page answers like one that does not exist, signed in or out: the switch
 * is asked first, without a session, so no one is sent to sign in for a page that is not there.
 */
async function signedInToken(args: LoaderFunctionArgs | ActionFunctionArgs) {
  if (!(await householdSwitchOn(args.request.signal))) throw householdNotFound();
  const { accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  if (!accessToken) throwRouteError(new BackendError("unauthorised", "/household"));
  return accessToken;
}

/**
 * Where a household link lands once its token is in the cookie (`household.join.$token.tsx`).
 * Shows what joining shares (nothing), checked by the backend without using the link up. A link
 * that cannot be used, for whatever reason, gets one plain message that does not say which.
 */
export const loader = async (args: LoaderFunctionArgs) => {
  const { request } = args;
  const accessToken = await signedInToken(args);
  const state = await probeHousehold(accessToken, request.signal);
  const cleared = {
    "Set-Cookie": clearHouseholdInviteCookie(request),
    "Cache-Control": "no-store",
  };
  if (state.household) return data({ outcome: "already" as JoinOutcome }, { headers: cleared });
  const token = readHouseholdInviteCookie(request);
  if (!token) return data({ outcome: "unusable" as JoinOutcome }, { headers: cleared });
  try {
    await backendFetch("/household/invitations/preview", {
      accessToken,
      method: "POST",
      body: { token },
      idempotencyKey: false,
      signal: request.signal,
      schema: HouseholdInvitationPreviewResponse,
    });
  } catch (error) {
    const outcome = outcomeFor(error);
    // Keep the cookie when busy, so opening the page again a little later still works.
    const headers = outcome === "busy" ? { "Cache-Control": "no-store" } : cleared;
    return data({ outcome: outcome as JoinOutcome }, { headers });
  }
  return data({ outcome: "ready" as JoinOutcome }, { headers: { "Cache-Control": "no-store" } });
};

/** Accepting: single use, and the household is then bound to this account. */
export const action = async (args: ActionFunctionArgs) => {
  const { request } = args;
  const accessToken = await signedInToken(args);
  await probeHousehold(accessToken, request.signal);
  const cleared = {
    "Set-Cookie": clearHouseholdInviteCookie(request),
    "Cache-Control": "no-store",
  };
  const token = readHouseholdInviteCookie(request);
  if (!token) return data({ outcome: "unusable" as JoinOutcome }, { headers: cleared });
  try {
    await backendFetch("/household/invitations/accept", {
      accessToken,
      method: "POST",
      body: { token },
      idempotencyKey: false,
      schema: AcceptHouseholdInvitationResponse,
    });
  } catch (error) {
    const outcome = outcomeFor(error);
    const headers = outcome === "busy" ? { "Cache-Control": "no-store" } : cleared;
    return data({ outcome: outcome as JoinOutcome }, { headers });
  }
  return redirect("/app/profile?tab=household", { headers: cleared });
};

const PROBLEM_COPY: Record<
  Exclude<JoinOutcome, "ready">,
  { title: string; description: string }
> = {
  unusable: { title: "This link cannot be used", description: INVITE_UNUSABLE_MESSAGE },
  already: { title: "You are already in a household", description: ALREADY_IN_HOUSEHOLD_MESSAGE },
  busy: { title: "We could not check this link", description: JOIN_BUSY_MESSAGE },
};

export default function HouseholdJoinRoute() {
  const loaded = useLoaderData<typeof loader>();
  const acted = useActionData<typeof action>();
  const navigation = useNavigation();
  const outcome = acted?.outcome ?? loaded.outcome;
  const joining = navigation.state === "submitting";

  if (outcome !== "ready") {
    const copy = PROBLEM_COPY[outcome];
    return (
      <PageBody>
        <EmptyState
          action={
            <Button asChild variant="outline">
              <Link to="/app">Go to the app</Link>
            </Button>
          }
          description={copy.description}
          headingLevel="h1"
          id="household-join-outcome"
          illustration={<Illustration scene="empty-accounts" size="sm" />}
          title={copy.title}
        />
      </PageBody>
    );
  }

  return (
    <PageBody>
      <Card className={joinCard()} id="household-join" data-testid="household-join">
        <Heading as="h1" size="md">
          Join a household
        </Heading>
        <p className={joinText()}>Joining shares nothing. You choose what to share afterwards.</p>
        <p className={joinText()}>Only accept a link given to you directly.</p>
        <Form className={joinActions()} method="post">
          <Button disabled={joining} type="submit" variant="primary">
            {joining ? "Joining…" : "Join household"}
          </Button>
          <Button asChild variant="outline">
            <Link to="/app">Not now</Link>
          </Button>
        </Form>
        <SharingHelpLine />
      </Card>
    </PageBody>
  );
}

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
