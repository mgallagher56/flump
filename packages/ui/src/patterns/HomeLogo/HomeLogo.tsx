import type { FC, ReactNode } from "react";
import { FlumpLogo } from "../../primitives/FlumpLogo/FlumpLogo";
import { homeLogoLink, homeLogoRoot } from "./HomeLogo.styles";

/** Props the link slot must spread onto its anchor or router link. */
export interface HomeLogoLinkProps {
  className: string;
  children: ReactNode;
  "aria-label"?: string;
  "aria-hidden"?: true;
  "aria-current"?: "page";
  tabIndex?: number;
}

export interface HomeLogoProps {
  /**
   * Set when the surrounding navigation already offers a "Home" link, so the logo does not add a
   * second, adjacent link to the same destination. The link is then removed from the tab order
   * and the accessibility tree.
   */
  decorative?: boolean;
  /** Accessible name of the link. */
  label?: string;
  /**
   * The home page is the current page: sets `aria-current="page"` and a visible mark below the
   * logo where the bar has no inline "Home" link (below `NAV_WIDE_BREAKPOINT`).
   */
  current?: boolean;
  /**
   * Link slot, so the ui package needs no router. Render a link to the site's home page and spread
   * the props onto it. Defaults to a plain anchor to "/".
   */
  renderLink?: (props: HomeLogoLinkProps) => ReactNode;
}

const defaultRenderLink = (props: HomeLogoLinkProps) => <a href="/" {...props} />;

/**
 * The Flump logo linked to the site's home page. The one logo for the header and drawer of both
 * the web app and the marketing site.
 */
export const HomeLogo: FC<HomeLogoProps> = ({
  decorative = false,
  current = false,
  label = "Flump home",
  renderLink = defaultRenderLink,
}) => (
  <div className={homeLogoRoot()} data-testid="home-logo">
    {renderLink(
      decorative
        ? {
            className: homeLogoLink(),
            "aria-hidden": true,
            tabIndex: -1,
            children: <FlumpLogo size="md" />,
          }
        : {
            className: homeLogoLink(),
            "aria-label": label,
            ...(current ? { "aria-current": "page" as const } : {}),
            children: <FlumpLogo size="md" />,
          },
    )}
  </div>
);

export default HomeLogo;
