import { Menu } from "lucide-react";
import { type FC, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { cx } from "../../../styled-system/css";
import { Button } from "../../primitives/Button/Button";
import { Icon } from "../../primitives/Icon/Icon";
import {
  type AppNavChild,
  type AppNavItem,
  type AppNavRenderLink,
  defaultRenderLink,
  isActiveItem,
} from "../AppShell/AppNav.types";
import {
  topBarActions,
  topBarBadge,
  topBarFlyout,
  topBarFlyoutDescription,
  topBarFlyoutLabel,
  topBarFlyoutLink,
  topBarFlyoutText,
  topBarInlineActions,
  topBarInner,
  topBarLink,
  topBarList,
  topBarLogo,
  topBarMenuButton,
  topBarNav,
  topBarNavItem,
  topBarRoot,
} from "./TopBar.styles";

export interface TopBarProps {
  items: AppNavItem[];
  /** Key of the active item (or active child, which marks its group). */
  activeKey?: string;
  /** Logo element, usually wrapped in a link home. */
  logo?: ReactNode;
  /** Right-hand slot: account menu, sign-in buttons. */
  actions?: ReactNode;
  /**
   * Right-hand slot shown only from the shared nav breakpoint up, for controls that the mobile
   * drawer already offers (the theme toggle), so the bar fits on small screens.
   */
  inlineActions?: ReactNode;
  /** Link slot, so the ui package needs no router. Defaults to a plain anchor. */
  renderLink?: AppNavRenderLink;
  /** Shows the menu button below the shared nav breakpoint (`NAV_BREAKPOINT`) and calls this when pressed. */
  onMenuClick?: () => void;
  menuLabel?: string;
  /** Whether the menu the button opens is showing; sets `aria-expanded` on the menu button. */
  menuExpanded?: boolean;
  /** Element id of the menu the button opens (for `aria-controls`). */
  menuControls?: string;
  /** Accessible name of the inline navigation landmark. */
  navLabel?: string;
  className?: string;
}

interface FlyoutGroupProps {
  item: AppNavItem;
  active: boolean;
  activeKey?: string;
  renderLink: AppNavRenderLink;
}

const FlyoutGroup: FC<FlyoutGroupProps> = ({ item, active, activeKey, renderLink }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLLIElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  return (
    <li
      className={topBarNavItem()}
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null;
        if (open && next && !event.currentTarget.contains(next)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
      ref={rootRef}
    >
      <button
        aria-controls={open ? panelId : undefined}
        aria-current={active ? "page" : undefined}
        aria-expanded={open}
        className={topBarLink()}
        onClick={() => setOpen((value) => !value)}
        ref={triggerRef}
        type="button"
      >
        {item.icon}
        <span>{item.label}</span>
      </button>
      {open && (
        <div className={topBarFlyout()} id={panelId}>
          {(item.children ?? []).map((child: AppNavChild) =>
            renderLink(
              child,
              topBarFlyoutLink(),
              <>
                {child.icon}
                <span className={topBarFlyoutText()}>
                  <span className={topBarFlyoutLabel()}>{child.label}</span>
                  {child.description && (
                    <span className={topBarFlyoutDescription()}>{child.description}</span>
                  )}
                </span>
              </>,
              child.key === activeKey ? "page" : undefined,
            ),
          )}
        </div>
      )}
    </li>
  );
};

export const TopBar: FC<TopBarProps> = ({
  items,
  activeKey,
  logo,
  actions,
  inlineActions,
  renderLink = defaultRenderLink,
  onMenuClick,
  menuLabel = "Open menu",
  menuExpanded,
  menuControls,
  navLabel = "Primary",
  className,
}) => (
  <header className={cx(topBarRoot(), className)}>
    <div className={topBarInner()}>
      {onMenuClick && (
        <Button
          aria-controls={menuExpanded ? menuControls : undefined}
          aria-expanded={menuExpanded}
          aria-label={menuLabel}
          className={topBarMenuButton()}
          onClick={onMenuClick}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Icon icon={Menu} />
        </Button>
      )}
      {logo && <div className={topBarLogo()}>{logo}</div>}
      <nav aria-label={navLabel} className={topBarNav()}>
        <ul className={topBarList()}>
          {items.map((item) => {
            const active = isActiveItem(item, activeKey);
            if (item.children && item.children.length > 0) {
              return (
                <FlyoutGroup
                  active={active}
                  activeKey={activeKey}
                  item={item}
                  key={item.key}
                  renderLink={renderLink}
                />
              );
            }
            return (
              <li className={topBarNavItem()} key={item.key}>
                {renderLink(
                  item,
                  topBarLink(),
                  <>
                    {item.icon}
                    <span>{item.label}</span>
                    {item.badge !== undefined && (
                      <span className={topBarBadge()}>{item.badge}</span>
                    )}
                  </>,
                  active ? "page" : undefined,
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      {(actions || inlineActions) && (
        <div className={topBarActions()}>
          {inlineActions && <div className={topBarInlineActions()}>{inlineActions}</div>}
          {actions}
        </div>
      )}
    </div>
  </header>
);

export default TopBar;
