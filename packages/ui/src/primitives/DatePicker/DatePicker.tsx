import * as RadixPopover from "@radix-ui/react-popover";
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { type FC, type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { cx } from "../../../styled-system/css";
import { Icon } from "../Icon/Icon";
import {
  datePickerContentRecipe,
  datePickerDayRecipe,
  datePickerDaysGridRecipe,
  datePickerFooterRecipe,
  datePickerHeaderRecipe,
  datePickerLiveRegionRecipe,
  datePickerNavButtonRecipe,
  datePickerPeriodCellRecipe,
  datePickerPeriodGridRecipe,
  datePickerTitleGroupRecipe,
  datePickerTriggerRecipe,
  datePickerWeekdayRecipe,
  datePickerWeekdaysRecipe,
  datePickerWeekRowRecipe,
} from "./DatePicker.styles";

export interface DatePickerProps {
  id?: string;
  name?: string;
  /** ISO date string (`YYYY-MM-DD`) or empty string. */
  value?: string;
  onValueChange?: (value: string) => void;
  /** Earliest selectable ISO date (`YYYY-MM-DD`). */
  min?: string;
  /** Latest selectable ISO date (`YYYY-MM-DD`). */
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  /**
   * Marks the field as required. `aria-required` is not allowed on a button, so the trigger is
   * described as "Required" instead. `controlProps` passes it.
   */
  required?: boolean;
  clearable?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-required"?: boolean;
  className?: string;
}

type CalendarView = "days" | "months" | "years";

interface DateParts {
  year: number;
  month: number;
  day: number;
}

// en-GB names from Intl. 1 January 2024 was a Monday, so the week starts on Monday.
const MONTHS = Array.from({ length: 12 }, (_, month) =>
  new Intl.DateTimeFormat("en-GB", { month: "long" }).format(new Date(2024, month, 1)),
);
const SHORT_MONTHS = Array.from({ length: 12 }, (_, month) =>
  new Intl.DateTimeFormat("en-GB", { month: "short" }).format(new Date(2024, month, 1)),
);
const WEEKDAYS = Array.from({ length: 7 }, (_, offset) => ({
  short: new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(
    new Date(2024, 0, 1 + offset),
  ),
  long: new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(new Date(2024, 0, 1 + offset)),
}));
const MONTH_HEADING = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });
const DISPLAY_DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseIsoDate(iso: string | undefined): DateParts | null {
  if (!iso) return null;
  const match = ISO_DATE.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const probe = new Date(year, month, day);
  if (probe.getFullYear() !== year || probe.getMonth() !== month || probe.getDate() !== day) {
    return null;
  }
  return { year, month, day };
}

function toIsoDate(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, "0");
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromDate(date: Date): string {
  return toIsoDate(date.getFullYear(), date.getMonth(), date.getDate());
}

