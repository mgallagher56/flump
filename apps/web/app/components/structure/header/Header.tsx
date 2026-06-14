import type { FC, ReactElement } from "react";
import { useLoaderData } from "react-router";
import FLPBox from "~/components/core/structure/FLPBox";
import HomeLogo from "~/components/navigation/HomeLogo";
import NavMenu from "~/components/navigation/NavMenu";
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
              ]}
            />
          )}
        </FLPBox>
        <FLPBox className={loginStyles}>
          <UserLogin />
        </FLPBox>
      </nav>
    </header>
  );
};

export default Header;
