import { BUSINESS_DETAILS, companyLine, LEGAL_PAGES } from "@flump/business-details";
import { SiteFooter, type SiteFooterRenderLink, siteFooterLink } from "@repo/ui";
import type { FC } from "react";
import { Link } from "react-router-dom";
import { FEATURES, FEATURES_INDEX } from "../../utils/featureAreas";
import { mailto, TAGLINE } from "../../utils/site";
import { getAppUrl } from "../../utils/url";
import { footerBottomRow, footerCompanyLine, footerSpacing } from "./Footer.styles";

const renderLink: SiteFooterRenderLink = (link, className, children) => (
  <Link className={className} to={link.href}>
    {children}
  </Link>
);

/** Marketing footer: the shared `SiteFooter` from `@repo/ui` with the marketing site's links. */
export const Footer: FC = () => {
  const appUrl = getAppUrl();
  const currentYear = new Date().getFullYear();

  return (
    <SiteFooter
      blurb={`${TAGLINE}. A UK planner for your monthly picture, housing costs, debts and pension.`}
      bottom={
        <div className={footerBottomRow()}>
          <span
            className={footerCompanyLine()}
            data-placeholder={BUSINESS_DETAILS.legalName.isPlaceholder || undefined}
          >
            {companyLine(currentYear)}
          </span>
          <a className={siteFooterLink()} href={mailto(BUSINESS_DETAILS.supportEmail.value)}>
            {BUSINESS_DETAILS.supportEmail.value}
          </a>
        </div>
      }
      className={footerSpacing()}
      columns={[
        {
          heading: "Product",
          links: [
            ...FEATURES.map((feature) => ({
              key: feature.key,
              label: feature.name,
              href: feature.path,
            })),
            // After the areas, as in the Features menu (the approved features prototype).
            { key: "features", label: FEATURES_INDEX.menuLabel, href: FEATURES_INDEX.path },
            { key: "preview", label: "Interactive preview", href: "/preview" },
            { key: "pricing", label: "Pricing", href: "/pricing" },
          ],
        },
        {
          heading: "Company",
          links: [
            { key: "security", label: "Security and privacy", href: "/security" },
            { key: "contact", label: "Contact", href: "/contact" },
            // No invite request: invite links are shared by hand (owner, 28 Nov 2026).
            {
              key: "signin",
              label: "Sign in",
              href: `${appUrl}/login`,
              external: true,
            },
          ],
        },
        {
          heading: "Legal",
          links: LEGAL_PAGES.map((page) => ({
            key: page.key,
            label: page.label,
            href: page.path,
          })),
        },
      ]}
      renderLink={renderLink}
    />
  );
};
