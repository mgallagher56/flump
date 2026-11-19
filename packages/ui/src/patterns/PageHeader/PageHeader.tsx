import type { FC, ReactNode } from "react";
import { cx } from "../../../styled-system/css";
import { Illustration } from "../../primitives/Illustration/Illustration";
import type { IllustrationScene } from "../../primitives/Illustration/Illustration.scenes";
import {
  pageHeaderAside,
  pageHeaderBadge,
  pageHeaderContainer,
  pageHeaderDescription,
  pageHeaderIcon,
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
   * The one actions slot, shown top right (on a phone, under the description): one primary button (the page's only primary, E16 P7.4)
   * and at most one secondary. Anything more belongs in the page body or a menu.
   */
  actions?: ReactNode;
  /**
   * Quiet status pill beside the actions, for example "Sample data". A string renders the
   * standard outlined pill; pass a node to supply your own.
   */
  badge?: ReactNode;
  /**
   * The page icon: the page's own illustration beside the h1, so the page is recognisable at a
   * glance, whether it is empty or filled in. Decorative (the h1 names the page), still, and the
   * same size and place on every page. A page that passes it shows no illustration in its
   * `EmptyState`, so one is in view.
   */
  illustration?: IllustrationScene;
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
  illustration,
  className,
}) => {
  const text = description ?? subtitle;
  const withIcon = Boolean(illustration);
  const withText = Boolean(text);
  return (
    <header className={cx(pageHeaderContainer({ iconRow: withIcon && withText }), className)}>
      {illustration ? (
        <div className={pageHeaderIcon({ withText })} data-testid="page-header-illustration">
          <Illustration scene={illustration} settle={false} size="sm" />
        </div>
      ) : null}
      <div className={pageHeaderText()}>
        <h1 className={pageHeaderTitle()}>{title}</h1>
        {text && <p className={pageHeaderDescription({ withIcon })}>{text}</p>}
      </div>
      {(badge || actions) && (
        <div className={pageHeaderAside({ afterText: withText })}>
          {typeof badge === "string" ? <span className={pageHeaderBadge()}>{badge}</span> : badge}
          {actions}
        </div>
      )}
    </header>
  );
};

export default PageHeader;
