import { buttonVariants } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { type FC, type ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaChevronDown } from "react-icons/fa";
import { NavLink as RouterNavLink, useLocation } from "react-router";
import FLPButtonGroup from "~/components/core/buttons/FLPButtonGroup";
import FLPLinkButton from "~/components/core/buttons/FLPLinkButton";
import FLPBox from "~/components/core/structure/FLPBox";

export interface NavRouteItem {
  key: string;
  route?: string;
  icon?: ReactNode;
  description?: string;
  badgeColor?: string;
  children?: NavRouteItem[];
}

interface NavMenuProps {
  routes?: NavRouteItem[];
  isMobile?: boolean;
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
}

const mobileMenuContainerStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  width: "100%",
});

const mobileSectionHeadingStyle = css({
  fontSize: "11px",
  fontWeight: "bold",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "text.muted",
  padding: "10px 16px 4px",
  marginTop: "4px",
});

const dropdownContainerStyle = css({
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
});

const triggerChevronStyle = (isOpen: boolean) =>
  css({
    marginLeft: "6px",
    fontSize: "10px",
    opacity: 0.75,
    transition: "transform 0.2s ease",
    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
  });

const activeChildDotStyle = css({
  width: "6px",
  height: "6px",
  borderRadius: "full",
  backgroundColor: "primary",
  marginLeft: "6px",
  flexShrink: 0,
});

const flyoutPanelStyle = css({
  position: "absolute",
  top: "calc(100% + 10px)",
  left: "0",
  minWidth: "290px",
  padding: "8px",
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: {
    base: "rgba(255, 255, 255, 0.96)",
    _dark: "rgba(22, 24, 29, 0.96)",
  },
  backdropFilter: "blur(16px)",
  boxShadow: "0 16px 40px -8px rgba(0, 0, 0, 0.22), 0 4px 12px -2px rgba(0, 0, 0, 0.08)",
  zIndex: 100,
  display: "flex",
  flexDirection: "column",
  gap: "4px",
});

const flyoutItemStyle = (isActive: boolean) =>
  css({
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "10px 12px",
    borderRadius: "lg",
    textDecoration: "none",
    color: "text.primary",
    backgroundColor: isActive ? "accent" : "transparent",
    transition: "all 0.15s ease",
    _hover: {
      backgroundColor: "accent",
      transform: "translateX(2px)",
    },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "primary",
      outlineOffset: "-2px",
    },
  });

const flyoutIconBoxStyle = css({
  width: "36px",
  height: "36px",
  borderRadius: "lg",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  fontSize: "15px",
  marginTop: "1px",
  backgroundColor: "rgba(99, 99, 241, 0.1)",
  color: "primary",
});

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
    <div ref={containerRef} className={dropdownContainerStyle}>
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
          <span style={{ display: "inline-flex", alignItems: "center", marginRight: "6px" }}>
            {item.icon}
          </span>
        )}
        <span>{t(item.key)}</span>
        {hasActiveChild && <span aria-hidden="true" className={activeChildDotStyle} />}
        <FaChevronDown aria-hidden="true" className={triggerChevronStyle(isOpen)} />
      </button>

      {isOpen && item.children && (
        <div
          aria-labelledby={triggerId}
          className={flyoutPanelStyle}
          data-testid={menuId}
          id={menuId}
          role="menu"
        >
          {item.children.map((child) => {
            if (!child.route) return null;
            const isChildActive =
              location.pathname === child.route || location.pathname.startsWith(`${child.route}/`);
            return (
              <RouterNavLink
                key={child.key}
                className={flyoutItemStyle(isChildActive)}
                to={child.route}
                onClick={onClose}
              >
                {child.icon && (
                  <div
                    className={flyoutIconBoxStyle}
                    style={
                      child.badgeColor
                        ? {
                            backgroundColor: `${child.badgeColor}1a`,
                            color: child.badgeColor,
                          }
                        : undefined
                    }
                  >
                    {child.icon}
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      lineHeight: 1.25,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {t(child.key)}
                  </span>
                  {child.description && (
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--colors-text-muted)",
                        lineHeight: 1.35,
                      }}
                    >
                      {t(child.description, child.description)}
                    </span>
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

const NavMenu: FC<NavMenuProps> = ({ routes, isMobile, variant = "desktop", onNavigate }) => {
  const { t } = useTranslation();
  const isMobileVariant = isMobile || variant === "mobile";
  const [openGroupKey, setOpenGroupKey] = useState<string | null>(null);

  if (isMobileVariant) {
    return (
      <div className={mobileMenuContainerStyle} data-testid="nav-menu-mobile" id="nav-menu-mobile">
        {routes?.map((route) => {
          if (route.children && route.children.length > 0) {
            return (
              <div key={route.key} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div className={mobileSectionHeadingStyle}>{t(route.key)}</div>
                {route.children.map((child) =>
                  child.route ? (
                    <FLPLinkButton
                      key={child.key}
                      icon={child.icon}
                      isMobile
                      text={t(child.key)}
                      to={child.route}
                      variant="mobile"
                      onClick={onNavigate}
                    />
                  ) : null,
                )}
              </div>
            );
          }

          if (!route.route) return null;

          return (
            <FLPLinkButton
              key={route.key}
              icon={route.icon}
              isMobile
              text={t(route.key)}
              to={route.route}
              variant="mobile"
              onClick={onNavigate}
            />
          );
        })}
      </div>
    );
  }

  return (
    <FLPBox>
      <FLPButtonGroup gap={2}>
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

          return <FLPLinkButton key={route.key} text={t(route.key)} to={route.route} />;
        })}
      </FLPButtonGroup>
    </FLPBox>
  );
};

export default NavMenu;
