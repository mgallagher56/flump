import { Icon, StatusBadge } from "@repo/ui";
import { ExternalLink } from "lucide-react";
import type { FC } from "react";
import { helpLine, helpLink, helpRoot, srOnly } from "./SharingHelpLine.styles";

/**
 * Whether the owner has approved the help line wording (E34 CD10). Option A from
 * docs/audit/plans/E34-help-line-wording.md, built and not yet approved: while false, the line
 * carries a visible marker saying so. Only the owner changes this; it is never shown as approved.
 */
export const HELP_LINE_WORDING_APPROVED = false;

export const HELP_LINE_URL = "https://survivingeconomicabuse.org/i-need-help/";

/**
 * One quiet line on the household screens, the same for everyone in the same place. It takes no
 * props, so no figure, choice or signal can trigger, move, reword or emphasise it (R4), and it has
 * no click tracking. A factual signpost, not a recommendation.
 */
export const SharingHelpLine: FC = () => (
  <div className={helpRoot()} id="sharing-help-line" data-testid="sharing-help-line">
    <p className={helpLine()}>
      {/* The whole line is the link: the name on its own trips the copy check's title case rule,
          and an allowed phrase for it needs sign-off first (AGENTS.md section 15). */}
      <a className={helpLink()} href={HELP_LINE_URL} rel="noopener noreferrer" target="_blank">
        Surviving Economic Abuse has information about economic abuse and where to find support.
        <Icon icon={ExternalLink} size="sm" />
        <span className={srOnly()}> (opens in a new tab)</span>
      </a>
    </p>
    {HELP_LINE_WORDING_APPROVED ? null : (
      <StatusBadge id="help-line-not-approved" data-testid="help-line-not-approved">
        Wording not yet approved by the owner
      </StatusBadge>
    )}
  </div>
);

export default SharingHelpLine;
