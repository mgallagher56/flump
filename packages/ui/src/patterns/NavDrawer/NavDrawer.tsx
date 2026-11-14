import { X } from "lucide-react";
import { type FC, type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../../primitives/Icon/Icon";
import {
  navDrawerBackdrop,
  navDrawerClose,
  navDrawerFooter,
  navDrawerHeader,
  navDrawerPanel,
} from "./NavDrawer.styles";

export interface NavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Usually `<HomeLogo decorative />`. */
  logo?: ReactNode;
  /** Navigation links. */
  children: ReactNode;
  /** Pinned to the bottom of the drawer: theme toggle, account actions. */
  footer?: ReactNode;
  /** Accessible name of the dialog. */
  label?: string;
  closeLabel?: string;
  /** Element id of the dialog, for `aria-controls` on the menu button. */
  id?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * The mobile navigation drawer shared by the web app and the marketing site. It opens from the
 * `TopBar` menu button below the shared nav breakpoint. Modal: focus moves in on open, Tab wraps
 * inside, Escape and the backdrop close it, and focus returns to the opener on close.
 */
export const NavDrawer: FC<NavDrawerProps> = ({
  isOpen,
  onClose,
  logo,
  children,
  footer,
  label = "Mobile Navigation Drawer",
  closeLabel = "Close navigation menu",
  id = "mobile-nav-drawer",
}) => {
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  // Read through a ref so a new onClose on each parent render does not re-run the effects below
  // (which would pull focus back to the close button).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Remember the opener once per open (the portal remount must not overwrite it) and return to it.
  useEffect(() => {
    if (!isOpen) return;
    openerRef.current = document.activeElement as HTMLElement | null;
    return () => {
      const opener = openerRef.current;
      if (opener && typeof opener.focus === "function") opener.focus();
    };
  }, [isOpen]);

  // Focus moves in on open, and again after the portal remount on the first open.
  useEffect(() => {
    if (isOpen) closeRef.current?.focus();
  }, [isOpen, mounted]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
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
  }, [isOpen]);

  if (!isOpen) return null;

  const content = (
    <>
      <div
        aria-hidden="true"
        className={navDrawerBackdrop()}
        data-testid="mobile-drawer-backdrop"
        id="mobile-drawer-backdrop"
        onClick={onClose}
      />
      <div
        ref={drawerRef}
        aria-label={label}
        aria-modal="true"
        role="dialog"
        className={navDrawerPanel()}
        data-testid="mobile-nav-drawer"
        id={id}
      >
        <div>
          <div className={navDrawerHeader()}>
            {logo ?? <span />}
            <button
              aria-label={closeLabel}
              className={navDrawerClose()}
              ref={closeRef}
              type="button"
              onClick={onClose}
            >
              <Icon icon={X} />
            </button>
          </div>
          {children}
        </div>
        {footer && <div className={navDrawerFooter()}>{footer}</div>}
      </div>
    </>
  );

  if (mounted && typeof document !== "undefined") {
    return createPortal(content, document.body);
  }

  return content;
};

export default NavDrawer;
