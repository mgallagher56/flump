import { companyLine } from "@flump/business-details";
import { SiteFooter, type SiteFooterRenderLink } from "@repo/ui";
import type { FC } from "react";
import { Link as RouterLink } from "react-router";
import { APP_VERSION, feedbackMailto } from "~/utils/support";
import { TOOL_TILES } from "../../toolsCatalog";

const renderLink: SiteFooterRenderLink = (link, className, children) => (
  <RouterLink className={className} to={link.href}>
    {children}
  </RouterLink>
);

/**
 * Footer for the public calculator pages: the shared `SiteFooter` with the app's links. Calculator
 * links follow the catalogue order.
 */
export const SignedOutFooter: FC = () => (
  <SiteFooter
    blurb="UK budget, debt and tax calculators. Estimates for guidance, not advice."
    bottom={companyLine(new Date().getFullYear())}
    columns={[
      {
        heading: "Free calculators",
        links: [
          ...TOOL_TILES.slice(0, 4).map((tool) => ({
            key: tool.slug,
            label: tool.shortTitle,
            href: `/tools/${tool.slug}`,
          })),
          { key: "all", label: "All calculators", href: "/tools" },
        ],
      },
      {
        heading: "Account and support",
        links: [
          { key: "signup", label: "Sign up", href: "/signup" },
          { key: "signin", label: "Sign in", href: "/login" },
          {
            key: "feedback",
            label: "Send feedback",
            href: feedbackMailto("tools", APP_VERSION),
            external: true,
          },
        ],
      },
    ]}
    renderLink={renderLink}
  />
);

export default SignedOutFooter;
