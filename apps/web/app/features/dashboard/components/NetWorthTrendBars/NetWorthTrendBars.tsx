import type { NetWorthTrend, NetWorthTrendBar } from "@flump/finance-engine";
import { formatMoney, VisuallyHidden } from "@repo/ui";
import type { FC } from "react";
import { formatMonth } from "~/features/snapshot/snapshotModel";
import { trendBars } from "./NetWorthTrendBars.styles";

export interface NetWorthTrendBarsProps {
  /** From `selectNetWorthTrend`: the bars and their geometry. Draw nothing when it is null. */
  trend: NetWorthTrend;
  /** Element id, also the `data-testid`. */
  id?: string;
}

/** Plot units. The plot is 100 high, so the engine's percentages are used as they are. */
const PLOT_HEIGHT = 100;
const BAR_WIDTH = 24;
const BAR_GAP = 16;
/** The outline of every bar, about 1.5px at the drawn size, so a very small month still shows. */
const BAR_STROKE = 3;
const ZERO_STROKE = 2;

/** "Net worth at your last 7 monthly check-ins, oldest first." */
export const trendIntro = (count: number): string =>
  `Net worth at your last ${count} monthly check-ins, oldest first.`;

/** "No check-in for August 2026", or "No check-ins from July to September 2026". */
export const missedLine = (missed: NonNullable<NetWorthTrendBar["missedBefore"]>): string =>
  missed.count === 1
    ? `No check-in for ${formatMonth(missed.from)}`
    : `No check-ins from ${formatMonth(missed.from)} to ${formatMonth(missed.to)}`;

/** "November 2026, the latest: £52,100", with a minus read as "minus". */
export const barLine = (bar: NetWorthTrendBar): string => {
  const money = formatMoney(bar.netWorth, { fractionDigits: 0 });
  return `${formatMonth(bar.month)}${bar.latest ? ", the latest" : ""}: ${money.spoken ?? money.text}`;
};

/**
 * The Home hero's trend bars (Midnight and Mint mock-up, owner request of 25 Nov 2026): net worth
 * at the last seven recorded months, oldest on the left, the latest month solid and the others
 * outlined. Every bar runs from a zero line on one uncropped scale (`selectNetWorthTrend`), so a
 * lower month is simply a shorter bar: no arrows, no change figure, no colour for a fall. A break
 * in the check-ins is one empty slot. The drawing is hidden from assistive technology and the same
 * months and figures are read from a visually hidden list instead.
 */
export const NetWorthTrendBars: FC<NetWorthTrendBarsProps> = ({
  trend,
  id = "net-worth-trend",
}) => {
  const slots = trendBars();
  // One slot per bar, and one empty slot before a bar that follows a break in the check-ins.
  const placed: { bar: NetWorthTrendBar; slot: number }[] = [];
  let slot = 0;
  for (const bar of trend.bars) {
    if (bar.missedBefore) slot += 1;
    placed.push({ bar, slot });
    slot += 1;
  }
  const width = slot * (BAR_WIDTH + BAR_GAP) - BAR_GAP;

  return (
    <div className={slots.root} data-testid={id} id={id}>
      <svg
        aria-hidden="true"
        className={slots.plot}
        data-testid={`${id}-plot`}
        id={`${id}-plot`}
        focusable="false"
        viewBox={`0 0 ${width} ${PLOT_HEIGHT}`}
      >
        {placed.map(({ bar, slot: at }) =>
          bar.height === 0 ? null : (
            <rect
              className={bar.latest ? slots.latest : slots.earlier}
              data-latest={bar.latest ? "true" : "false"}
              data-month={bar.month}
              fill={bar.latest ? "currentColor" : "none"}
              height={bar.height}
              key={bar.month}
              stroke="currentColor"
              strokeWidth={BAR_STROKE}
              width={BAR_WIDTH}
              x={at * (BAR_WIDTH + BAR_GAP)}
              y={bar.top}
            />
          ),
        )}
        <line
          className={slots.zero}
          data-zero-line="true"
          stroke="currentColor"
          strokeWidth={ZERO_STROKE}
          x1={0}
          x2={width}
          y1={trend.zeroLine}
          y2={trend.zeroLine}
        />
      </svg>
      <VisuallyHidden as="div">
        <p>{trendIntro(trend.bars.length)}</p>
        <ul>
          {trend.bars.flatMap((bar) => [
            ...(bar.missedBefore
              ? [<li key={`${bar.month}-missed`}>{missedLine(bar.missedBefore)}</li>]
              : []),
            <li key={bar.month}>{barLine(bar)}</li>,
          ])}
        </ul>
      </VisuallyHidden>
    </div>
  );
};
