import type { FC } from "react";
import { DataExportSection } from "~/features/settings/components/DataExportSection";
import { DeleteAccountSection } from "~/features/settings/components/DeleteAccountSection";
import { useDeleteAccount } from "~/features/settings/hooks/useDeleteAccount";
import { notInvitedDataStack } from "./NotInvitedDataActions.styles";

export interface NotInvitedDataActionsProps {
  /** Injected for tests and stories; defaults to the real download. */
  download?: () => Promise<void>;
}

/**
 * Data rights for someone signed in but not (or no longer) in the beta: a removed member keeps
 * their data until they delete it, so the not-invited page offers the same "Download your data"
 * and "Delete your account" sections as the settings Data tab. The backend lets an uninvited caller
 * reach both routes (`@AllowUninvited`); the export route and the delete action are not behind the
 * web invite gate.
 */
export const NotInvitedDataActions: FC<NotInvitedDataActionsProps> = ({ download }) => {
  const { status, submit } = useDeleteAccount();
  return (
    <div className={notInvitedDataStack()} data-testid="not-invited-data-actions">
      <DataExportSection download={download} />
      <DeleteAccountSection status={status} onConfirm={submit} />
    </div>
  );
};
