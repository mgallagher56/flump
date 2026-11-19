import type { FC, ReactNode } from "react";
import { cx } from "../../../styled-system/css";
import { Heading } from "../../primitives/Heading/Heading";
import { Text } from "../../primitives/Text/Text";
import { VisuallyHidden } from "../../primitives/VisuallyHidden/VisuallyHidden";
import {
  siteFooterBlurb,
  siteFooterBottom,
  siteFooterCompactItem,
  siteFooterCompactLink,
  siteFooterCompactList,
  siteFooterCompactNav,
  siteFooterCompactRow,
  siteFooterCompactText,
  siteFooterGrid,
  siteFooterInner,
  siteFooterLink,
  siteFooterList,
  siteFooterRoot,
} from "./SiteFooter.styles";

export interface SiteFooterLink {
  key: string;
  label: ReactNode;
  href: string;
  /** Rendered as a plain anchor (other origin, mailto) instead of through `renderLink`. */
  external?: boolean;
  /** Opens in a new tab. Implies `external`. */
  newTab?: boolean;
  /**
   * Compact footer only: the widths it shows at, so the line never wraps. `belowMd` for a short
   * form on phones, `fromMd` for links that fit only from 768px. Default: every width.
   */
  show?: "always" | "belowMd" | "fromMd";
}

export interface SiteFooterColumn {
  heading: string;
  /** Accessible name of the column's navigation landmark. Defaults to the heading. */
  label?: string;
  links: SiteFooterLink[];
}

export type SiteFooterRenderLink = (
  link: SiteFooterLink,
  className: string,
  children: ReactNode,
) => ReactNode;

export interface SiteFooterProps {
  /**
   * `full` (default): brand and blurb, link columns, then the bottom row. `compact`: one line that
   * marks the end of the page, with `logo` and `bottom` only (the signed-in web app).
   */
  variant?: "full" | "compact";
  /** Short description under the brand name. Full footer only. */
  blurb?: ReactNode;
  /** Link columns. Full footer only. */
  columns?: SiteFooterColumn[];
  /** Bottom row: company line, contact. In the compact footer, the text beside the logo. */
  bottom: ReactNode;
  /** The logo at the start of the compact footer, usually `<HomeLogo />`. */
  logo?: ReactNode;
  /** Compact footer: links on the logo's line, each shown only where the line still fits. */
  links?: SiteFooterLink[];
  /** Compact footer: name of the links' navigation landmark. */
  linksLabel?: string;
  /** Compact footer: show `bottom` from this width only (where it fits after the links). */
  bottomFrom?: "always" | "lg";
  /** Router link slot for in-site links, so the ui package needs no router. */
  renderLink?: SiteFooterRenderLink;
  className?: string;
}

const defaultRenderLink: SiteFooterRenderLink = (link, className, children) => (
  <a className={className} href={link.href}>
    {children}
  </a>
);

/**
 * The footer shared by the web app and the marketing site. The full footer has brand and blurb,
 * then one column of links per entry in `columns`, then a bottom row; each site supplies its own
 * links. The compact footer is a single line, logo then `bottom`, at every width.
 */
export const SiteFooter: FC<SiteFooterProps> = ({
  variant = "full",
  blurb,
  columns = [],
  bottom,
  logo,
  links = [],
  linksLabel = "Footer",
  bottomFrom = "always",
  renderLink = defaultRenderLink,
  className,
}) =>
  variant === "compact" ? (
    <footer className={cx(siteFooterRoot({ variant }), className)}>
      <div className={siteFooterCompactRow()}>
        {logo}
        {links.length > 0 && (
          <nav aria-label={linksLabel} className={siteFooterCompactNav()}>
            <ul className={siteFooterCompactList()}>
              {links.map((link) => (
                <li
                  className={siteFooterCompactItem({ show: link.show ?? "always" })}
                  key={link.key}
                >
                  {link.external || link.newTab ? (
                    <a
                      className={siteFooterCompactLink()}
                      href={link.href}
                      rel={link.newTab ? "noreferrer" : undefined}
                      target={link.newTab ? "_blank" : undefined}
                    >
                      {link.label}
                      {link.newTab && <VisuallyHidden> (opens in a new tab)</VisuallyHidden>}
                    </a>
                  ) : (
                    renderLink(link, siteFooterCompactLink(), link.label)
                  )}
                </li>
              ))}
            </ul>
          </nav>
        )}
        <Text
          as="p"
          className={siteFooterCompactText({ from: bottomFrom })}
          color="muted"
          textStyle="body.sm"
        >
          {bottom}
        </Text>
      </div>
    </footer>
  ) : (
    <footer className={cx(siteFooterRoot(), className)}>
      <div className={siteFooterInner()}>
        <div className={siteFooterGrid()}>
          <div>
            <Heading as="h2" size="md">
              Flump
            </Heading>
            <Text className={siteFooterBlurb()} color="secondary" textStyle="body.sm">
              {blurb}
            </Text>
          </div>

          {columns.map((column) => (
            <nav aria-label={column.label ?? column.heading} key={column.heading}>
              <Heading as="h3" size="sm">
                {column.heading}
              </Heading>
              <ul className={siteFooterList()}>
                {column.links.map((link) => (
                  <li key={link.key}>
                    {link.external || link.newTab ? (
                      <a
                        className={siteFooterLink()}
                        href={link.href}
                        rel={link.newTab ? "noreferrer" : undefined}
                        target={link.newTab ? "_blank" : undefined}
                      >
                        {link.label}
                        {link.newTab && <VisuallyHidden> (opens in a new tab)</VisuallyHidden>}
                      </a>
                    ) : (
                      renderLink(link, siteFooterLink(), link.label)
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className={siteFooterBottom()}>{bottom}</div>
      </div>
    </footer>
  );

export default SiteFooter;
