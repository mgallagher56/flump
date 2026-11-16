import * as RadixPopover from "@radix-ui/react-popover";
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { type FC, useEffect, useMemo, useState } from "react";
import { cx } from "../../../styled-system/css";
import { Icon } from "../Icon/Icon";
import {
  datePickerContentRecipe,
  datePickerDayRecipe,
  datePickerDaysGridRecipe,
  datePickerFooterRecipe,
  datePickerHeaderRecipe,
  datePickerNavButtonRecipe,
  datePickerPeriodCellRecipe,
  datePickerPeriodGridRecipe,
  datePickerTitleGroupRecipe,
  datePickerTriggerRecipe,
  datePickerWeekdayRecipe,
  datePickerWeekdaysRecipe,
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
  clearable?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-required"?: boolean;
  className?: string;
}

type CalendarView = "days" | "months" | "years";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseIsoDate(
  iso: string | undefined,
): { year: number; month: number; day: number } | null {
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

function todayIso(): string {
  const now = new Date();
  return toIsoDate(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatDisplayDate(iso: string | undefined): string {
  const parsed = parseIsoDate(iso);
  if (!parsed) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(parsed.year, parsed.month, parsed.day));
}

function buildCalendarDays(year: number, month: number) {
  const firstOfMonth = new Date(year, month, 1);
  // Monday-first offset: Sun (0) -> 6, Mon (1) -> 0, ...
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const cell = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + index,
    );
    const cellYear = cell.getFullYear();
    const cellMonth = cell.getMonth();
    const cellDay = cell.getDate();
    return {
      iso: toIsoDate(cellYear, cellMonth, cellDay),
      day: cellDay,
      outside: cellMonth !== month || cellYear !== year,
    };
  });
}

