import { css } from "@repo/ui/styled-system/css";
import type { FC, ReactElement } from "react";
import { FaUserCircle } from "react-icons/fa";
import { Link, useLoaderData } from "react-router";
import FLPBox from "~/components/core/structure/FLPBox";
import HomeLogo from "~/components/navigation/HomeLogo";
import NavMenu from "~/components/navigation/NavMenu";
import ThemeToggle from "~/components/navigation/ThemeToggle";
import UserLogin from "~/components/navigation/UserLogin";
import type { loader } from "~/root";

import { loginStyles, menuStyles, navStyles } from "./styles";

const Header: FC = (): ReactElement<FC> => {
  const { user } = useLoaderData<typeof loader>();
  return (
    <header>
      <nav className={navStyles}>
        <FLPBox className={menuStyles}>
          <HomeLogo />
          <NavMenu routes={[{ key: "home", route: "/" }]} />
          {!!user && (
            <NavMenu
              routes={[
                { key: "dashboard", route: "/app" },
                { key: "accounts", route: "/app/accounts" },
                { key: "forecast", route: "/app/forecast" },
                { key: "mortgage", route: "/app/mortgage" },
                { key: "budget", route: "/app/budget" },
                { key: "tax", route: "/app/tax" },
              ]}
            />
          )}
        </FLPBox>
        <FLPBox className={loginStyles}>
          <ThemeToggle />
          {!!user && (
            <Link
              to="/app/profile"
              className={css({
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "text.muted",
                transition: "color 0.2s",
                "&:hover": { color: "primary" },
              })}
              title="User Profile"
            >
              <FaUserCircle size={22} />
            </Link>
          )}
          <UserLogin />
        </FLPBox>
      </nav>
    </header>
  );
};

export default Header;
