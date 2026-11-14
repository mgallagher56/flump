import { ButtonLink, Card } from "@repo/ui";
import { type FC, useEffect } from "react";
import { FinishDeletionPanel } from "~/features/settings/components/FinishDeletionPanel";
import { useDeleteAccount } from "~/features/settings/hooks/useDeleteAccount";
import { clearUserStorage } from "~/utils/userStorage";
import { noticeCard, noticeCopy, noticeHeading, noticeWrap } from "./AccountDeletedNotice.styles";

export interface AccountDeletedNoticeProps {
  /** Where the home link goes: the public marketing site. */
  homeUrl: string;
  /**
   * The data is erased but removing the login did not finish (the backend answered 410): show the
   * last step instead of the confirmation.
   */
  pending?: boolean;
}

/** Wires the last-step panel to the settings route's delete action. */
const FinishDeletion: FC = () => {
  const { status, submit } = useDeleteAccount();
  return <FinishDeletionPanel status={status} onConfirm={submit} />;
};

/**
 * Signed-out confirmation after an account deletion, or (with `pending`) the last step of a
 * deletion that stopped before the login was removed. Clears this browser's per-user storage on
 * mount, as signing out does, so nothing about the deleted account stays on the device.
 */
export const AccountDeletedNotice: FC<AccountDeletedNoticeProps> = ({
  homeUrl,
  pending = false,
}) => {
  useEffect(() => clearUserStorage(), []);

  if (pending) {
    return (
      <div
        className={noticeWrap()}
        id="account-deleted-notice"
        data-testid="account-deleted-notice"
      >
        <FinishDeletion />
      </div>
    );
  }

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
