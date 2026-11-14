import { BUSINESS_DETAILS, companyLine } from "@flump/business-details";
import { SiteFooter, type SiteFooterRenderLink, siteFooterLink } from "@repo/ui";
import { ExternalLink } from "lucide-react";
import type { FC } from "react";
import { Link } from "react-router-dom";
import { mailto, signupCta } from "../../utils/site";
import { CANONICAL_TOOL_SLUGS, TOOL_SHORT_LABELS } from "../../utils/toolSlugs";
import { getAppUrl } from "../../utils/url";
import {
  footerBottomRow,
  footerExternalIcon,
  footerPlaceholder,
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
            className={BUSINESS_DETAILS.legalName.isPlaceholder ? footerPlaceholder() : undefined}
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
          heading: "Calculators",
          links: CANONICAL_TOOL_SLUGS.map((slug) => ({
            key: slug,
            label: TOOL_SHORT_LABELS[slug],
            href: `/tools/${slug}`,
          })),
        },
        {
          heading: "Platform",
          links: [
            {
              key: "demo",
              label: (
                <>
                  Live interactive demo
                  <ExternalLink aria-hidden="true" className={footerExternalIcon()} size={11} />
                </>
              ),
              href: `${appUrl}/sandbox`,
              newTab: true,
            },
            { key: "mcp", label: "AI and MCP", href: "/mcp" },
            { key: "pricing", label: "Pricing", href: "/pricing" },
            {
              key: "signin",
              label: "Sign in",
              href: `${appUrl}/login`,
              external: true,
            },
            { key: "cta", label: cta.label, href: cta.href, external: cta.external },
          ],
        },
        {
          heading: "Security and support",
          links: [
            { key: "security", label: "Security and privacy", href: "/security" },
            { key: "contact", label: "Contact", href: "/contact" },
          ],
        },
      ]}
      renderLink={renderLink}
    />
  );
};
