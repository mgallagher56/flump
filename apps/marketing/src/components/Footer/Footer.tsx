import { BUSINESS_DETAILS, companyLine } from "@flump/business-details";
import { SiteFooter, type SiteFooterRenderLink, siteFooterLink } from "@repo/ui";
import type { FC } from "react";
import { Link } from "react-router-dom";
import { FEATURES, FEATURES_INDEX } from "../../utils/featureAreas";
import { mailto, signupCta, TAGLINE } from "../../utils/site";
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
  const cta = signupCta();
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
            { key: "features", label: FEATURES_INDEX.title, href: FEATURES_INDEX.path },
            ...FEATURES.map((feature) => ({
              key: feature.key,
              label: feature.name,
              href: feature.path,
            })),
            { key: "preview", label: "Interactive preview", href: "/preview" },
            { key: "pricing", label: "Pricing", href: "/pricing" },
          ],
        },
        // A "Legal" column joins these once the privacy, terms, cookie and accessibility pages
        // exist (EPICS table row 2); none is linked before its page is written.
        {
          heading: "Company",
          links: [
            { key: "security", label: "Security and privacy", href: "/security" },
            { key: "contact", label: "Contact", href: "/contact" },
            { key: "cta", label: cta.label, href: cta.href, external: cta.external },
            {
              key: "signin",
              label: "Sign in",
              href: `${appUrl}/login`,
              external: true,
            },
          ],
        },
      ]}
      renderLink={renderLink}
    />
  );
};
