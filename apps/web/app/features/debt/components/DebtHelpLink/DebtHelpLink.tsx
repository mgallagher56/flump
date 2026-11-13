import { Icon } from "@repo/ui";
import { ExternalLink } from "lucide-react";
import type { FC } from "react";
import { link, root, srOnly, text } from "./DebtHelpLink.styles";

/** MoneyHelper's free debt advice locator (government-backed). */
export const MONEYHELPER_DEBT_ADVICE_URL =
  "https://www.moneyhelper.org.uk/en/money-troubles/dealing-with-debt/debt-advice-locator";

/**
 * One neutral signpost to free debt advice. Owner-approved R3 exception (2026-11-13): MoneyHelper
 * is the only named service. It takes no props on purpose: every user sees the same line in the
 * same place, and nothing about balances, arrears or any other signal can trigger or change it
 * (advice boundary R4).
 */
export const DebtHelpLink: FC = () => (
  <aside aria-label="Debt advice" className={root()}>
    <p className={text()}>
      Free, impartial debt help is available from{" "}
      <a
        className={link()}
        href={MONEYHELPER_DEBT_ADVICE_URL}
        rel="noopener noreferrer"
        target="_blank"
      >
        MoneyHelper
        <Icon icon={ExternalLink} size="sm" />
        <span className={srOnly()}> (opens in a new tab)</span>
      </a>
      .
    </p>
  </aside>
);

export default DebtHelpLink;