function todayIso(): string {
  return fromDate(new Date());
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function addDays(iso: string, delta: number): string {
  const p = parseIsoDate(iso);
  if (!p) return iso;
  return fromDate(new Date(p.year, p.month, p.day + delta));
}

/** Same day of the month `delta` months away, clamped to the last day of that month. */
function addMonths(iso: string, delta: number): string {
  const p = parseIsoDate(iso);
  if (!p) return iso;
  const first = new Date(p.year, p.month + delta, 1);
  const day = Math.min(p.day, daysInMonth(first.getFullYear(), first.getMonth()));
  return toIsoDate(first.getFullYear(), first.getMonth(), day);
}

function formatDisplayDate(iso: string | undefined): string {
  const parsed = parseIsoDate(iso);
  if (!parsed) return "";
  return DISPLAY_DATE.format(new Date(parsed.year, parsed.month, parsed.day));
}

function buildCalendarWeeks(year: number, month: number) {
  const firstOfMonth = new Date(year, month, 1);
  // Monday-first offset: Sun (0) -> 6, Mon (1) -> 0, ...
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, index) => {
    const cell = new Date(year, month, 1 - startOffset + index);
    return {
      iso: fromDate(cell),
      day: cell.getDate(),
      outside: cell.getMonth() !== month || cell.getFullYear() !== year,
    };
  });
  return Array.from({ length: 6 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}

const yearPageOf = (year: number) => Math.floor(year / 12) * 12;

/**
 * Themed UK calendar date picker built on Radix Popover with semantic design tokens,
 * tabular-nums dates, and month/year selection that navigates cleanly back to the day grid.
 *
 * The day view follows the WAI-ARIA date grid pattern: one tab stop (roving tabindex), arrow
 * keys move a day or a week, Home/End go to the start/end of the week, PageUp/PageDown change the
 * month (with Shift, the year). Focus starts on the selected day (or today) and is kept when
 * switching between the day, month and year views. The visible month is announced politely.
 */
export const DatePicker: FC<DatePickerProps> = ({
  id,
  name,
  value = "",
  onValueChange,
  min,
  max,
  placeholder = "Select date",
  disabled = false,
  invalid,
  required,
  clearable = true,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-required": ariaRequired,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<CalendarView>("days");

  const generatedId = useId().replace(/:/g, "");
  const triggerId = id ?? `datepicker-${generatedId}`;
  const valueId = `${triggerId}-value`;
  const headingId = `${triggerId}-heading`;
  const requiredId = `${triggerId}-required`;

  const today = todayIso();

  const clampIso = (iso: string) => {
    if (min && iso < min) return min;
    if (max && iso > max) return max;
    return iso;
  };

  const anchorIso = () => clampIso(parseIsoDate(value) ? value : today);
  const initial = parseIsoDate(anchorIso()) ?? { year: 2026, month: 0, day: 1 };

  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);
  const [yearPageStart, setYearPageStart] = useState(yearPageOf(initial.year));
  const [focusedIso, setFocusedIso] = useState(anchorIso);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // Set when focus should move to the current view's focus target after the next render.
  const focusPending = useRef(false);
  // Ids of any <label for> elements naming the trigger (an id is added to a label without one), so
  // aria-labelledby can name it "<label> <date>" without losing the label.
  const [nativeLabelIds, setNativeLabelIds] = useState<string | undefined>(undefined);

  useEffect(() => {
    const labels = Array.from(triggerRef.current?.labels ?? []);
    const ids = labels.map((label, index) => {
      if (!label.id) label.id = `${triggerId}-label${index === 0 ? "" : `-${index}`}`;
      return label.id;
    });
    setNativeLabelIds(ids.length > 0 ? ids.join(" ") : undefined);
  }, [triggerId]);

  const focusTarget = () => {
    const target = contentRef.current?.querySelector<HTMLElement>(
      "[data-autofocus='true']:not(:disabled)",
    );
    if (!target) return false;
    target.focus();
    return true;
  };

  useEffect(() => {
    if (focusPending.current && focusTarget()) focusPending.current = false;
  });

  const isInvalid = invalid ?? ariaInvalid ?? false;
  const isRequired = Boolean(required || ariaRequired);
  const describedBy =
    [ariaDescribedBy, isRequired ? requiredId : undefined].filter(Boolean).join(" ") || undefined;
  const displayText = formatDisplayDate(value);
  const styles = datePickerTriggerRecipe();

  // With a label, the name is "<label> <date>" so the chosen date is not lost. The label part is
  // aria-labelledby, else the <label for> elements, else the trigger itself (its aria-label).
  const labelSource = ariaLabelledBy ?? nativeLabelIds ?? (ariaLabel ? triggerId : undefined);
  const labelledBy = displayText && labelSource ? `${labelSource} ${valueId}` : ariaLabelledBy;

  const weeks = useMemo(() => buildCalendarWeeks(viewYear, viewMonth), [viewYear, viewMonth]);

  const minParts = parseIsoDate(min);
  const maxParts = parseIsoDate(max);

  const isOutOfRange = (iso: string) => {
    if (min && iso < min) return true;
    if (max && iso > max) return true;
    return false;
  };

  const isMonthOutOfRange = (year: number, month: number) =>
    Boolean(min && toIsoDate(year, month, daysInMonth(year, month)) < min) ||
    Boolean(max && toIsoDate(year, month, 1) > max);

  const isYearOutOfRange = (year: number) =>
    (minParts !== null && year < minParts.year) || (maxParts !== null && year > maxParts.year);

  /** Shows the month holding `iso` and makes `iso` the grid's tab stop. */
  const showDate = (iso: string) => {
    const p = parseIsoDate(iso);
    if (!p) return;
    setViewYear(p.year);
    setViewMonth(p.month);
    setFocusedIso(iso);
  };

  /** Shows a month (from the month or year view) keeping the focused day of the month. */
  const showMonth = (year: number, month: number) => {
    const day = Math.min(parseIsoDate(focusedIso)?.day ?? 1, daysInMonth(year, month));
    // The tab stop falls back to the first enabled day when this one is out of range.
    setViewYear(year);
    setViewMonth(month);
    setFocusedIso(toIsoDate(year, month, day));
  };

  const switchView = (next: CalendarView) => {
    if (next === "years") setYearPageStart(yearPageOf(viewYear));
    focusPending.current = true;
    setView(next);
  };

  const handleOpenChange = (next: boolean) => {
    if (disabled) return;
    if (next) {
      const anchor = anchorIso();
      const p = parseIsoDate(anchor);
      setView("days");
      if (p) {
        setViewYear(p.year);
        setViewMonth(p.month);
        setYearPageStart(yearPageOf(p.year));
      }
      setFocusedIso(anchor);
    }
    setOpen(next);
  };

  const selectDate = (iso: string) => {
    if (isOutOfRange(iso)) return;
    onValueChange?.(iso);
    setOpen(false);
  };

  const stepMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    showMonth(next.getFullYear(), next.getMonth());
  };

  const prevMonthDisabled = Boolean(min && addDays(toIsoDate(viewYear, viewMonth, 1), -1) < min);
  const nextMonthDisabled = Boolean(
    max && toIsoDate(viewYear, viewMonth, daysInMonth(viewYear, viewMonth)) >= max,
  );

  const onGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const p = parseIsoDate(focusedIso);
    if (!p) return;
    const weekday = (new Date(p.year, p.month, p.day).getDay() + 6) % 7;
    let next: string | null = null;
    switch (event.key) {
      case "ArrowLeft":
        next = addDays(focusedIso, -1);
        break;
      case "ArrowRight":
        next = addDays(focusedIso, 1);
        break;
      case "ArrowUp":
        next = addDays(focusedIso, -7);
        break;
      case "ArrowDown":
        next = addDays(focusedIso, 7);
        break;
      case "Home":
        next = addDays(focusedIso, -weekday);
        break;
      case "End":
        next = addDays(focusedIso, 6 - weekday);
        break;
      case "PageUp":
        next = addMonths(focusedIso, event.shiftKey ? -12 : -1);
        break;
      case "PageDown":
        next = addMonths(focusedIso, event.shiftKey ? 12 : 1);
        break;
      default:
        return;
    }
    event.preventDefault();
    // Out-of-range days are disabled and cannot take focus, so movement stops at min and max.
    focusPending.current = true;
    showDate(clampIso(next));
  };

  const heading =
    view === "days"
      ? MONTH_HEADING.format(new Date(viewYear, viewMonth, 1))
      : view === "months"
        ? String(viewYear)
        : `${yearPageStart} to ${yearPageStart + 11}`;

  // The grid's single tab stop: the focused day, or the first enabled day of the visible month.
  const monthCells = weeks.flat().filter((cell) => !cell.outside);
  const tabStopIso =
    monthCells.find((cell) => cell.iso === focusedIso && !isOutOfRange(cell.iso))?.iso ??
    monthCells.find((cell) => !isOutOfRange(cell.iso))?.iso;

  const yearCells = Array.from({ length: 12 }, (_, index) => yearPageStart + index);
  const yearFocus =
    yearCells.find((year) => year === viewYear && !isYearOutOfRange(year)) ??
    yearCells.find((year) => !isYearOutOfRange(year));
  const monthFocus = isMonthOutOfRange(viewYear, viewMonth)
    ? MONTHS.findIndex((_, month) => !isMonthOutOfRange(viewYear, month))
    : viewMonth;

  return (
    <RadixPopover.Root open={open} onOpenChange={handleOpenChange}>
      {name ? <input name={name} type="hidden" value={value} /> : null}
      {isRequired ? (
        <span className={datePickerLiveRegionRecipe()} hidden id={requiredId}>
          Required
        </span>
      ) : null}
      <RadixPopover.Trigger asChild>
        <button
          ref={triggerRef}
          aria-describedby={describedBy}
          aria-invalid={isInvalid || undefined}
          aria-label={ariaLabel}
          aria-labelledby={labelledBy}
          className={cx(styles.root, className)}
          data-disabled={disabled ? "true" : undefined}
          data-invalid={isInvalid ? "true" : undefined}
          disabled={disabled}
          id={triggerId}
          type="button"
        >
          <span
            className={styles.text}
            data-placeholder={displayText ? undefined : "true"}
            id={valueId}
          >
            {displayText || placeholder}
          </span>
          <span aria-hidden="true" className={styles.icon}>
            <Icon icon={Calendar} size="sm" />
          </span>
        </button>
      </RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          ref={contentRef}
          align="start"
          aria-label="Calendar"
          className={datePickerContentRecipe()}
          collisionPadding={16}
          side="bottom"
          sideOffset={6}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            if (!focusTarget()) focusPending.current = true;
          }}
        >
          <div aria-live="polite" className={datePickerLiveRegionRecipe()} id={headingId}>
            {heading}
          </div>
          {view === "days" ? (
            <>
              <div className={datePickerHeaderRecipe()}>
                <button
                  aria-label="Previous month"
                  className={datePickerNavButtonRecipe()}
                  disabled={prevMonthDisabled}
                  onClick={() => stepMonth(-1)}
                  type="button"
                >
                  <Icon icon={ChevronLeft} size="sm" />
                </button>
                <div className={datePickerTitleGroupRecipe()}>
                  <button
                    aria-label={`Choose month, ${MONTHS[viewMonth]}`}
                    className={datePickerNavButtonRecipe()}
                    onClick={() => switchView("months")}
                    type="button"
                  >
                    {MONTHS[viewMonth]}
                  </button>
                  <button
                    aria-label={`Choose year, ${viewYear}`}
                    className={datePickerNavButtonRecipe()}
                    onClick={() => switchView("years")}
                    type="button"
                  >
                    {viewYear}
                  </button>
                </div>
                <button
                  aria-label="Next month"
                  className={datePickerNavButtonRecipe()}
                  disabled={nextMonthDisabled}
                  onClick={() => stepMonth(1)}
                  type="button"
                >
                  <Icon icon={ChevronRight} size="sm" />
                </button>
              </div>
              {/* biome-ignore lint/a11y/useSemanticElements: WAI-ARIA date grid of buttons, not a data table */}
              <div
                aria-labelledby={headingId}
                className={datePickerDaysGridRecipe()}
                data-testid="datepicker-days"
                onKeyDown={onGridKeyDown}
                role="grid"
              >
                {/* biome-ignore lint/a11y/useSemanticElements: row of the date grid */}
                {/* biome-ignore lint/a11y/useFocusableInteractive: rows are not focus stops in a date grid */}
                <div className={datePickerWeekdaysRecipe()} role="row">
                  {WEEKDAYS.map((weekday) => (
                    // biome-ignore lint/a11y/useSemanticElements: column header of the date grid
                    // biome-ignore lint/a11y/useFocusableInteractive: headers are not focus stops in a date grid
                    <div
                      aria-label={weekday.long}
                      className={datePickerWeekdayRecipe()}
                      key={weekday.long}
                      role="columnheader"
                    >
                      <span aria-hidden="true">{weekday.short}</span>
                    </div>
                  ))}
                </div>
                {weeks.map((week) => (
                  // biome-ignore lint/a11y/useSemanticElements: row of the date grid
                  // biome-ignore lint/a11y/useFocusableInteractive: rows are not focus stops in a date grid
                  <div className={datePickerWeekRowRecipe()} key={week[0]?.iso} role="row">
                    {week.map((cell) => {
                      const cellDisabled = isOutOfRange(cell.iso);
                      const isSelected = cell.iso === value;
                      const isToday = cell.iso === today;
                      const isFocusStop = !cell.outside && cell.iso === tabStopIso;
                      return (
                        // biome-ignore lint/a11y/useSemanticElements: cell of the date grid
                        // biome-ignore lint/a11y/useFocusableInteractive: the button inside takes focus
                        <div aria-selected={isSelected} key={cell.iso} role="gridcell">
                          <button
                            aria-current={isToday ? "date" : undefined}
                            aria-label={formatDisplayDate(cell.iso)}
                            aria-pressed={isSelected}
                            className={datePickerDayRecipe({
                              outside: cell.outside,
                              today: isToday,
                              selected: isSelected,
                            })}
                            data-autofocus={isFocusStop ? "true" : undefined}
                            data-iso={cell.iso}
                            disabled={cellDisabled}
                            onClick={() => selectDate(cell.iso)}
                            onFocus={() => {
                              if (!cell.outside) setFocusedIso(cell.iso);
                            }}
                            tabIndex={isFocusStop ? 0 : -1}
                            type="button"
                          >
                            {cell.day}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {view === "months" ? (
            <>
              <div className={datePickerHeaderRecipe()}>
                <button
                  aria-label="Back to calendar"
                  className={datePickerNavButtonRecipe()}
                  onClick={() => switchView("days")}
                  type="button"
                >
                  <Icon icon={ArrowLeft} size="sm" />
                  <span>Calendar</span>
                </button>
                <button
                  aria-label={`Choose year, ${viewYear}`}
                  className={datePickerNavButtonRecipe()}
                  onClick={() => switchView("years")}
                  type="button"
                >
                  {viewYear}
                </button>
              </div>
              <div className={datePickerPeriodGridRecipe()}>
                {SHORT_MONTHS.map((label, monthIndex) => (
                  <button
                    aria-pressed={monthIndex === viewMonth}
                    className={datePickerPeriodCellRecipe({ selected: monthIndex === viewMonth })}
                    data-autofocus={monthIndex === monthFocus ? "true" : undefined}
                    disabled={isMonthOutOfRange(viewYear, monthIndex)}
                    key={label}
                    onClick={() => {
                      showMonth(viewYear, monthIndex);
                      switchView("days");
                    }}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {view === "years" ? (
            <>
              <div className={datePickerHeaderRecipe()}>
                <button
                  aria-label="Back to calendar"
                  className={datePickerNavButtonRecipe()}
                  onClick={() => switchView("days")}
                  type="button"
                >
                  <Icon icon={ArrowLeft} size="sm" />
                  <span>Calendar</span>
                </button>
                <div className={datePickerTitleGroupRecipe()}>
                  <button
                    aria-label="Previous years"
                    className={datePickerNavButtonRecipe()}
                    disabled={minParts !== null && yearPageStart <= minParts.year}
                    onClick={() => setYearPageStart((y) => y - 12)}
                    type="button"
                  >
                    <Icon icon={ChevronLeft} size="sm" />
                  </button>
                  <button
                    aria-label="Next years"
                    className={datePickerNavButtonRecipe()}
                    disabled={maxParts !== null && yearPageStart + 11 >= maxParts.year}
                    onClick={() => setYearPageStart((y) => y + 12)}
                    type="button"
                  >
                    <Icon icon={ChevronRight} size="sm" />
                  </button>
                </div>
              </div>
              <div className={datePickerPeriodGridRecipe()}>
                {yearCells.map((year) => (
                  <button
                    aria-pressed={year === viewYear}
                    className={datePickerPeriodCellRecipe({ selected: year === viewYear })}
                    data-autofocus={year === yearFocus ? "true" : undefined}
                    disabled={isYearOutOfRange(year)}
                    key={year}
                    onClick={() => {
                      showMonth(year, viewMonth);
                      switchView("days");
                    }}
                    type="button"
                  >
                    {year}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          <div className={datePickerFooterRecipe()}>
            <button
              className={datePickerNavButtonRecipe()}
              disabled={isOutOfRange(today)}
              onClick={() => selectDate(today)}
              type="button"
            >
              Today
            </button>
            {clearable && value ? (
              <button
                className={datePickerNavButtonRecipe()}
                onClick={() => {
                  onValueChange?.("");
                  setOpen(false);
                }}
                type="button"
              >
                Clear
              </button>
            ) : (
              <span />
            )}
          </div>
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
};

export default DatePicker;