/**
 * Themed UK calendar date picker built on Radix Popover with semantic design tokens,
 * tabular-nums dates, and month/year selection that navigates cleanly back to the day grid.
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
  clearable = true,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-required": _ariaRequired,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<CalendarView>("days");

  const parsedValue = useMemo(() => parseIsoDate(value), [value]);
  const today = todayIso();
  const initialFocus = parsedValue ?? parseIsoDate(today) ?? { year: 2026, month: 0, day: 1 };

  const [viewYear, setViewYear] = useState(initialFocus.year);
  const [viewMonth, setViewMonth] = useState(initialFocus.month);
  const [yearPageStart, setYearPageStart] = useState(Math.floor(initialFocus.year / 12) * 12);

  useEffect(() => {
    if (!open) return;
    setView("days");
    const anchor = parseIsoDate(value) ?? parseIsoDate(today);
    if (anchor) {
      setViewYear(anchor.year);
      setViewMonth(anchor.month);
      setYearPageStart(Math.floor(anchor.year / 12) * 12);
    }
  }, [open, value, today]);

  const isInvalid = invalid ?? ariaInvalid ?? false;
  const displayText = formatDisplayDate(value);
  const styles = datePickerTriggerRecipe();

  const days = useMemo(() => buildCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);

  const isOutOfRange = (iso: string) => {
    if (min && iso < min) return true;
    if (max && iso > max) return true;
    return false;
  };

  const selectDate = (iso: string) => {
    if (isOutOfRange(iso)) return;
    onValueChange?.(iso);
    setOpen(false);
  };

  const stepMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  return (
    <RadixPopover.Root open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
      {name ? <input name={name} type="hidden" value={value} /> : null}
      <RadixPopover.Trigger asChild>
        <button
          aria-describedby={ariaDescribedBy}
          aria-invalid={isInvalid || undefined}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          className={cx(styles.root, className)}
          data-disabled={disabled ? "true" : undefined}
          data-invalid={isInvalid ? "true" : undefined}
          disabled={disabled}
          id={id}
          type="button"
        >
          <span className={styles.text} data-placeholder={displayText ? undefined : "true"}>
            {displayText || placeholder}
          </span>
          <span aria-hidden="true" className={styles.icon}>
            <Icon icon={Calendar} size="sm" />
          </span>
        </button>
      </RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          align="start"
          aria-label="Calendar"
          className={datePickerContentRecipe()}
          collisionPadding={16}
          side="bottom"
          sideOffset={6}
        >
          {view === "days" ? (
            <>
              <div className={datePickerHeaderRecipe()}>
                <button
                  aria-label="Previous month"
                  className={datePickerNavButtonRecipe()}
                  onClick={() => stepMonth(-1)}
                  type="button"
                >
                  <Icon icon={ChevronLeft} size="sm" />
                </button>
                <div className={datePickerTitleGroupRecipe()}>
                  <button
                    aria-label={`Choose month, ${MONTHS[viewMonth]}`}
                    className={datePickerNavButtonRecipe()}
                    onClick={() => setView("months")}
                    type="button"
                  >
                    {MONTHS[viewMonth]}
                  </button>
                  <button
                    aria-label={`Choose year, ${viewYear}`}
                    className={datePickerNavButtonRecipe()}
                    onClick={() => {
                      setYearPageStart(Math.floor(viewYear / 12) * 12);
                      setView("years");
                    }}
                    type="button"
                  >
                    {viewYear}
                  </button>
                </div>
                <button
                  aria-label="Next month"
                  className={datePickerNavButtonRecipe()}
                  onClick={() => stepMonth(1)}
                  type="button"
                >
                  <Icon icon={ChevronRight} size="sm" />
                </button>
              </div>
              <div aria-hidden="true" className={datePickerWeekdaysRecipe()}>
                {WEEKDAYS.map((day) => (
                  <div className={datePickerWeekdayRecipe()} key={day}>
                    {day}
                  </div>
                ))}
              </div>
              <div className={datePickerDaysGridRecipe()} data-testid="datepicker-days">
                {days.map((cell) => {
                  const cellDisabled = isOutOfRange(cell.iso);
                  const isSelected = cell.iso === value;
                  const isToday = cell.iso === today;
                  return (
                    <button
                      aria-label={formatDisplayDate(cell.iso)}
                      aria-pressed={isSelected}
                      className={datePickerDayRecipe({
                        outside: cell.outside,
                        today: isToday,
                        selected: isSelected,
                      })}
                      disabled={cellDisabled}
                      key={cell.iso}
                      onClick={() => selectDate(cell.iso)}
                      type="button"
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {view === "months" ? (
            <>
              <div className={datePickerHeaderRecipe()}>
                <button
                  aria-label="Back to calendar"
                  className={datePickerNavButtonRecipe()}
                  onClick={() => setView("days")}
                  type="button"
                >
                  <Icon icon={ArrowLeft} size="sm" />
                  <span>Calendar</span>
                </button>
                <button
                  aria-label={`Choose year, ${viewYear}`}
                  className={datePickerNavButtonRecipe()}
                  onClick={() => {
                    setYearPageStart(Math.floor(viewYear / 12) * 12);
                    setView("years");
                  }}
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
                    key={label}
                    onClick={() => {
                      setViewMonth(monthIndex);
                      setView("days");
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
                  onClick={() => setView("days")}
                  type="button"
                >
                  <Icon icon={ArrowLeft} size="sm" />
                  <span>Calendar</span>
                </button>
                <div className={datePickerTitleGroupRecipe()}>
                  <button
                    aria-label="Previous years"
                    className={datePickerNavButtonRecipe()}
                    onClick={() => setYearPageStart((y) => y - 12)}
                    type="button"
                  >
                    <Icon icon={ChevronLeft} size="sm" />
                  </button>
                  <button
                    aria-label="Next years"
                    className={datePickerNavButtonRecipe()}
                    onClick={() => setYearPageStart((y) => y + 12)}
                    type="button"
                  >
                    <Icon icon={ChevronRight} size="sm" />
                  </button>
                </div>
              </div>
              <div className={datePickerPeriodGridRecipe()}>
                {Array.from({ length: 12 }, (_, index) => {
                  const year = yearPageStart + index;
                  return (
                    <button
                      aria-pressed={year === viewYear}
                      className={datePickerPeriodCellRecipe({ selected: year === viewYear })}
                      key={year}
                      onClick={() => {
                        setViewYear(year);
                        setView("days");
                      }}
                      type="button"
                    >
                      {year}
                    </button>
                  );
                })}
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
