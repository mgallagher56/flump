import { InlineAlert, VisuallyHidden } from "@repo/ui";
import { type FC, useState } from "react";
import { MTD_NOTICE_DISMISS_LABEL, type MtdNoticeCopy } from "../../mtdNotice";
import { link, links, sentences } from "./MtdNotice.styles";

export interface MtdNoticeProps {
  /** From `mtdNoticeCopy`. Nothing renders when it is null. */
  copy: MtdNoticeCopy | null;
  /** True once the user has hidden it. */
  dismissed?: boolean;
  /** Saves the dismissal. The notice hides at once either way. */
  onDismiss?: () => void | Promise<void>;
}

/**
 * The Making Tax Digital for Income Tax notice (E28 A3): a quiet information notice on Self
 * Assessment and Invoicing. It states the rules, what the user recorded and where to check on
 * GOV.UK, and that Flump does not send anything to HMRC.
 */
export const MtdNotice: FC<MtdNoticeProps> = ({ copy, dismissed = false, onDismiss }) => {
  const [hiddenNow, setHiddenNow] = useState(false);
  if (!copy || dismissed || hiddenNow) return null;

  const handleDismiss = () => {
    setHiddenNow(true);
    if (onDismiss) void Promise.resolve(onDismiss()).catch(() => undefined);
  };

  return (
    <InlineAlert
      tone="info"
      id="mtd-notice"
      data-kind={copy.kind}
      dismissLabel={MTD_NOTICE_DISMISS_LABEL}
      onDismiss={onDismiss ? handleDismiss : undefined}
      action={
        <ul className={links()}>
          {copy.links.map((item) => (
            <li key={item.href}>
              <a className={link()} href={item.href} rel="noopener noreferrer" target="_blank">
                {item.label}
                <VisuallyHidden> (opens in a new tab)</VisuallyHidden>
              </a>
            </li>
          ))}
        </ul>
      }
    >
      <div className={sentences()}>
        {copy.kind === "over" ? (
          copy.sentences.map((sentence) => <p key={sentence}>{sentence}</p>)
        ) : (
          <p>{copy.sentences.join(" ")}</p>
        )}
      </div>
    </InlineAlert>
  );
};
