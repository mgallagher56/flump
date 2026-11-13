import { MobileBottomBar } from "@repo/ui";
import { type FC, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import { useResponsive } from "~/context/ResponsiveContext";
import { buildBottomBarItems, findActiveBottomBarKey, MORE_NAV_KEY } from "../buildNavManifest";
import { isSandboxPath } from "../navConfig";
import { createRenderNavLink } from "../renderNavLink";
import { spacer } from "./AppBottomBar.styles";

export interface AppBottomBarProps {
  user?: unknown;
  /** Overrides the More button action (defaults to toggling the mobile drawer). */
  onMoreClick?: () => void;
}

/**
 * The app's bottom bar, built on the @repo/ui MobileBottomBar. Signed-in users get it everywhere
 * (the shell reserves its space); the signed-out visitor gets it on the demo sandbox only, with a
 * spacer so it never covers content. "More" opens the navigation drawer (Debt lives there).
 */
export const AppBottomBar: FC<AppBottomBarProps> = ({ user, onMoreClick }) => {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const { toggleMobileDrawer, isMobileDrawerOpen } = useResponsive();
  const sandbox = !user && isSandboxPath(pathname);

  const items = useMemo(() => buildBottomBarItems(t, sandbox), [t, sandbox]);
  const renderLink = useMemo(
    () =>
      createRenderNavLink({
        buttonKey: MORE_NAV_KEY,
        buttonLabel: "More navigation options",
        buttonExpanded: isMobileDrawerOpen,
        onButtonClick: onMoreClick ?? toggleMobileDrawer,
        disabledKeys: sandbox
          ? new Set(
              items.filter((i) => i.key !== "home" && i.key !== MORE_NAV_KEY).map((i) => i.key),
            )
          : undefined,
        disabledLabel: t("signUpToOpen", "Sign up to open"),
      }),
    [items, sandbox, isMobileDrawerOpen, onMoreClick, toggleMobileDrawer, t],
  );

  if (!user && !sandbox) return null;

  return (
    <>
      {sandbox && <div aria-hidden="true" className={spacer()} />}
      <MobileBottomBar
        activeKey={findActiveBottomBarKey(pathname)}
        items={items}
        label="Mobile Bottom Navigation"
        renderLink={renderLink}
      />
    </>
  );
};
