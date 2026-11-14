import type { ReactNode } from "react";

/** A link inside a group flyout. */
export interface AppNavChild {
  key: string;
  label: string;
  href: string;
  /** One-line helper shown under the label in flyouts and side groups. */
  description?: string;
  icon?: ReactNode;
}

/** A top-level navigation entry. With `children` it becomes a group (flyout / headed list). */
export interface AppNavItem {
  key: string;
  label: string;
  href: string;
  icon?: ReactNode;
  children?: AppNavChild[];
  /** Short count or status, for example "3". Rendered with tabular numerals. */
  badge?: string | number;
  /**
   * `TopBar` only: a lower-priority link shown inline from `navWide` (1024px) up. Below that it is
   * left out of the inline bar, so the site must list it in the menu (`menuBelow="wide"`).
   */
  wideOnly?: boolean;
}

/**
 * Link slot. The ui package never imports a router: the app supplies the anchor/Link element and
 * must apply `className` and render `children` inside it. `aria-current` is added by the caller of
 * `renderLink` through `ariaCurrent` so apps can forward it to their router link.
 */
export type AppNavRenderLink = (
  item: AppNavItem | AppNavChild,
  className: string,
  children: ReactNode,
  ariaCurrent?: "page",
) => ReactNode;

export const isActiveItem = (item: AppNavItem, activeKey?: string): boolean =>
  activeKey !== undefined &&
  (item.key === activeKey || (item.children?.some((child) => child.key === activeKey) ?? false));

/** Default anchor used when no `renderLink` is supplied. */
export const defaultRenderLink: AppNavRenderLink = (item, className, children, ariaCurrent) => (
  <a aria-current={ariaCurrent} className={className} href={item.href}>
    {children}
  </a>
);
