import { Button, ButtonLink } from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Form, Link, useLoaderData } from "react-router";
import type { loader } from "~/root";
import { userLoginButton, userLoginGroup } from "./UserLogin.styles";

export interface UserLoginProps {
  className?: string;
  size?: "sm" | "md";
}

/** Sign-in and sign-up links for a visitor, or the sign-out button (a POST form) once signed in. */
const UserLogin: FC<UserLoginProps> = ({ className, size = "sm" }) => {
  const { t } = useTranslation();
  // Undefined in the root error boundary when the root loader failed: treat as signed out.
  const user = useLoaderData<typeof loader>()?.user;

  return (
    <div className={cx(userLoginGroup(), className)}>
      {user ? (
        <Form method="post" action="/logout">
          <Button className={userLoginButton()} size={size} type="submit" variant="ghost">
            {t("logOut", "Sign out")}
          </Button>
        </Form>
      ) : (
        <>
          <ButtonLink asChild className={userLoginButton()} size={size} variant="ghost">
            <Link to="/signup">{t("signUp", "Sign up")}</Link>
          </ButtonLink>
          <ButtonLink asChild className={userLoginButton()} size={size} variant="ghost">
            <Link to="/login">{t("logIn", "Sign in")}</Link>
          </ButtonLink>
        </>
      )}
    </div>
  );
};

export default UserLogin;
