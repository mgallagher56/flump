import { type FC, type ReactNode, useEffect, useRef, useState } from "react";
import { cx } from "../../../styled-system/css";
import { Button } from "../Button";
import { Money, type MoneyProps } from "../Money";
import {
  dataListCount,
  dataListFooter,
  dataListLabel,
  dataListRecipe,
  dataListRow,
  dataListSecondary,
  dataListText,
  dataListValue,
} from "./DataList.styles";

export interface DataListItem {
  id: string;
  label: ReactNode;
  /** Muted second line under the label. */
  secondary?: ReactNode;
  /**
   * Rendered with `Money`. `null` shows "Not set" (never £0); leave it out to show no figure.
   * Ignored when `valueDisplay` is given.
   */
  value?: number | null;
  /** Options for the `Money` figure (currency, sign, tone, decimals). */
  valueProps?: Omit<MoneyProps, "value">;
  /** Replaces the `Money` figure, for example a count or a StatusBadge. */
  valueDisplay?: ReactNode;
  /** Muted line under the figure, for example "this month". */
  valueSecondary?: ReactNode;
}

export interface DataListProps {
  items: DataListItem[];
  /** Rows shown before "Show all". Defaults to 8 (the long-list cap, I-16). */
  limit?: number;
  /** Singular and plural noun for the button and announcement. Defaults to item and items. */
  noun?: { one: string; other: string };
  /** Accessible name for the list. */
  label?: string;
  /** Start with every row shown. Once expanded the list does not collapse again. */
  defaultExpanded?: boolean;
  className?: string;
}

const countFormat = new Intl.NumberFormat("en-GB");
const pluralRules = new Intl.PluralRules("en-GB");

export const DataList: FC<DataListProps> = ({
  items,
  limit = 8,
  noun = { one: "item", other: "items" },
  label,
  defaultExpanded = false,
  className,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  // Id of the row that was just focused programmatically; it is only focusable (tabIndex -1)
  // until focus leaves it, so it never becomes a permanent tab stop.
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  const firstRevealedRef = useRef<HTMLLIElement | null>(null);
  const justExpanded = useRef(false);

  const cap = Math.max(1, Math.floor(limit));
  const total = items.length;
  const overflowing = total > cap;
  const visible = expanded || !overflowing ? items : items.slice(0, cap);
  const nounText = pluralRules.select(total) === "one" ? noun.one : noun.other;

  // Moving focus to the first newly revealed row keeps keyboard and screen reader users in place,
  // because the button that was focused disappears. Screen readers read the row on focus, so
  // there is deliberately no separate live region (it would announce the change twice).
  useEffect(() => {
    if (expanded && justExpanded.current) {
      justExpanded.current = false;
      firstRevealedRef.current?.focus();
    }
  }, [expanded]);

  const showAll = () => {
    justExpanded.current = true;
    setFocusTarget(items[cap]?.id ?? null);
    setExpanded(true);
  };

  return (
    <div className={className}>
      <ul aria-label={label} className={dataListRecipe()}>
        {visible.map((item, index) => {
          const isFirstRevealed = index === cap && overflowing;
          return (
            <li
              className={dataListRow()}
              key={item.id}
              ref={isFirstRevealed ? firstRevealedRef : undefined}
              onBlur={focusTarget === item.id ? () => setFocusTarget(null) : undefined}
              tabIndex={focusTarget === item.id ? -1 : undefined}
            >
              <div className={dataListText()}>
                <span className={dataListLabel()}>{item.label}</span>
                {item.secondary ? (
                  <span className={dataListSecondary()}>{item.secondary}</span>
                ) : null}
              </div>
              {item.valueDisplay !== undefined || item.value !== undefined ? (
                <div className={dataListValue()}>
                  {item.valueDisplay !== undefined ? (
                    item.valueDisplay
                  ) : (
                    <Money {...item.valueProps} value={item.value} />
                  )}
                  {item.valueSecondary ? (
                    <span className={dataListSecondary()}>{item.valueSecondary}</span>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {overflowing && !expanded ? (
        <div className={dataListFooter()}>
          <Button onClick={showAll} size="md" variant="secondary">
            <span>
              Show all <span className={cx(dataListCount())}>{countFormat.format(total)}</span>{" "}
              {nounText}
            </span>
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export default DataList;
