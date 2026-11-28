import { Button, Illustration, StatusBadge } from "@repo/ui";
import { type FC, useEffect, useRef, useState } from "react";
import type { CheckInSummary as CheckInSummaryModel } from "../../checkInModel";
import {
  CHECK_IN_COPY,
  checkInChangeText,
  checkInNetWorthChange,
  checkInWholeTotal,
  formatMonthInBrief,
  formatWarmConfirmation,
} from "../../snapshotCopy";
import type { MonthKey } from "../../snapshotModel";

import {
  briefBlock,
  changeFigure,
  changeName,
  changeRow,
  changesList,
  netWorthBlock,
  netWorthFigure,
  netWorthLabel,
  summaryActions,
  summaryHeading,
  summaryLine,
  summaryRoot,
  summaryScene,
  summarySubheading,
} from "./CheckInSummary.styles";

/** Changed accounts shown before "Show all". */
export const SUMMARY_VISIBLE = 8;

export interface CheckInSummaryProps {
  summary: CheckInSummaryModel;
  /** The month just checked in, for the heading ("November is checked in."). */
  month: MonthKey;
  onDone: () => void;
  /** Back to the accounts to correct one. */
  onChangeBalance: () => void;
}

/**
 * The end of the check-in: the warm confirmation ("November is checked in.", copy guide 2.5), what
 * the user changed (each from its old figure to the new one), and net worth, the summary's largest
 * figure, against last month. The heading celebrates the action, never the amount: the change is
 * stated once, in the net worth block. With nothing changed the list and its heading are
 * left out, and net worth stands alone. Facts only: no verdict, no praise, and the same sentence
 * whichever way net worth moved. Whole pounds throughout: read, not reconciled (copy guide).
 */
export const CheckInSummary: FC<CheckInSummaryProps> = ({
  summary,
  month,
  onDone,
  onChangeBalance,
}) => {
  const [showAll, setShowAll] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const visible = showAll ? summary.changed : summary.changed.slice(0, SUMMARY_VISIBLE);
  const brief = formatMonthInBrief(month, summary);

  return (
    <div className={summaryRoot()} data-testid="checkin-summary" id="checkin-summary">
      <div className={summaryScene()}>
        <Illustration id="checkin-summary-scene" scene="check-in-done" settle={false} size="sm" />
      </div>
      <h3 className={summaryHeading()} ref={heading} tabIndex={-1}>
        {formatWarmConfirmation({ kind: "checkInFinished", month })}
      </h3>

      {brief ? (
        <section
          aria-labelledby="checkin-brief-heading"
          className={briefBlock()}
          data-testid="checkin-month-in-brief"
          id="checkin-month-in-brief"
        >
          <h4 className={summarySubheading()} id="checkin-brief-heading">
            {brief.heading}
          </h4>
          <p className={summaryLine()}>{brief.facts.join(" ")}</p>
        </section>
      ) : null}

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
                  {checkInChangeText(c.previous, c.value)}
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
      ) : null}

      {summary.netWorth !== null ? (
        <div className={netWorthBlock()} data-testid="checkin-net-worth" id="checkin-net-worth">
          <p className={netWorthLabel()}>{CHECK_IN_COPY.netWorth}</p>
          <p className={netWorthFigure()}>{checkInWholeTotal(summary.netWorth)}</p>
          {summary.change !== null ? (
            <p className={summaryLine()}>
              {checkInNetWorthChange(summary.change, summary.previousMonth)}
            </p>
          ) : null}
        </div>
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
