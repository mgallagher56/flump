import { joinNetWorthLeftOut, type NetWorthLeftOut } from "@flump/finance-engine";
import type { FC } from "react";
import { Link } from "react-router";
import { basisLine, basisLink } from "./NetWorthBasisLine.styles";

/** The net worth choices on the Settings Profile tab. */
export const NET_WORTH_SETTINGS_HREF = "/app/profile?tab=profile#net-worth";
/** Where a Property account (the home's value) is added. */
export const ADD_HOME_VALUE_HREF = "/app/accounts";

export const CHANGE_WHAT_COUNTS = "Change what counts";
export const HOME_VALUE_MISSING_TEXT =
  "Your home's value is not counted until you add an estimate.";
export const ADD_AN_ESTIMATE = "Add an estimate";

/** "Not counting your property, mortgage or student loan." Empty when nothing is left out. */
export const leftOutSentence = (leftOut: readonly NetWorthLeftOut[]): string => {
  const items = joinNetWorthLeftOut(leftOut);
  return items ? `Not counting your ${items}.` : "";
};

export interface NetWorthBasisLineProps {
  /** What the net worth figure leaves out, from the engine (`NetWorthTotals.leftOut`). */
  leftOut: readonly NetWorthLeftOut[];
  /**
   * Show "Change what counts" on its own when nothing is left out, so the choice can be found
   * from the figure. Used once, on the accounts totals, where net worth is explained.
   */
  alwaysShowLink?: boolean;
  id?: string;
}

/**
 * The one quiet line under a net worth figure (net worth choices). A missing home value asks for
 * an estimate instead of the leave-out line, so a surface carries one notice at most. No figures,
 * no colour, and nothing that suggests which choice is better.
 */
export const NetWorthBasisLine: FC<NetWorthBasisLineProps> = ({
  leftOut,
  alwaysShowLink = false,
  id = "net-worth-basis-line",
}) => {
  if (leftOut.includes("homeValueMissing")) {
    return (
      <p className={basisLine()} data-testid={id} id={id}>
        {HOME_VALUE_MISSING_TEXT}{" "}
        <Link className={basisLink()} to={ADD_HOME_VALUE_HREF}>
          {ADD_AN_ESTIMATE}
        </Link>
      </p>
    );
  }
  const sentence = leftOutSentence(leftOut);
  if (!sentence && !alwaysShowLink) return null;
  return (
    <p className={basisLine()} data-testid={id} id={id}>
      {sentence ? `${sentence} ` : null}
      <Link className={basisLink()} to={NET_WORTH_SETTINGS_HREF}>
        {CHANGE_WHAT_COUNTS}
      </Link>
    </p>
  );
};

export default NetWorthBasisLine;
