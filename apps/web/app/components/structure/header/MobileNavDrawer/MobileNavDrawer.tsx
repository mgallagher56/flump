import { Icon } from "@repo/ui";
import { X } from "lucide-react";
import { type FC, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import HomeLogo from "~/components/navigation/HomeLogo";
import NavMenu from "~/components/navigation/NavMenu";
import {
  AUTH_NAV_ROUTES,
  filterNavRoutes,
  HOME_NAV_ROUTE,
  SANDBOX_HOME_NAV_ROUTE,
} from "~/components/navigation/navConfig";
import ThemeToggle from "~/components/navigation/ThemeToggle";
import UserAvatar from "~/components/navigation/UserAvatar";
import UserLogin from "~/components/navigation/UserLogin";
import { useUserProfile } from "~/hooks/useUserProfile";
import { isPageEnabled } from "~/utils/pageConfig";
import {
  backdrop,
  closeButton,
  drawer,
  drawerHeader,
  footer,
  footerRow,
  profileLink,
  signUpLink,
} from "./MobileNavDrawer.styles";

export interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user?: unknown;
  /** Signed-out sandbox: list the same tabs, with everything but Home disabled ("Sign up to open"). */
  sandbox?: boolean;
}

// Every destination in the signed-in nav needs an account, so the sandbox disables exactly these.
const SANDBOX_DISABLED_KEYS = new Set(
  AUTH_NAV_ROUTES.flatMap((route) => (route.children ? route.children : [route]).map((r) => r.key)),
);

const MobileNavDrawer: FC<MobileNavDrawerProps> = ({ isOpen, onClose, user, sandbox }) => {
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation();
  const { profile } = useUserProfile();

  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const drawerRef = useRef<HTMLDivElement>(null);

  // Modal behaviour: focus moves in on open, Tab wraps inside, Escape closes, and focus returns to
  // whatever opened the drawer when it closes.
  const openerRef = useRef<HTMLElement | null>(null);

  // Remember the opener once per open (the portal remount must not overwrite it) and return to it.
  useEffect(() => {
    if (!isOpen) return;
    openerRef.current = document.activeElement as HTMLElement | null;
    return () => {
      const opener = openerRef.current;
      if (opener && typeof opener.focus === "function") opener.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !drawerRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !drawerRef.current.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, mounted, onClose]);

  if (!isOpen) return null;

  const enabled = profile.enabledPages || [];
  const authRoutes = user
    ? filterNavRoutes(AUTH_NAV_ROUTES, enabled, isPageEnabled)
    : sandbox
      ? AUTH_NAV_ROUTES
      : [];

  const drawerContent = (
    <>
      <div
        aria-hidden="true"
        className={backdrop()}
        data-testid="mobile-drawer-backdrop"
        id="mobile-drawer-backdrop"
        onClick={onClose}
      />
      <div
        ref={drawerRef}
        aria-label="Mobile Navigation Drawer"
        aria-modal="true"
        role="dialog"
        className={drawer()}
        data-testid="mobile-nav-drawer"
        id="mobile-nav-drawer"
      >
        <div>
          <div className={drawerHeader()}>
            <HomeLogo decorative />
            <button
              aria-label="Close navigation menu"
              className={closeButton()}
              ref={closeRef}
              type="button"
              onClick={onClose}
            >
              <Icon icon={X} />
            </button>
          </div>
          {sandbox && !user ? (
            <Link className={signUpLink()} to="/signup" onClick={onClose}>
              {t("signUp", "Sign up")}
              <span>{t("signUpToOpen", "Sign up to open")}</span>
            </Link>
          ) : null}
          <NavMenu
            isMobile
            routes={[sandbox && !user ? SANDBOX_HOME_NAV_ROUTE : HOME_NAV_ROUTE, ...authRoutes]}
            isRouteDisabled={
              sandbox && !user ? (item) => SANDBOX_DISABLED_KEYS.has(item.key) : undefined
            }
            variant="mobile"
            onNavigate={onClose}
          />
        </div>

        <div className={footer()}>
          {!!user && (
            <Link className={profileLink()} to="/app/profile" onClick={onClose}>
              <UserAvatar bordered size={24} user={user} />
              <span>Settings</span>
            </Link>
          )}
          <div className={footerRow()}>
            <ThemeToggle />
            <UserLogin />
          </div>
        </div>
      </div>
    </>
  );

  if (mounted && typeof document !== "undefined") {
    return createPortal(drawerContent, document.body);
  }

  return drawerContent;
};

export default MobileNavDrawer;
