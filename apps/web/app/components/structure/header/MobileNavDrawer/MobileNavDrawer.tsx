import { Icon } from "@repo/ui";
import { X } from "lucide-react";
import { type FC, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import HomeLogo from "~/components/navigation/HomeLogo";
import NavMenu from "~/components/navigation/NavMenu";
import {
  AUTH_NAV_ROUTES,
  filterNavRoutes,
  HOME_NAV_ROUTE,
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
} from "./MobileNavDrawer.styles";

export interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user?: unknown;
}

const MobileNavDrawer: FC<MobileNavDrawerProps> = ({ isOpen, onClose, user }) => {
  const [mounted, setMounted] = useState(false);
  const { profile } = useUserProfile();

  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Escape closes the drawer and focus moves into it when it opens.
  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, mounted, onClose]);

  if (!isOpen) return null;

  const enabled = profile.enabledPages || [];
  const authRoutes = user ? filterNavRoutes(AUTH_NAV_ROUTES, enabled, isPageEnabled) : [];

  const drawerContent = (
    <>
      <div
        aria-hidden="true"
        className={backdrop()}
        data-testid="mobile-drawer-backdrop"
        id="mobile-drawer-backdrop"
        onClick={onClose}
      />
      <aside
        aria-label="Mobile Navigation Drawer"
        className={drawer()}
        data-testid="mobile-nav-drawer"
        id="mobile-nav-drawer"
      >
        <div>
          <div className={drawerHeader()}>
            <HomeLogo />
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
          <NavMenu
            isMobile
            routes={[HOME_NAV_ROUTE, ...authRoutes]}
            variant="mobile"
            onNavigate={onClose}
          />
        </div>

        <div className={footer()}>
          {!!user && (
            <Link className={profileLink()} to="/app/profile" onClick={onClose}>
              <UserAvatar bordered size={24} user={user} />
              <span>User Profile</span>
            </Link>
          )}
          <div className={footerRow()}>
            <ThemeToggle />
            <UserLogin />
          </div>
        </div>
      </aside>
    </>
  );

  if (mounted && typeof document !== "undefined") {
    return createPortal(drawerContent, document.body);
  }

  return drawerContent;
};

export default MobileNavDrawer;
