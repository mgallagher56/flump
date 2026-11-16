import { companyLine } from "@flump/business-details";
import { SiteFooter, type SiteFooterRenderLink } from "@repo/ui";
import type { FC } from "react";
import { Link as RouterLink } from "react-router";
import { APP_VERSION, feedbackMailto } from "~/utils/support";
import { appFooterSpacing } from "./AppFooter.styles";

const renderLink: SiteFooterRenderLink = (link, className, children) => (
  <RouterLink className={className} to={link.href}>
    {children}
  </RouterLink>
);

/**
 * Signed-in web app footer: built on `@repo/ui`'s `SiteFooter` with compact account, support, and
 * guidance essentials, and bottom-bar clearance below the nav breakpoint.
 */
export const AppFooter: FC = () => (
  <SiteFooter
    blurb="Your UK personal finance planner. Figures are for planning and general guidance, not regulated financial advice."
    bottom={companyLine(new Date().getFullYear())}
    className={appFooterSpacing()}
    columns={[
      {
        heading: "Account",
        links: [
          { key: "settings", label: "Settings", href: "/app/profile" },
          { key: "security", label: "Security", href: "/app/profile?tab=security" },
          { key: "data", label: "Data and export", href: "/app/profile?tab=data" },
        ],
      },
      {
        heading: "Resources",
        links: [
          { key: "tools", label: "All calculators", href: "/tools" },
          {
            key: "feedback",
            label: "Send feedback",
            href: feedbackMailto("app", APP_VERSION),
            external: true,
          },
        ],
      },
    ]}
    renderLink={renderLink}
  />
);

export default AppFooter;
