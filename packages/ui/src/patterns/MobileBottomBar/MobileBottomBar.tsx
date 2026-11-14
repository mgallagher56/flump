import type { FC } from "react";
import { cx } from "../../../styled-system/css";
import {
  type AppNavItem,
  type AppNavRenderLink,
  defaultRenderLink,
  isActiveItem,
} from "../AppShell/AppNav.types";
import {
  mobileBottomBarLabel,
  mobileBottomBarLink,
  mobileBottomBarList,
  mobileBottomBarRoot,
} from "./MobileBottomBar.styles";

/** The bar has exactly five slots; extra items are ignored. */
export const MOBILE_BOTTOM_BAR_SLOTS = 5;

export interface MobileBottomBarProps {
  /** Up to five items, Home first. A group item links to its own `href`. */
  items: AppNavItem[];
  activeKey?: string;
  renderLink?: AppNavRenderLink;
  label?: string;
  className?: string;
}

export const MobileBottomBar: FC<MobileBottomBarProps> = ({
  items,
  activeKey,
  renderLink = defaultRenderLink,
  label = "Primary mobile",
  className,
}) => (
  <nav aria-label={label} className={cx(mobileBottomBarRoot(), className)}>
    <ul className={mobileBottomBarList()}>
      {items.slice(0, MOBILE_BOTTOM_BAR_SLOTS).map((item) => (
        <li key={item.key}>
          {renderLink(
            item,
            mobileBottomBarLink(),
            <>
              {item.icon}
              <span className={mobileBottomBarLabel()} data-nav-label="">
                {item.label}
              </span>
            </>,
            isActiveItem(item, activeKey) ? "page" : undefined,
          )}
        </li>
      ))}
    </ul>
  </nav>
);

export default MobileBottomBar;
