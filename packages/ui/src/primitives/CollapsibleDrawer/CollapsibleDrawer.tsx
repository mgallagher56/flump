import { ChevronDown } from "lucide-react";
import { type FC, type ReactNode, useId, useState } from "react";
import { cx } from "../../../styled-system/css";
import { Icon } from "../Icon";
import {
  drawerAction,
  drawerBody,
  drawerChevron,
  drawerContainer,
  drawerCount,
  drawerHeaderButton,
  drawerQuietBody,
  drawerQuietButton,
  drawerQuietContainer,
  drawerSubtitle,
  drawerTitle,
  drawerTitleRow,
} from "./CollapsibleDrawer.styles";

export interface CollapsibleDrawerProps {
  title: string;
  badge?: ReactNode;
  subtitle?: string;
  /**
   * Number of items (rows, months, years) held inside. Shown in the summary line, for example
   * "120 rows", so the size of a long schedule is clear before opening.
   */
  itemCount?: number;
  /** Singular and plural noun for `itemCount`. Defaults to row and rows. */
  itemNoun?: { one: string; other: string };
  /** Collapsed by default: schedules of more than 8 rows should not render uncollapsed. */
  defaultOpen?: boolean;
  /**
   * Trailing action text while open. Defaults to "Hide schedule". When either label is supplied
   * the trailing text is a visual cue only (aria-hidden) and `title` alone names the button.
   */
  openLabel?: string;
  /** Trailing action text while closed. Defaults to "View full schedule". */
  closedLabel?: string;
  /**
   * `card` (default): a bordered card with a full-width header row, for schedules and ledgers.
   * `quiet`: a small text button ("Show details", "Show data") with no card chrome, for secondary
   * detail under a chart or figure (plan P10.5). Its trigger shows `title` (and `itemCount`) while
   * closed and `openLabel` while open; without `openLabel`, a title starting "Show" reads "Hide"
   * instead ("Show data" becomes "Hide data") and any other title stays as it is. The accessible
   * name follows the visible text (WCAG 2.5.3) and `aria-expanded` carries the open state.
   * `badge`, `subtitle` and `closedLabel` are ignored.
   */
  variant?: "card" | "quiet";
  children: ReactNode;
  className?: string;
}

const countFormat = new Intl.NumberFormat("en-GB");

const SHOW = "Show";

/** True when `char` is a word character (letter, digit or underscore), matching regex `\w`. */
const isWordChar = (char: string): boolean =>
  (char >= "a" && char <= "z") ||
  (char >= "A" && char <= "Z") ||
  (char >= "0" && char <= "9") ||
  char === "_";

/** The quiet trigger's open text: `openLabel`, else "Show X" as "Hide X", else the title. */
export const quietOpenLabel = (title: string, openLabel?: string): string => {
  if (openLabel !== undefined) return openLabel;
  const startsWithShowWord = title.startsWith(SHOW) && !isWordChar(title.charAt(SHOW.length));
  return startsWithShowWord ? `Hide${title.slice(SHOW.length)}` : title;
};

export const CollapsibleDrawer: FC<CollapsibleDrawerProps> = ({
  title,
  badge,
  subtitle,
  itemCount,
  itemNoun = { one: "row", other: "rows" },
  defaultOpen = false,
  openLabel,
  closedLabel,
  variant = "card",
  children,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const bodyId = useId();
  const customLabels = openLabel !== undefined || closedLabel !== undefined;
  const countText =
    itemCount === undefined
      ? undefined
      : `${countFormat.format(itemCount)} ${itemCount === 1 ? itemNoun.one : itemNoun.other}`;

  if (variant === "quiet") {
    return (
      <div className={cx(drawerQuietContainer(), className)}>
        <button
          aria-controls={isOpen ? bodyId : undefined}
          aria-expanded={isOpen}
          className={drawerQuietButton()}
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          {isOpen ? quietOpenLabel(title, openLabel) : title}
          {countText && <span className={drawerCount()}>{countText}</span>}
          <span aria-hidden="true" className={drawerChevron({ open: isOpen })}>
            <Icon icon={ChevronDown} size="sm" />
          </span>
        </button>
        {isOpen && (
          <div className={drawerQuietBody()} id={bodyId}>
            {children}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cx(drawerContainer(), className)}>
      <button
        aria-controls={isOpen ? bodyId : undefined}
        aria-expanded={isOpen}
        className={cx(drawerHeaderButton())}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <div>
          <div className={drawerTitleRow()}>
            <span className={drawerTitle()}>{title}</span>
            {badge && <div>{badge}</div>}
            {countText && <span className={drawerCount()}>{countText}</span>}
          </div>
          {subtitle && <p className={drawerSubtitle()}>{subtitle}</p>}
        </div>

        <span aria-hidden={customLabels ? "true" : undefined} className={drawerAction()}>
          {isOpen ? (openLabel ?? "Hide schedule") : (closedLabel ?? "View full schedule")}
          <span aria-hidden="true" className={drawerChevron({ open: isOpen })}>
            <Icon icon={ChevronDown} size="sm" />
          </span>
        </span>
      </button>

      {isOpen && (
        <div className={cx(drawerBody())} id={bodyId}>
          {children}
        </div>
      )}
    </div>
  );
};

export default CollapsibleDrawer;
