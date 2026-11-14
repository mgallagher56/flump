import type { ReactElement } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { data, useLoaderData } from "react-router";
import { AccountDeletedNotice } from "~/features/settings/components/AccountDeletedNotice";
import { getAuthSession } from "~/utils/auth.server";
import { getMarketingUrl } from "~/utils/marketingUrl";

// Signed-out landing page after an account deletion (BE-04). The delete action has already
// cleared the session cookies; the notice clears this browser's per-user storage on mount.
// With `?state=pending` and a live session (the backend answered 410: data erased, login not yet
// removed) it shows the last step instead, which repeats the delete request.
export const loader = async (args: LoaderFunctionArgs) => {
  const { request } = args;
  let pending = false;
  if (new URL(request.url).searchParams.get("state") === "pending") {
    const { accessToken } = await getAuthSession(args, { ensureSignedIn: false });
    pending = Boolean(accessToken);
  }
  return data(
    { homeUrl: getMarketingUrl(request.url), pending },
    { headers: { "Cache-Control": "no-store" } },
  );
};

export const meta: MetaFunction<typeof loader> = ({ data: loaderData }) => [
  {
    title: loaderData?.pending ? "Finish deleting your account | Flump" : "Account deleted | Flump",
  },
  { name: "robots", content: "noindex" },
];

const AccountDeletedRoute = (): ReactElement => {
  const { homeUrl, pending } = useLoaderData<typeof loader>();
  return <AccountDeletedNotice homeUrl={homeUrl} pending={pending} />;
};

export default AccountDeletedRoute;
