import { Button } from "@repo/ui";
import { type FC, useState } from "react";
import { longDate, TERMS_ACCEPTANCE_PATH } from "~/features/legal/terms";
import { noticeLink, noticeRow, noticeText } from "./TermsChangeNotice.styles";

export interface TermsChangeNoticeProps {
  /** Which pages change. */
  terms: boolean;
  privacyNotice: boolean;
  /** The UK date the change applies from, `YYYY-MM-DD`. */
  effectiveFrom: string;
  /** The page to come back to, a path on this site. */
  next: string;
}

function sentence({
  terms,
  privacyNotice,
}: Pick<TermsChangeNoticeProps, "terms" | "privacyNotice">): string {
  if (terms && privacyNotice) return "Our terms of use and privacy notice change on";
  if (terms) return "Our terms of use change on";
  return "Our privacy notice changes on";
}

/**
 * A coming change to the terms or the privacy notice (terms acceptance): the version is published
 * but not yet in force, so the person can read it and agree early, or hide this until their next
 * visit. Nothing is stored when it is hidden. A quiet line below the page content, not an alert:
 * nothing needs doing yet (UX-GUIDELINES E8, E9), and it never adds a second notice above the h1.
 */
export const TermsChangeNotice: FC<TermsChangeNoticeProps> = (props) => {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  const href = `${TERMS_ACCEPTANCE_PATH}?next=${encodeURIComponent(props.next)}`;
  return (
    <section
      aria-label="Coming change to our terms"
      className={noticeRow()}
      data-testid="terms-change-notice"
    >
      <p className={noticeText()}>
        {sentence(props)} {longDate(props.effectiveFrom)}.{" "}
        <a className={noticeLink()} href={href}>
          Read the changes
        </a>
      </p>
      <Button type="button" variant="ghost" size="sm" onClick={() => setHidden(true)}>
        Hide this notice
      </Button>
    </section>
  );
};
