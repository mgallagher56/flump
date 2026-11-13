import { Money, Num } from "@repo/ui";
import type { FC } from "react";
import { NotSet } from "~/features/feedback/components/NotSet";
import {
  content,
  headline,
  label,
  meta,
  notSetWrap,
  statLabel,
  statRow,
  statTile,
  statValue,
} from "../../widgetBody.styles";
import { WIDGET_ICONS } from "../../widgetIcons";
import { WidgetCard } from "../WidgetCard";
import {
  allocation,
  barFrame,
  barSvg,
  legend,
  legendItem,
  segmentFill,
  swatch,
} from "./AccountsWidget.styles";

export interface AccountsWidgetData {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  accountsCount: number;
  /** Absolute balance per account type, liabilities included. */
  typeTotals: Record<string, number>;
}

export interface AccountsWidgetProps {
  data?: AccountsWidgetData | null;
}

/** Only asset types are shown in the allocation bar, so the segments add up to 100%. */
const ASSET_TYPES = ["Current", "Saving", "Investment", "Pension", "Property", "Owed"] as const;

type Series = 1 | 2 | 3 | 4 | 5;
const SERIES: readonly Series[] = [1, 2, 3, 4, 5];

export interface AllocationSegment {
  type: string;
  value: number;
  pct: number;
  start: number;
  series: Series;
}

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export const buildSegments = (
  typeTotals: Record<string, number> | undefined,
): AllocationSegment[] => {
  const entries = ASSET_TYPES.map((type) => [type, Number(typeTotals?.[type])] as const)
    .filter(([, value]) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  let start = 0;
  return entries.map(([type, value], index) => {
    const pct = (value / total) * 100;
    const segment = { type, value, pct, start, series: SERIES[index] ?? 5 };
    start += pct;
    return segment;
  });
};

/** Net worth, assets and liabilities, with an asset allocation bar by account type. */
export const AccountsWidget: FC<AccountsWidgetProps> = ({ data }) => {
  const known = Boolean(data && data.accountsCount > 0 && finite(data.netWorth));
  const segments = buildSegments(data?.typeTotals);
  const count = data?.accountsCount ?? 0;
  const summary = segments.map((s) => `${s.type} ${Math.round(s.pct)}%`).join(", ");

  return (
    <WidgetCard href="/app/accounts" icon={WIDGET_ICONS.accounts} id="accounts" title="Accounts">
      <div className={content()}>
        <div className={headline()} role="status">
          <p className={label()}>Net worth</p>
          {known && data ? (
            <>
              <Money
                size="lg"
                tone={data.netWorth < 0 ? "danger" : "default"}
                value={data.netWorth}
              />
              <p className={meta()}>
                {count} {count === 1 ? "account" : "accounts"}
              </p>
            </>
          ) : (
            <p className={notSetWrap()}>
              <NotSet href="/app/accounts" subject="an account" />
            </p>
          )}
        </div>

        {known && data ? (
          <dl className={statRow()}>
            <div className={statTile()}>
              <dt className={statLabel()}>Assets</dt>
              <dd className={statValue()}>
                <Money tone="positive" value={finite(data.totalAssets) ? data.totalAssets : null} />
              </dd>
            </div>
            <div className={statTile()}>
              <dt className={statLabel()}>Liabilities</dt>
              <dd className={statValue()}>
                <Money
                  tone="danger"
                  value={finite(data.totalLiabilities) ? data.totalLiabilities : null}
                />
              </dd>
            </div>
          </dl>
        ) : null}

        {segments.length > 0 ? (
          <div className={allocation()}>
            <p className={label()}>Where your assets are held</p>
            <div
              aria-label={`Asset allocation by account type: ${summary}`}
              className={barFrame()}
              role="img"
            >
              <svg
                aria-hidden="true"
                className={barSvg()}
                focusable="false"
                preserveAspectRatio="none"
                viewBox="0 0 100 1"
              >
                {segments.map((s) => (
                  <rect
                    className={segmentFill({ series: s.series })}
                    height="1"
                    key={s.type}
                    width={s.pct}
                    x={s.start}
                    y="0"
                  />
                ))}
              </svg>
            </div>
            <ul aria-label="Asset allocation by account type" className={legend()}>
              {segments.map((s) => (
                <li className={legendItem()} key={s.type}>
                  <span aria-hidden="true" className={swatch({ series: s.series })} />
                  <span>{s.type}</span>
                  <Money size="sm" value={s.value} />
                  <Num fractionDigits={0} kind="percent" size="sm" tone="muted" value={s.pct} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </WidgetCard>
  );
};

export default AccountsWidget;
