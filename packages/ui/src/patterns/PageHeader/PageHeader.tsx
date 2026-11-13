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
  /** One-line description under the title. */
  description?: string;
  /** @deprecated Use `description`. Kept so existing screens keep working. */
  subtitle?: string;
  /** Primary and secondary page actions, shown top right. */
  actions?: ReactNode;
  /**
   * Quiet status pill beside the actions, for example "Sample data". A string renders the
   * standard outlined pill; pass a node to supply your own.
   */
  badge?: ReactNode;
  className?: string;
}

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
