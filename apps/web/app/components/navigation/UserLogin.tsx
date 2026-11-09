import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { useLoaderData } from "react-router";
import FLPButtonGroup from "~/components/core/buttons/FLPButtonGroup";
import FLPLinkButton from "~/components/core/buttons/FLPLinkButton";
import type { loader } from "~/root";

interface UserLoginProps {
  className?: string;
  size?: "sm" | "md";
}

const loginBtnStyle = css({
  px: { base: "2.5", sm: "4" },
  py: { base: "1.5", sm: "2" },
  fontSize: { base: "xs", sm: "sm" },
  whiteSpace: "nowrap",
});

const UserLogin: FC<UserLoginProps> = ({ className, size = "sm" }) => {
  const { t } = useTranslation();

  const { user } = useLoaderData<typeof loader>();

  return (
    <FLPButtonGroup className={className}>
      {user ? (
        <FLPLinkButton className={loginBtnStyle} size={size} text={t("logOut")} to="/logout" />
      ) : (
        <>
          <FLPLinkButton className={loginBtnStyle} size={size} text={t("signUp")} to="/signup" />
          <FLPLinkButton className={loginBtnStyle} size={size} text={t("logIn")} to="/login" />
        </>
      )}
    </FLPButtonGroup>
  );
};

export default UserLogin;
