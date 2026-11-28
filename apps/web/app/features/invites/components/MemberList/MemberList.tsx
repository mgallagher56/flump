import type { BetaMemberDto } from "@flump/api-contract";
import { Button, ConfirmDialog, VisuallyHidden } from "@repo/ui";
import { type FC, useEffect, useState } from "react";
import { formatInviteDate } from "../../inviteFormat";
import {
  memberListContact,
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

/** The person's name, else their email address, else the link's label. */
const nameOf = (member: BetaMemberDto) => member.name ?? member.email ?? member.label ?? "No label";

/** "Joined <date>", and which link when the label is not already the row's title. */
function joinedLine(member: BetaMemberDto): string {
  const joined = `Joined ${formatInviteDate(member.addedAt)}`;
  const titledByLabel = !member.name && !member.email;
  return member.label && !titledByLabel ? `${joined} with the link ${member.label}` : joined;
}

/**
 * Everyone who joined through an invite link, by name and email address (read from the sign-in
 * provider; the admin is the only one who sees this list), with "Remove access" behind a
 * confirmation.
 */
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
              {member.email && member.name ? (
                <span className={memberListContact()}>{member.email}</span>
              ) : null}
              <span className={memberListMeta()}>{joinedLine(member)}</span>
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
