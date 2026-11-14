import type { FC, ReactNode } from "react";
import { cx } from "../../../styled-system/css";
import {
  pageHeaderAside,
  pageHeaderBadge,
  pageHeaderContainer,
  pageHeaderDescription,
  pageHeaderText,
  pageHeaderTitle,
} from "./PageHeader.styles";

export interface PageHeaderProps {
  /** Plain, sentence-case page title. Renders the page `h1`. */
  title: string;
  /** One line under the title, at most one sentence and no figures (E16 P13). */
  description?: string;
  /** @deprecated Use `description`. Kept so existing screens keep working. */
  subtitle?: string;
  /**
   * The one actions slot, shown top right: one primary button (the page's only primary, E16 P7.4)
   * and at most one secondary. Anything more belongs in the page body or a menu.
   */
  actions?: ReactNode;
  /**
   * Quiet status pill beside the actions, for example "Sample data". A string renders the
   * standard outlined pill; pass a node to supply your own.
   */
  badge?: ReactNode;
  className?: string;
}

/**
 * The page's h1, one-line description and one actions slot. It has no notice slot: the page's one
 * `ProjectionNotice` sits at the foot of the first projection region, never above or beside the h1
 * (E16 P4.1). Nothing but the app header sits above it.
 */
export const PageHeader: FC<PageHeaderProps> = ({
  title,
  description,
  subtitle,
  actions,
  badge,
  className,
}) => {
  const text = description ?? subtitle;
  return (
    <header className={cx(pageHeaderContainer(), className)}>
      <div className={pageHeaderText()}>
        <h1 className={pageHeaderTitle()}>{title}</h1>
        {text && <p className={pageHeaderDescription()}>{text}</p>}
      </div>
      {(badge || actions) && (
        <div className={pageHeaderAside()}>
          {typeof badge === "string" ? <span className={pageHeaderBadge()}>{badge}</span> : badge}
          {actions}
        </div>
      )}
    </header>
  );
};

export default PageHeader;
