import { Button, ButtonLink, Card, Illustration, InlineAlert, PageBody } from "@repo/ui";
import type { FC, ReactNode } from "react";
import { Form } from "react-router";
import {
  isUpcoming,
  longDate,
  TERMS_ACCEPTANCE_PATH,
  type TermsStatus,
  termsAsk,
  termsHeading,
} from "~/features/legal/terms";
import { DataExportSection } from "~/features/settings/components/DataExportSection";
import { DeleteAccountSection } from "~/features/settings/components/DeleteAccountSection";
import { useDeleteAccount } from "~/features/settings/hooks/useDeleteAccount";
import {
  actions,
  copy,
  dataStack,
  heading,
  legalLink,
  screenCard,
  screenWrap,
  srOnly,
} from "./TermsAcceptanceScreen.styles";

export type TermsAcceptanceError = "changed" | "failed";

const ERRORS: Record<TermsAcceptanceError, string> = {
  changed: "The terms or privacy notice changed while you were reading. Read the new versions.",
  failed: "We could not save that. Try again.",
};

export interface TermsAcceptanceScreenProps {
  status: TermsStatus;
  /** Origin of the marketing site, where the legal pages live. */
  marketingOrigin: string;
  /** Where to go after agreeing, already checked to be a path on this site. */
  next: string;
  /** The last submit failed. */
  error?: TermsAcceptanceError | null;
  /** The agreement is being sent. */
  submitting?: boolean;
  /** Injected for tests and stories; defaults to the real download. */
  download?: () => Promise<void>;
}

/** A legal page on the marketing site, opening in a new tab so this page keeps its place. */
const LegalLink: FC<{ href: string; children: ReactNode }> = ({ href, children }) => (
  <a className={legalLink()} href={href} target="_blank" rel="noopener noreferrer">
    {children}
    <span className={srOnly()}> (opens in a new tab)</span>
  </a>
);

/** Download and delete, for a person who does not agree. Deletion comes back here after a re-sign-in. */
const DataActions: FC<{ download?: () => Promise<void> }> = ({ download }) => {
  const { status, submit } = useDeleteAccount();
  return (
    <div className={dataStack()} data-testid="terms-data-actions">
      <DataExportSection download={download} />
      <DeleteAccountSection
        status={status}
        onConfirm={submit}
        reauthReturnPath={TERMS_ACCEPTANCE_PATH}
      />
    </div>
  );
};

/**
 * Terms acceptance: the first page after sign-up (and the invite), before onboarding, and again
 * when a version of the terms or the privacy notice changes. The terms of use are a contract the
 * person agrees to; the privacy notice is information they are shown, never agreed or consented
 * to. One clear action, no checkbox, nothing pre-ticked, no marketing consent. A person who does
 * not agree can still download their data, delete their account or sign out.
 */
export const TermsAcceptanceScreen: FC<TermsAcceptanceScreenProps> = ({
  status,
  marketingOrigin,
  next,
  error = null,
  submitting = false,
  download,
}) => {
  const origin = marketingOrigin.replace(/\/+$/, "");
  const termsHref = `${origin}${status.terms.path}`;
  const privacyHref = `${origin}${status.privacyNotice.path}`;
  const ask = termsAsk(status);
  const upcoming = isUpcoming(status);
  // The later of the two dates (`YYYY-MM-DD` strings sort as dates).
  const [effectiveFrom] = [status.terms.effectiveFrom, status.privacyNotice.effectiveFrom]
    .sort()
    .reverse();

  return (
    <PageBody>
      <div className={screenWrap()} id="terms-acceptance" data-testid="terms-acceptance">
        {/* PROTOTYPE ONLY: a decorative welcome beside the unchanged terms card (hidden from
            assistive technology; the card's own heading names the task). */}
        <div aria-hidden="true" data-proto-welcome="">
          <span data-proto-ornament="">
            <span data-orb="1" />
            <span data-orb="2" />
            <span data-orb="3" />
            <span data-orb="4" />
          </span>
          <p className="proto-welcome__kicker">Welcome to Flump</p>
          <p className="proto-welcome__lead">
            Your money, in one clear picture. First the agreement, then four short steps.
          </p>
          <span className="proto-welcome__picture">
            <Illustration scene="onboarding" size="md" variant="document" />
          </span>
        </div>
        <Card as="section" aria-labelledby="terms-acceptance-heading" className={screenCard()}>
          <h1 className={heading()} id="terms-acceptance-heading">
            {termsHeading(status)}
          </h1>
          {ask === "agree" ? (
            <p className={copy()}>
              Read our <LegalLink href={termsHref}>terms of use</LegalLink> (version{" "}
              {status.terms.version}, {status.terms.updated}). They are the agreement between you
              and Flump.
            </p>
          ) : null}
          <p className={copy()}>
            {ask === "agree" ? "Please also read our " : "Read our "}
            <LegalLink href={privacyHref}>privacy notice</LegalLink> (version{" "}
            {status.privacyNotice.version}). It explains what we hold about you and why. You do not
            need to agree to it.
          </p>
          {upcoming ? (
            <p className={copy()}>
              These changes apply from {longDate(effectiveFrom ?? status.terms.effectiveFrom)}. You
              can carry on until then.
            </p>
          ) : null}
          {error ? <InlineAlert tone="danger">{ERRORS[error]}</InlineAlert> : null}
          <Form method="post" className={actions()} replace>
            <input type="hidden" name="termsVersion" value={status.terms.version} />
            <input type="hidden" name="privacyNoticeVersion" value={status.privacyNotice.version} />
            <input type="hidden" name="next" value={next} />
            {ask === "agree" ? (
              <p className={copy()}>
                By selecting Agree and continue, you agree to the{" "}
                <LegalLink href={termsHref}>terms of use</LegalLink>.
              </p>
            ) : null}
            <div>
              <Button type="submit" variant="primary" pending={submitting}>
                {ask === "agree" ? "Agree and continue" : "Continue"}
              </Button>
            </div>
          </Form>
          {upcoming ? (
            <div>
              <ButtonLink href={next} variant="ghost">
                Not now
              </ButtonLink>
            </div>
          ) : (
            <p className={copy()}>
              {ask === "agree"
                ? "If you do not agree, you cannot use Flump. You can still download your data or delete your account."
                : "If you would rather not continue, you can still download your data or delete your account."}
            </p>
          )}
        </Card>
        {upcoming ? null : <DataActions download={download} />}
        {upcoming ? null : (
          // The page has no account menu, so the way out is here (root.tsx clears this browser's
          // storage for any form posting to /logout).
          <form action="/logout" method="post">
            <Button type="submit" variant="ghost">
              Sign out
            </Button>
          </form>
        )}
      </div>
    </PageBody>
  );
};
