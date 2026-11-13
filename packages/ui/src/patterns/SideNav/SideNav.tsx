import type { FC } from "react";
import { cx } from "../../../styled-system/css";
import {
  type AppNavChild,
  type AppNavItem,
  type AppNavRenderLink,
  defaultRenderLink,
} from "../AppShell/AppNav.types";
import {
  sideNavBadge,
  sideNavDescription,
  sideNavGroupHeading,
  sideNavLabelGroup,
  sideNavLink,
  sideNavList,
  sideNavRoot,
} from "./SideNav.styles";

export interface SideNavProps {
  items: AppNavItem[];
  activeKey?: string;
  renderLink?: AppNavRenderLink;
  /** Accessible name of the navigation landmark. Must differ from the other nav landmarks. */
  label?: string;
  className?: string;
}

export const SideNav: FC<SideNavProps> = ({
  items,
  activeKey,
  renderLink = defaultRenderLink,
  label = "Section navigation",
  className,
}) => {
  const renderEntry = (entry: AppNavItem | AppNavChild) => {
    const description = "description" in entry ? entry.description : undefined;
    const badge = "badge" in entry ? entry.badge : undefined;
    return (
      <li key={entry.key}>
        {renderLink(
          entry,
          sideNavLink(),
          <>
            {entry.icon}
            <span className={sideNavLabelGroup()}>
              <span>{entry.label}</span>
              {description && <span className={sideNavDescription()}>{description}</span>}
            </span>
            {badge !== undefined && <span className={sideNavBadge()}>{badge}</span>}
          </>,
          entry.key === activeKey ? "page" : undefined,
        )}
      </li>
    );
  };

  return (
    <nav aria-label={label} className={cx(sideNavRoot(), className)}>
      <ul className={sideNavList()}>
        {items.map((item) =>
          item.children && item.children.length > 0 ? (
            <li key={item.key}>
              <p className={sideNavGroupHeading()}>{item.label}</p>
              <ul className={sideNavList()}>{item.children.map(renderEntry)}</ul>
            </li>
          ) : (
            renderEntry(item)
          ),
        )}
      </ul>
    </nav>
  );
};

export default SideNav;
