import type { FC } from "react";
import {
  moneyHelperGuidanceLink as link,
  moneyHelperGuidanceSrOnly as srOnly,
  moneyHelperGuidanceText as text,
} from "./MoneyHelperGuidance.styles";

/** MoneyHelper's pensions and retirement guidance (government-backed). Verified 2026-11-17. */
export const MONEYHELPER_PENSIONS_URL = "https://www.moneyhelper.org.uk/en/pensions-and-retirement";

/**
 * One quiet signpost to free pension guidance. Owner decision RD11, an R3 exception: MoneyHelper is
 * the only named service on the Retirement page. It takes no props on purpose: every user sees the
 * same line in the same place, and nothing about their pots, contributions or projection can
 * trigger, move or change it (advice boundary R4).
 */
export const MoneyHelperGuidance: FC = () => (
  <p className={text()}>
    MoneyHelper offers free, impartial guidance on pensions, backed by the government.{" "}
    <a className={link()} href={MONEYHELPER_PENSIONS_URL} rel="noopener noreferrer" target="_blank">
      Pension guidance from MoneyHelper
      <span className={srOnly()}> (opens in a new tab)</span>
    </a>
  </p>
);

export default MoneyHelperGuidance;
