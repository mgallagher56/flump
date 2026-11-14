import { Button, StatusBadge } from "@repo/ui";
import { type FC, useEffect, useRef, useState } from "react";
import type { CheckInSummary as CheckInSummaryModel } from "../../checkInModel";
import {
  CHECK_IN_COPY,
  checkInNetWorthText,
  checkInSavedText,
  checkInWholePounds,
  noBalancesChangedText,
} from "../../snapshotCopy";
import type { MonthKey } from "../../snapshotModel";
import {
  changeFigure,
  changeName,
  changeRow,
  changesList,
  summaryActions,
  summaryHeading,
  summaryLine,
  summaryRoot,
  summarySubheading,
} from "./CheckInSummary.styles";

/** Changed accounts shown before "Show all". */
export const SUMMARY_VISIBLE = 8;

export interface CheckInSummaryProps {
  month: MonthKey;
  summary: CheckInSummaryModel;
  onDone: () => void;
  /** Back to the accounts to correct one. */
  onChangeBalance: () => void;
}

/**
 * The end of the check-in: saved for the month, what changed, and net worth against last month.
 * Facts only: no verdict, no praise, and the same sentence whichever way net worth moved.
 */
export const CheckInSummary: FC<CheckInSummaryProps> = ({
  month,
  summary,
  onDone,
  onChangeBalance,
}) => {
  const [showAll, setShowAll] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const visible = showAll ? summary.changed : summary.changed.slice(0, SUMMARY_VISIBLE);

  return (
    <div className={summaryRoot()} data-testid="checkin-summary" id="checkin-summary">
      <h3 className={summaryHeading()} ref={heading} tabIndex={-1}>
        {checkInSavedText(month)}
      </h3>

      {summary.changed.length > 0 ? (
        <section aria-labelledby="checkin-changes-heading">
          <h4 className={summarySubheading()} id="checkin-changes-heading">
            {CHECK_IN_COPY.whatChanged}
          </h4>
          <ul className={changesList()}>
            {visible.map((c) => (
              <li className={changeRow()} key={c.accountId}>
                <span className={changeName()}>{c.name}</span>
                <span className={changeFigure()}>
                  {c.calculated ? (
                    <StatusBadge variant="neutral">{CHECK_IN_COPY.calculated}</StatusBadge>
                  ) : null}
                  {/* Read, not reconciled: whole pounds (copy guide). */}
                  {checkInWholePounds(c.value)}
                </span>
              </li>
            ))}
          </ul>
          {!showAll && summary.changed.length > SUMMARY_VISIBLE ? (
            <Button
              data-testid="checkin-show-all"
              id="checkin-show-all"
              onClick={() => setShowAll(true)}
              size="sm"
              type="button"
              variant="link"
            >
              {CHECK_IN_COPY.showAll}
            </Button>
          ) : null}
        </section>
      ) : (
        <p className={summaryLine()}>{noBalancesChangedText(summary.previousMonth)}</p>
      )}

      {summary.netWorth !== null ? (
        <p className={summaryLine()} data-testid="checkin-net-worth" id="checkin-net-worth">
          {checkInNetWorthText(summary.netWorth, summary.change, summary.previousMonth)}
        </p>
      ) : null}

      <div className={summaryActions()}>
        <Button
          data-testid="checkin-change-balance"
          id="checkin-change-balance"
          onClick={onChangeBalance}
          size="sm"
          type="button"
          variant="link"
        >
          {CHECK_IN_COPY.changeBalance}
        </Button>
        <Button data-testid="checkin-done" id="checkin-done" onClick={onDone} type="button">
          {CHECK_IN_COPY.done}
        </Button>
      </div>
    </div>
  );
};

export default CheckInSummary;
