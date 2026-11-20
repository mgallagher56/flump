import { Button, Heading, TextInput } from "@repo/ui";
import { type FC, useId, useState } from "react";
import { formatInviteDate } from "../../inviteFormat";
import {
  newInviteLinkInput,
  newInviteLinkNote,
  newInviteLinkRoot,
  newInviteLinkRow,
} from "./NewInviteLink.styles";

export interface NewInviteLinkProps {
  /** The full invite link. Shown here once: it is never stored and cannot be shown again. */
  link: string;
  expiresAt: string;
  label: string | null;
}

/** The invite link just created, with a Copy button and when it stops working. */
export const NewInviteLink: FC<NewInviteLinkProps> = ({ link, expiresAt, label }) => {
  const inputId = useId();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
  };
  return (
    <section aria-labelledby={`${inputId}-heading`} className={newInviteLinkRoot()}>
      <Heading as="h2" id={`${inputId}-heading`} size="sm">
        {label ? `Invite link for ${label}` : "Invite link"}
      </Heading>
      <div className={newInviteLinkRow()}>
        <TextInput
          aria-label="Invite link"
          className={newInviteLinkInput()}
          id={inputId}
          readOnly
          value={link}
          onFocus={(event) => event.currentTarget.select()}
        />
        <Button type="button" variant="primary" onClick={copy}>
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
      <p className={newInviteLinkNote()}>
        Send it any way you like. It works once and stops working on {formatInviteDate(expiresAt)}.
        It will not be shown again.
      </p>
    </section>
  );
};

export default NewInviteLink;
