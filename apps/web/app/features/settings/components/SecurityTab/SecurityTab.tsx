import { Button, Card, Icon, StatusBadge } from "@repo/ui";
import { KeyRound, Mail } from "lucide-react";
import { type FC, useState } from "react";
import { McpConnectionCard } from "~/features/ai-connections/components/McpConnectionCard";
import {
  sectionCard,
  sectionHeading,
  sectionLead,
  statusText,
  tabStack,
} from "~/features/settings/settings.styles";
import { useUserProfile } from "~/hooks/useUserProfile";
import {
  accountEmail,
  accountIcon,
  accountIdentity,
  accountLabel,
  accountRow,
} from "./SecurityTab.styles";

export interface SecurityTabProps {
  /** The sign-in email shown to the person. */
  email?: string | null;
}

/** Sign-in security and AI access: password reset by email and the MCP connection card. */
export const SecurityTab: FC<SecurityTabProps> = ({ email }) => {
  const { sendPasswordResetEmail } = useUserProfile();
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [sendingResetEmail, setSendingResetEmail] = useState(false);

  const handleSendResetEmail = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);
    setSendingResetEmail(true);
    try {
      const res = await sendPasswordResetEmail();
      setPasswordSuccess(res.message || "We will email you a link to reset your password.");
    } catch (err) {
      setPasswordError(
        err instanceof Error && err.message
          ? err.message
          : "We could not send the reset email. Try again.",
      );
    } finally {
      setSendingResetEmail(false);
    }
  };

  return (
    <div className={tabStack()} id="settings-security-tab" data-testid="settings-security-tab">
      <Card as="section" aria-labelledby="sign-in-heading" className={sectionCard()}>
        <h2 className={sectionHeading()} id="sign-in-heading">
          Sign in
        </h2>
        <div className={accountRow()}>
          <div className={accountIdentity()}>
            <span aria-hidden="true" className={accountIcon()}>
              <Icon icon={Mail} size="md" />
            </span>
            <div>
              <p className={accountLabel()}>Account email</p>
              <div
                className={accountEmail()}
                data-testid="user-email-display"
                id="user-email-display"
              >
                <span>{email || "Not set"}</span>
                {email ? (
                  <StatusBadge showIcon size="sm" variant="positive">
                    Verified
                  </StatusBadge>
                ) : null}
              </div>
            </div>
          </div>
          <Button
            data-testid="change-password-trigger"
            id="change-password-trigger"
            pending={sendingResetEmail}
            size="sm"
            type="button"
            variant="outline"
            onClick={handleSendResetEmail}
          >
            <Icon icon={KeyRound} size="sm" />
            Change password
          </Button>
        </div>
        <p className={sectionLead()}>We email you a link to choose a new password.</p>
        {passwordSuccess ? (
          <p
            className={statusText({ tone: "positive" })}
            data-testid="password-reset-status"
            id="password-reset-status"
            role="status"
          >
            {passwordSuccess}
          </p>
        ) : null}
        {passwordError ? (
          <p
            className={statusText({ tone: "danger" })}
            data-testid="password-reset-error"
            id="password-reset-error"
            role="alert"
          >
            {passwordError}
          </p>
        ) : null}
      </Card>

      <McpConnectionCard />
    </div>
  );
};
