import { BUSINESS_DETAILS } from "@flump/business-details";
import { HomeLogo, SiteFooter } from "@repo/ui";
import type { FC } from "react";
import { renderHomeLogoLink } from "~/components/navigation/renderHomeLogoLink";
import { appFooterSpacing } from "./AppFooter.styles";

/** "© 2026 Flump Finance Ltd": short enough to stay on one line at 320px beside the logo. */
export function appFooterLine(year: number): string {
  return `© ${year} ${BUSINESS_DETAILS.legalName.value}`;
}

/**
 * Signed-in web app footer: one line that marks the bottom of the page, the logo and the company
 * name, at every width. Settings, security, export and the calculators are in the account menu and
 * the drawer; "Send feedback" is in the account menu; the full company line (number and registered
 * office) is in the marketing site's footer and the signed-out pages' footer.
 */
export const AppFooter: FC = () => (
  <SiteFooter
    bottom={appFooterLine(new Date().getFullYear())}
    className={appFooterSpacing()}
    logo={<HomeLogo renderLink={renderHomeLogoLink} />}
    variant="compact"
  />
);

export default AppFooter;
