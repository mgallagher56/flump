import { BUSINESS_DETAILS, companyLine } from "@flump/business-details";
import { SiteFooter, type SiteFooterRenderLink, siteFooterLink } from "@repo/ui";
import { ExternalLink } from "lucide-react";
import type { FC } from "react";
import { Link } from "react-router-dom";
import { mailto, signupCta } from "../../utils/site";
import { getAppUrl } from "../../utils/url";
import {
  footerBottomRow,
  footerCompanyLine,
  footerExternalIcon,
  footerSpacing,
} from "./Footer.styles";

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
      blurb="A UK personal finance planner for your monthly picture, housing costs, debts and pension."
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
            { key: "tools", label: "All calculators", href: "/tools" },
            {
              key: "demo",
              label: (
                <>
                  Try sample data
                  <ExternalLink aria-hidden="true" className={footerExternalIcon()} size={11} />
                </>
              ),
              href: `${appUrl}/sandbox`,
              newTab: true,
            },
            { key: "mcp", label: "AI connection (MCP)", href: "/mcp" },
            { key: "pricing", label: "Pricing", href: "/pricing" },
            {
              key: "signin",
              label: "Sign in",
              href: `${appUrl}/login`,
              external: true,
            },
            { key: "cta", label: cta.label, href: cta.href, external: cta.external },
            { key: "security", label: "Security and privacy", href: "/security" },
            { key: "contact", label: "Contact", href: "/contact" },
          ],
        },
      ]}
      renderLink={renderLink}
    />
  );
};
