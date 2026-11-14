import { buttonVariants, Icon } from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import { ChevronDown } from "lucide-react";
import { type FC, type ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink as RouterNavLink, useLocation } from "react-router";
import { navLabel } from "../buildNavManifest";
import { DisabledNavItem } from "../DisabledNavItem";
import type { NavRouteItem } from "../navConfig";
import {
  activeChildDot,
  desktopGroup,
  dropdownContainer,
  flyoutDescription,
  flyoutIconBox,
  flyoutItem,
  flyoutLabel,
  flyoutPanel,
  flyoutText,
  linkIcon,
  mobileLink,
  mobileMenuContainer,
  mobileSection,
  mobileSectionHeading,
  triggerChevron,
  triggerIconSlot,
} from "./NavMenu.styles";

export type { NavRouteItem };

interface NavMenuProps {
  routes?: NavRouteItem[];
  isMobile?: boolean;
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
  /** Mobile only: routes this returns true for render as disabled "Sign up to open" items (sandbox). */
  isRouteDisabled?: (item: NavRouteItem) => boolean;
}

const DesktopDropdownGroup: FC<{
  item: NavRouteItem;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onOpen: () => void;
}> = ({ item, isOpen, onToggle, onClose, onOpen }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const menuId = `nav-dropdown-panel-${item.key}`;
  const triggerId = `nav-dropdown-trigger-${item.key}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasActiveChild =
    item.children?.some(
      (child) =>
        child.route &&
        (location.pathname === child.route || location.pathname.startsWith(`${child.route}/`)),
    ) ?? false;

  const clearCloseTimer = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    const handleMouseEnter = () => {
      clearCloseTimer();
      onOpen();
    };

    const handleMouseLeave = () => {
      clearCloseTimer();
      closeTimeoutRef.current = setTimeout(() => {
        onClose();
      }, 140);
    };
    const containerEl = containerRef.current;
    containerEl?.addEventListener("mouseenter", handleMouseEnter);
    containerEl?.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      clearCloseTimer();
      containerEl?.removeEventListener("mouseenter", handleMouseEnter);
      containerEl?.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [onOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <div ref={containerRef} className={dropdownContainer()}>
      <button
        aria-controls={menuId}
        aria-expanded={isOpen}
        className={buttonVariants({ variant: hasActiveChild || isOpen ? "secondary" : "ghost" })}
        data-testid={`nav-dropdown-trigger-${item.key}`}
        id={triggerId}
        type="button"
        onClick={onToggle}
      >
        {item.icon && (
          <span className={triggerIconSlot()}>
            <Icon icon={item.icon} size="sm" />
          </span>
        )}
        <span>{navLabel(t, item.label ?? item.key)}</span>
        {hasActiveChild && <span aria-hidden="true" className={activeChildDot()} />}
        <Icon className={triggerChevron({ open: isOpen })} icon={ChevronDown} size="sm" />
      </button>

      {isOpen && item.children && (
        <div className={flyoutPanel()} data-testid={menuId} id={menuId}>
          {item.children.map((child) => {
            if (!child.route) return null;
            const isChildActive =
              location.pathname === child.route || location.pathname.startsWith(`${child.route}/`);
            return (
              <RouterNavLink
                key={child.key}
                className={flyoutItem({ active: isChildActive })}
                to={child.route}
                onClick={onClose}
              >
                {child.icon && (
                  <div className={flyoutIconBox()}>
                    <Icon icon={child.icon} size="sm" />
                  </div>
                )}
                <div className={flyoutText()}>
                  <span className={flyoutLabel()}>{navLabel(t, child.label ?? child.key)}</span>
                  {child.description && (
                    <span className={flyoutDescription()}>{navLabel(t, child.description)}</span>
                  )}
                </div>
              </RouterNavLink>
            );
          })}
        </div>
      )}
    </div>
  );
};

/** A nav destination styled as a button; the current page gets the secondary fill. */
const NavMenuLink: FC<{
  to: string;
  text: string;
  icon?: ReactNode;
  mobile?: boolean;
  onClick?: () => void;
}> = ({ to, text, icon, mobile = false, onClick }) => (
  <RouterNavLink
    className={({ isActive }) =>
      cx(buttonVariants({ variant: isActive ? "secondary" : "ghost" }), mobile && mobileLink())
    }
    end={to === "/app/accounts" || to === "/"}
    to={to}
    onClick={onClick}
  >
    {icon && <span className={linkIcon()}>{icon}</span>}
    {text}
  </RouterNavLink>
);

const DisabledMobileItem: FC<{ item: NavRouteItem }> = ({ item }) => {
  const { t } = useTranslation();
  return (
    <DisabledNavItem
      icon={item.icon && <Icon icon={item.icon} size="sm" />}
      id={`nav-disabled-${item.key}`}
      label={navLabel(t, item.label ?? item.key)}
    />
  );
};

const NavMenu: FC<NavMenuProps> = ({
  routes,
  isMobile,
  variant = "desktop",
  onNavigate,
  isRouteDisabled,
}) => {
  const { t } = useTranslation();
  const isMobileVariant = isMobile || variant === "mobile";
  const [openGroupKey, setOpenGroupKey] = useState<string | null>(null);

  if (isMobileVariant) {
    return (
      <div className={mobileMenuContainer()} data-testid="nav-menu-mobile" id="nav-menu-mobile">
        {routes?.map((route) => {
          if (route.children && route.children.length > 0) {
            return (
              <div key={route.key} className={mobileSection()}>
                <div className={mobileSectionHeading()}>
                  {navLabel(t, route.label ?? route.key)}
                </div>
                {route.children.map((child) =>
                  child.route && isRouteDisabled?.(child) ? (
                    <DisabledMobileItem key={child.key} item={child} />
                  ) : child.route ? (
                    <NavMenuLink
                      icon={child.icon && <Icon icon={child.icon} size="sm" />}
                      key={child.key}
                      mobile
                      text={navLabel(t, child.label ?? child.key)}
                      to={child.route}
                      onClick={onNavigate}
                    />
                  ) : null,
                )}
              </div>
            );
          }

          if (!route.route) return null;

          if (isRouteDisabled?.(route)) return <DisabledMobileItem key={route.key} item={route} />;

          return (
            <NavMenuLink
              icon={route.icon && <Icon icon={route.icon} size="sm" />}
              key={route.key}
              mobile
              text={navLabel(t, route.label ?? route.key)}
              to={route.route}
              onClick={onNavigate}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className={desktopGroup()}>
      {routes?.map((route) => {
        if (route.children && route.children.length > 0) {
          return (
            <DesktopDropdownGroup
              key={route.key}
              isOpen={openGroupKey === route.key}
              item={route}
              onClose={() => setOpenGroupKey((prev) => (prev === route.key ? null : prev))}
              onOpen={() => setOpenGroupKey(route.key)}
              onToggle={() => setOpenGroupKey((prev) => (prev === route.key ? null : route.key))}
            />
          );
        }

        if (!route.route) return null;

        return (
          <NavMenuLink
            key={route.key}
            text={navLabel(t, route.label ?? route.key)}
            to={route.route}
          />
        );
      })}
    </div>
  );
};

export default NavMenu;
