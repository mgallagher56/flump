import { Button, Card, InlineAlert, PageSection, TextInput } from "@repo/ui";
import { Link2 } from "lucide-react";
import { type FC, useId, useState } from "react";
import { formatInviteDate } from "~/features/invites/inviteFormat";
import { linkActions, linkInput, linkNote, linkRow, linkStack } from "./InvitationLinkPanel.styles";

export type InvitationLinkPending = "create" | "cancel" | null;

export interface InvitationLinkPanelProps {
  /** The link just made. Shown here once: it is never stored and cannot be shown again. */
  link: string | null;
  /** When the person's open link stops working, or null when they have none. */
  expiresAt: string | null;
  pending: InvitationLinkPending;
  error: string | null;
  onCreate: () => void;
  onCancel: () => void;
}

/**
 * The invitation link (E34 C3): Flump makes a link and sends nothing; the person passes it on
 * themselves. The link is shown once with a Copy button; afterwards only when it stops working
 * shows, with Cancel. Making a new link replaces the old one.
 */
export const InvitationLinkPanel: FC<InvitationLinkPanelProps> = ({
  link,
  expiresAt,
  pending,
  error,
  onCreate,
  onCancel,
}) => {
  const inputId = useId();
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const copy = async () => {
    if (!link || !navigator.clipboard) return;
    await navigator.clipboard.writeText(link);
    setCopiedLink(link);
  };
  const busy = pending !== null;

  const makeButton = (label: string) => (
    <Button disabled={busy} type="button" variant="primary" onClick={onCreate}>
      {pending === "create" ? "Making link…" : label}
    </Button>
  );
  const cancelButton = (
    <Button disabled={busy} type="button" variant="outline" onClick={onCancel}>
      {pending === "cancel" ? "Cancelling…" : "Cancel link"}
    </Button>
  );

  return (
    <PageSection
      description="Make a link and give it to the other person yourself. Flump sends nothing."
      icon={Link2}
      id="household-invitation"
      title="Invite someone to your household"
      tone="neutral"
    >
      <Card className={linkStack()}>
        {link ? (
          <>
            <div className={linkRow()}>
              <TextInput
                aria-label="Invitation link"
                className={linkInput()}
                id={inputId}
                readOnly
                value={link}
                onFocus={(event) => event.currentTarget.select()}
              />
              <Button type="button" variant="primary" onClick={copy}>
                {copiedLink === link ? "Copied" : "Copy link"}
              </Button>
            </div>
            <p className={linkNote()}>
              {expiresAt
                ? `It works once and stops working on ${formatInviteDate(expiresAt)}.`
                : "It works once."}{" "}
              It will not be shown again.
            </p>
            <div className={linkActions()}>{cancelButton}</div>
          </>
        ) : expiresAt ? (
          <>
            <p className={linkNote()}>
              Your link works until {formatInviteDate(expiresAt)}. It cannot be shown again. A new
              link replaces it.
            </p>
            <div className={linkActions()}>
              {makeButton("Make a new link")}
              {cancelButton}
            </div>
          </>
        ) : (
          <div className={linkActions()}>{makeButton("Make a link")}</div>
        )}
        {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
      </Card>
    </PageSection>
  );
};

export default InvitationLinkPanel;
