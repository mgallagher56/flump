import type { BetaInviteDto, BetaInviteStatus } from "@flump/api-contract";
import { Button, StatusBadge, VisuallyHidden } from "@repo/ui";
import type { FC } from "react";
import { formatInviteDate } from "../../inviteFormat";
import {
  inviteListEmpty,
  inviteListMain,
  inviteListMeta,
  inviteListRoot,
  inviteListRow,
  inviteListTitle,
  inviteListUsedBy,
} from "./InviteList.styles";

const STATUS_LABEL: Record<BetaInviteStatus, string> = {
  unused: "Not used yet",
  used: "Used",
  expired: "Expired",
  cancelled: "Cancelled",
};

export interface InviteListProps {
  invites: BetaInviteDto[];
  /** Cancels an unused invite link. */
  onCancel: (id: string) => void;
  /** The invite being cancelled, if any. */
  pendingId?: string | null;
}

/** "Used by <name>, <email>" for a used link whose person is known; null otherwise. */
function usedByLine(invite: BetaInviteDto): string | null {
  if (invite.status !== "used") return null;
  const who = [invite.usedByName, invite.usedByEmail].filter(Boolean).join(", ");
  return who ? `Used by ${who}` : null;
}

function metaLine(invite: BetaInviteDto): string {
  const parts = [`Created ${formatInviteDate(invite.createdAt)}`];
  if (invite.usedAt) parts.push(`used ${formatInviteDate(invite.usedAt)}`);
  else if (invite.status === "unused")
    parts.push(`works until ${formatInviteDate(invite.expiresAt)}`);
  return parts.join(", ");
}

/** The invite links made recently: who each was for, what happened to it, and Cancel for unused ones. */
export const InviteList: FC<InviteListProps> = ({ invites, onCancel, pendingId = null }) => {
  if (invites.length === 0) {
    return <p className={inviteListEmpty()}>No invite links yet.</p>;
  }
  return (
    <ul aria-label="Invite links" className={inviteListRoot()}>
      {invites.map((invite) => {
        const name = invite.label ?? "No label";
        return (
          <li className={inviteListRow()} key={invite.id}>
            <div className={inviteListMain()}>
              <span className={inviteListTitle()}>
                {name}
                <StatusBadge variant={invite.status === "unused" ? "info" : "neutral"}>
                  {STATUS_LABEL[invite.status]}
                </StatusBadge>
              </span>
              {usedByLine(invite) ? (
                <span className={inviteListUsedBy()}>{usedByLine(invite)}</span>
              ) : null}
              <span className={inviteListMeta()}>{metaLine(invite)}</span>
            </div>
            {invite.status === "unused" ? (
              <Button
                disabled={pendingId === invite.id}
                size="sm"
                type="button"
                variant="outline"
                onClick={() => onCancel(invite.id)}
              >
                {pendingId === invite.id ? "Cancelling" : "Cancel link"}
                <VisuallyHidden>{` for ${name}`}</VisuallyHidden>
              </Button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
};

export default InviteList;
