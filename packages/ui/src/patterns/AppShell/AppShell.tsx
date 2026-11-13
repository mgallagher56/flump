import type { FC, ReactNode } from "react";
import { cx } from "../../../styled-system/css";
import { VisuallyHidden } from "../../primitives/VisuallyHidden/VisuallyHidden";
import { MobileBottomBar } from "../MobileBottomBar/MobileBottomBar";
import { SideNav } from "../SideNav/SideNav";
import { TopBar } from "../TopBar/TopBar";
import { type AppNavItem, type AppNavRenderLink, defaultRenderLink } from "./AppNav.types";
import { appShellBody, appShellMain, appShellRoot, appShellSide } from "./AppShell.styles";

export interface AppShellProps {
  /** Navigation manifest shared by the top bar, side nav and mobile bar. */
  items: AppNavItem[];
  activeKey?: string;
  renderLink?: AppNavRenderLink;
  logo?: ReactNode;
  /** Right slot of the top bar: theme toggle, account menu. */
  actions?: ReactNode;
  onMenuClick?: () => void;
  /** Items shown in the five-slot mobile bar. Defaults to the first five manifest items. */
  mobileItems?: AppNavItem[];
  /** Render the vertical side nav beside the content from `lg` up. */
  showSideNav?: boolean;
  /** `id` of the main landmark, target of the skip link. */
  mainId?: string;
  skipLinkLabel?: string;
  children: ReactNode;
  className?: string;
}

export const AppShell: FC<AppShellProps> = ({
  items,
  activeKey,
  renderLink = defaultRenderLink,
  logo,
  actions,
  onMenuClick,
  mobileItems,
  showSideNav = false,
  mainId = "main-content",
  skipLinkLabel = "Skip to main content",
  children,
  className,
}) => (
  <div className={cx(appShellRoot(), className)}>
    <VisuallyHidden as="a" focusable href={`#${mainId}`}>
      {skipLinkLabel}
    </VisuallyHidden>
    <TopBar
      actions={actions}
      activeKey={activeKey}
      items={items}
      logo={logo}
      onMenuClick={onMenuClick}
      renderLink={renderLink}
    />
    <div className={appShellBody()}>
      {showSideNav && (
        <aside className={appShellSide()}>
          <SideNav activeKey={activeKey} items={items} renderLink={renderLink} />
        </aside>
      )}
      <main className={appShellMain()} id={mainId} tabIndex={-1}>
        {children}
      </main>
    </div>
    <MobileBottomBar activeKey={activeKey} items={mobileItems ?? items} renderLink={renderLink} />
  </div>
);

export default AppShell;
