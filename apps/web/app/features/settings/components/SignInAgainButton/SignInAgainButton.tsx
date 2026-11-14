import { Button } from "@repo/ui";
import type { FC } from "react";
import { useFetcher } from "react-router";
import { type AllowedReturnPath, REAUTH_RETURN_PATH } from "~/features/settings/account";
import { clearUserStorage } from "~/utils/userStorage";
import { signInAgainWrap } from "./SignInAgainButton.styles";

/**
 * "Sign in again" for actions that need a recent sign-in. A fresh sign-in needs the current
 * WorkOS session ended first (otherwise WorkOS signs the person straight back in with the old
 * sign-in time), so this signs out through `/logout` with the settings Data tab as the return
 * path: WorkOS logout, then `/login?returnTo=...`, then back to the Data tab. Submitted as a
 * fetcher so the cross-origin redirect is a plain navigation, not a form redirect chain.
 */
export interface SignInAgainButtonProps {
  /** Where to land after signing in again; must be one of the allowed return paths. */
  returnPath?: AllowedReturnPath;
}

export const SignInAgainButton: FC<SignInAgainButtonProps> = ({
  returnPath = REAUTH_RETURN_PATH,
}) => {
  const fetcher = useFetcher();
  const pending = fetcher.state !== "idle";

  return (
    <div className={signInAgainWrap()}>
      <Button
        id="sign-in-again-button"
        data-testid="sign-in-again-button"
        size="sm"
        type="button"
        variant="outline"
        pending={pending}
        onClick={() => {
          // Signing out wipes this browser's per-user storage, as every /logout form does.
          clearUserStorage();
          void fetcher.submit({ next: returnPath }, { method: "post", action: "/logout" });
        }}
      >
        Sign in again
      </Button>
    </div>
  );
};
