import { css } from "@repo/ui/styled-system/css";
import type { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import FLPButtonGroup from "~/components/core/buttons/FLPButtonGroup";
import FLPLinkButton from "~/components/core/buttons/FLPLinkButton";
import FLPBox from "~/components/core/structure/FLPBox";

export interface NavRouteItem {
  key: string;
  route: string;
  icon?: ReactNode;
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

const NavMenu: FC<NavMenuProps> = ({ routes, isMobile, variant = "desktop", onNavigate }) => {
  const { t } = useTranslation();
  const isMobileVariant = isMobile || variant === "mobile";

  if (isMobileVariant) {
    return (
      <div className={mobileMenuContainerStyle} data-testid="nav-menu-mobile">
        {routes?.map((route) => (
          <FLPLinkButton
            key={route.key}
            icon={route.icon}
            isMobile
            text={t(route.key)}
            to={route.route}
            variant="mobile"
            onClick={onNavigate}
          />
        ))}
      </div>
    );
  }

  return (
    <FLPBox>
      <FLPButtonGroup gap={4}>
        {routes?.map((route) => (
          <FLPLinkButton key={route.key} text={t(route.key)} to={route.route} />
        ))}
      </FLPButtonGroup>
    </FLPBox>
  );
};

export default NavMenu;
