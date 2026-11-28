import type { FC } from "react";
import { DataExportSection } from "~/features/settings/components/DataExportSection";
import { DeleteAccountSection } from "~/features/settings/components/DeleteAccountSection";
import { useDeleteAccount } from "~/features/settings/hooks/useDeleteAccount";
import { notInvitedDataStack } from "./NotInvitedDataActions.styles";

export interface NotInvitedDataActionsProps {
  /**
   * Whether the account has anything to download (the server's answer). A never-invited account
   * has nothing, so only "Delete your account" is shown.
   */
  offerDownload?: boolean;
  /** Injected for tests and stories; defaults to the real download. */
  download?: () => Promise<void>;
}

/**
 * Data rights for someone signed in but not (or no longer) in the beta: a removed member keeps
 * their data until they delete it, so the not-invited page offers the same "Download your data"
 * and "Delete your account" sections as the settings Data tab. "Download your data" only when the
 * account holds something (a never-invited account has nothing to download). The backend lets an uninvited caller
 * reach both routes (`@AllowUninvited`); the export route and the delete action are not behind the
 * web invite gate.
 */
export const NotInvitedDataActions: FC<NotInvitedDataActionsProps> = ({
  download,
  offerDownload = true,
}) => {
  const { status, submit } = useDeleteAccount();
  return (
    <div className={notInvitedDataStack()} data-testid="not-invited-data-actions">
      {offerDownload ? <DataExportSection download={download} /> : null}
      <DeleteAccountSection status={status} onConfirm={submit} offerDownload={offerDownload} />
    </div>
  );
};
