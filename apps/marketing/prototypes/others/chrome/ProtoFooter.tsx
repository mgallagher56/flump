import { BUSINESS_DETAILS, companyLine, LEGAL_PAGES } from "@flump/business-details";
import { SiteFooter, type SiteFooterRenderLink, siteFooterLink } from "@repo/ui";
import type { FC } from "react";
import { Link } from "react-router-dom";
import {
  footerBottomRow,
  footerCompanyLine,
  footerSpacing,
} from "../../../src/components/Footer/Footer.styles";
import { FEATURES, FEATURES_INDEX } from "../../../src/utils/featureAreas";
import { mailto, signupCta, TAGLINE } from "../../../src/utils/site";
import { getAppUrl } from "../../../src/utils/url";
import { ALL_FEATURES_LABEL } from "../featuresCopy";

const renderLink: SiteFooterRenderLink = (link, className, children) => (
  <Link className={className} to={link.href}>
    {children}
  </Link>
);

/** Marketing footer: the shared `SiteFooter` from `@repo/ui` with the marketing site's links. */
/** Prototype copy of production's Footer: only the features link changes. */
export const ProtoFooter: FC = () => {
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
            ...FEATURES.map((feature) => ({
              key: feature.key,
              label: feature.name,
              href: feature.path,
            })),
            // Prototype: renamed and moved after the areas, as in the Features menu.
            { key: "features", label: ALL_FEATURES_LABEL, href: FEATURES_INDEX.path },
            { key: "preview", label: "Interactive preview", href: "/preview" },
            { key: "pricing", label: "Pricing", href: "/pricing" },
          ],
        },
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
