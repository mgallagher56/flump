import { shortCompanyLine } from "@flump/business-details";
import { HomeLogo, SiteFooter, type SiteFooterLink, type SiteFooterRenderLink } from "@repo/ui";
import type { FC } from "react";
import { Link as RouterLink } from "react-router";
import { renderHomeLogoLink } from "~/components/navigation/renderHomeLogoLink";
import { APP_VERSION, feedbackMailto } from "~/utils/support";
import { appFooterSpacing } from "./AppFooter.styles";

/** "© 2026 Flump Finance Ltd": on the line from 1024px, where it fits after the links. */
export const appFooterLine = shortCompanyLine;

const renderLink: SiteFooterRenderLink = (link, className, children) => (
  <RouterLink className={className} to={link.href}>
    {children}
  </RouterLink>
);

/**
 * The footer's links, as many as fit on one line at each width (owner ruling: the links stay on
 * the logo's line, never a second line). On phones: Settings, Calculators, Send feedback; Security
 * and Data and export are tabs on Settings. From 768px: all five, as the old footer had them.
 * When the privacy notice, terms, accessibility statement and cookie page exist, they go here too.
 */
export const APP_FOOTER_LINKS: SiteFooterLink[] = [
  { key: "settings", label: "Settings", href: "/app/profile" },
  { key: "security", label: "Security", href: "/app/profile?tab=security", show: "fromMd" },
  { key: "data", label: "Data and export", href: "/app/profile?tab=data", show: "fromMd" },
  { key: "tools-short", label: "Calculators", href: "/tools", show: "belowMd" },
  { key: "tools", label: "All calculators", href: "/tools", show: "fromMd" },
  {
    key: "feedback",
    label: "Send feedback",
    href: feedbackMailto("app", APP_VERSION),
    external: true,
  },
];

/**
 * Signed-in web app footer: one line that marks the bottom of the page, at every width: the logo,
 * the links that fit, and the company name where it fits. The full company line (number and
 * registered office) is in the marketing site's footer and the signed-out pages' footer.
 */
export const AppFooter: FC = () => (
  <SiteFooter
    bottom={appFooterLine(new Date().getFullYear())}
    bottomFrom="lg"
    className={appFooterSpacing()}
    links={APP_FOOTER_LINKS}
    linksLabel="Footer"
    logo={<HomeLogo renderLink={renderHomeLogoLink} />}
    renderLink={renderLink}
    variant="compact"
  />
);
