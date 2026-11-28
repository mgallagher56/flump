import type { FC } from "react";
import { signInHref } from "../../utils/site";
import { line, link } from "./InviteSignIn.styles";

/**
 * The quiet line under a close's button for people the owner has sent an invite link to (owner,
 * 28 Nov 2026: invites are shared by hand, so nothing asks for one). "Sign in" goes where the
 * header's does.
 */
export const InviteSignIn: FC = () => (
  <p className={line} data-testid="invite-sign-in">
    Have an invite link?{" "}
    <a className={link} href={signInHref()}>
      Sign in
    </a>
    .
  </p>
);
