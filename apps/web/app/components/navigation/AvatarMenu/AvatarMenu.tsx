import { Icon } from "@repo/ui";
import { Bot, Calculator, ChevronDown, LogOut, Settings } from "lucide-react";
import { type FC, type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Form, Link } from "react-router";
import { CONNECT_AI_ROUTE } from "../navConfig";
import UserAvatar from "../UserAvatar";
import { container, divider, item, panel, srOnly, trigger } from "./AvatarMenu.styles";

export interface AvatarMenuProps {
  user: unknown;
}

/**
 * Account menu (IA review T-IA-6): Settings, Connect AI, Free calculators, Sign out. It replaces the
 * bare avatar link so these destinations share one home.
 */
const AvatarMenu: FC<AvatarMenuProps> = ({ user }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const close = (restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const items = rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    items?.[0]?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
      return;
    }
    if (event.key === "Tab") {
      close(true);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = Array.from(
      rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    const index = items.indexOf(document.activeElement as HTMLElement);
    const step = event.key === "ArrowDown" ? 1 : -1;
    items[(index + step + items.length) % items.length]?.focus();
  };

  return (
    <div className={container()} ref={rootRef}>
      <button
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        className={trigger()}
        id="avatar-menu-trigger"
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">
          <UserAvatar bordered size={26} user={user} />
        </span>
        <span className={srOnly()}>{t("accountMenu", "Your account menu")}</span>
        <Icon icon={ChevronDown} size="sm" />
      </button>
      {open && (
        // biome-ignore lint/a11y/noStaticElementInteractions: key handling for the roving menu focus
        <div className={panel()} id={menuId} role="menu" onKeyDown={onMenuKeyDown}>
          <Link className={item()} role="menuitem" to="/app/profile" onClick={() => close(false)}>
            <Icon icon={Settings} size="sm" />
            {t("settings", "Settings")}
          </Link>
          <Link
            className={item()}
            role="menuitem"
            to={CONNECT_AI_ROUTE}
            onClick={() => close(false)}
          >
            <Icon icon={Bot} size="sm" />
            {t("connectAi", "Connect AI")}
          </Link>
          <Link className={item()} role="menuitem" to="/tools" onClick={() => close(false)}>
            <Icon icon={Calculator} size="sm" />
            {t("freeCalculators", "Free calculators")}
          </Link>
          <div aria-hidden="true" className={divider()} />
          <Form action="/logout" method="post">
            <button className={item()} role="menuitem" type="submit">
              <Icon icon={LogOut} size="sm" />
              {t("logOut", "Sign out")}
            </button>
          </Form>
        </div>
      )}
    </div>
  );
};

export default AvatarMenu;
