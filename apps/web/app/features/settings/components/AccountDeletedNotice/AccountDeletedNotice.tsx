import { ButtonLink, Card } from "@repo/ui";
import { type FC, useEffect } from "react";
import { clearUserStorage } from "~/utils/userStorage";
import { noticeCard, noticeCopy, noticeHeading, noticeWrap } from "./AccountDeletedNotice.styles";

export interface AccountDeletedNoticeProps {
  /** Where the home link goes: the public marketing site. */
  homeUrl: string;
}

/**
 * Signed-out confirmation after an account deletion. Clears this browser's per-user storage on
 * mount, as signing out does, so nothing about the deleted account stays on the device.
 */
export const AccountDeletedNotice: FC<AccountDeletedNoticeProps> = ({ homeUrl }) => {
  useEffect(() => clearUserStorage(), []);

  return (
    <div className={noticeWrap()} id="account-deleted-notice" data-testid="account-deleted-notice">
      <Card as="section" aria-labelledby="account-deleted-heading" className={noticeCard()}>
        <h1 className={noticeHeading()} id="account-deleted-heading">
          Your account has been deleted
        </h1>
        <p className={noticeCopy()}>
          Your data and your login have been removed, and you have been signed out.
        </p>
        <p className={noticeCopy()}>Thank you for using Flump.</p>
        <div>
          <ButtonLink href={homeUrl} variant="outline">
            Go to the Flump homepage
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
};
