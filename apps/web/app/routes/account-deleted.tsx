import type { ReactElement } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { data, useLoaderData } from "react-router";
import { AccountDeletedNotice } from "~/features/settings/components/AccountDeletedNotice";
import { getMarketingUrl } from "~/utils/marketingUrl";

// Signed-out landing page after an account deletion (BE-04). The delete action has already
// cleared the session cookies; the notice clears this browser's per-user storage on mount.
export const loader = ({ request }: LoaderFunctionArgs) =>
  data({ homeUrl: getMarketingUrl(request.url) }, { headers: { "Cache-Control": "no-store" } });

export const meta: MetaFunction = () => [
  { title: "Account deleted | Flump" },
  { name: "robots", content: "noindex" },
];

const AccountDeletedRoute = (): ReactElement => {
  const { homeUrl } = useLoaderData<typeof loader>();
  return <AccountDeletedNotice homeUrl={homeUrl} />;
};

export default AccountDeletedRoute;
