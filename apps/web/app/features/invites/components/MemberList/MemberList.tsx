import type { BetaMemberDto } from "@flump/api-contract";
import { Button, ConfirmDialog, VisuallyHidden } from "@repo/ui";
import { type FC, useEffect, useState } from "react";
import { formatInviteDate } from "../../inviteFormat";
import {
  memberListEmpty,
  memberListMain,
  memberListMeta,
  memberListName,
  memberListRoot,
  memberListRow,
} from "./MemberList.styles";

export interface MemberListProps {
  members: BetaMemberDto[];
  /** Removes one person's access. Resolves once the server has answered. */
  onRemove: (userId: string) => void | Promise<void>;
  /** True while a removal is being sent. */
  pending?: boolean;
  /** Why the last removal failed, shown in the dialog. */
  error?: string | null;
}

const nameOf = (member: BetaMemberDto) => member.label ?? "No label";

/** Everyone who joined through an invite link, with "Remove access" behind a confirmation. */
export const MemberList: FC<MemberListProps> = ({
  members,
  onRemove,
  pending = false,
  error = null,
}) => {
  const [removing, setRemoving] = useState<BetaMemberDto | null>(null);
  // Once the list no longer has them (the removal went through), the dialog closes.
  useEffect(() => {
    if (removing && !members.some((m) => m.userId === removing.userId)) setRemoving(null);
  }, [members, removing]);
  if (members.length === 0 && !removing) {
    return <p className={memberListEmpty()}>Nobody has joined through an invite link yet.</p>;
  }
  return (
    <>
      <ul aria-label="People with access" className={memberListRoot()}>
        {members.map((member) => (
          <li className={memberListRow()} key={member.userId}>
            <div className={memberListMain()}>
              <span className={memberListName()}>{nameOf(member)}</span>
              <span className={memberListMeta()}>Joined {formatInviteDate(member.addedAt)}</span>
            </div>
            <Button size="sm" type="button" variant="outline" onClick={() => setRemoving(member)}>
              Remove access
              <VisuallyHidden>{` for ${nameOf(member)}`}</VisuallyHidden>
            </Button>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        confirmLabel="Remove access"
        description="They can no longer open Flump or use AI connections. Their data is kept. You can send them a new invite link later."
        error={error}
        id="remove-access"
        open={removing !== null}
        pending={pending}
        pendingLabel="Removing…"
        scope="single"
        title={removing ? `Remove access for ${nameOf(removing)}?` : "Remove access?"}
        tone="danger"
        onConfirm={async () => {
          if (!removing) return;
          await onRemove(removing.userId);
        }}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
      />
    </>
  );
};

export default MemberList;
