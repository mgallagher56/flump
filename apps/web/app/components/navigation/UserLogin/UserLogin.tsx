import { Button, ButtonLink } from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Form, Link, useRouteLoaderData } from "react-router";
import type { loader } from "~/root";
import { userLoginButton, userLoginGroup, userLoginSignUp } from "./UserLogin.styles";

export interface UserLoginProps {
  className?: string;
  size?: "sm" | "md";
  /**
   * Where "Sign up" shows: `always` (default, the drawer), `fromSm` (the top bar: on a phone the
   * drawer offers it instead) or `never` (the sandbox has its own in the bar and at the page end).
   */
  signUp?: "always" | "fromSm" | "never";
}

/** Sign-in and sign-up links for a visitor, or the sign-out button (a POST form) once signed in. */
const UserLogin: FC<UserLoginProps> = ({ className, size = "sm", signUp = "always" }) => {
  const { t } = useTranslation();
  // Read by route id so it works from any route and the root error boundary. Undefined only when
  // the root loader itself failed: treat as signed out.
  const user = useRouteLoaderData<typeof loader>("root")?.user;

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
          {signUp !== "never" && (
            // The wrapper owns the display swap, so it never competes with the button's display.
            <span className={signUp === "fromSm" ? userLoginSignUp() : undefined}>
              <ButtonLink asChild className={userLoginButton()} size={size} variant="ghost">
                <Link to="/signup">{t("signUp", "Sign up")}</Link>
              </ButtonLink>
            </span>
          )}
          <ButtonLink asChild className={userLoginButton()} size={size} variant="ghost">
            <Link to="/login">{t("logIn", "Sign in")}</Link>
          </ButtonLink>
        </>
      )}
    </div>
  );
};

export default UserLogin;
