import { CHECK_IN_DAYS } from "@flump/finance-engine";
import {
  Card,
  controlProps,
  FormField,
  PageSection,
  Select,
  type SelectOption,
  useOptionalToast,
} from "@repo/ui";
import { CalendarCheck } from "lucide-react";
import { type ChangeEvent, type FC, useEffect, useState } from "react";
import { sectionCard, statusText } from "~/features/settings/settings.styles";
import { dayField } from "./CheckInDaySetting.styles";

/** The anchor a link to this setting points at (/app/profile?tab=profile#settings-check-in). */
export const CHECK_IN_SETTING_ID = "settings-check-in";

export const CHECK_IN_SETTING_TITLE = "Monthly check-in";
export const CHECK_IN_DAY_LABEL = "Check-in day";
export const CHECK_IN_DAY_HINT =
  "In months with fewer days, the check-in falls on the last day of the month.";
export const CHECK_IN_DAY_SAVED = "Saved";
export const CHECK_IN_DAY_ERROR = "We could not save that change. Nothing has changed. Try again.";

const ORDINAL_SUFFIX: Record<string, string> = { one: "st", two: "nd", few: "rd", other: "th" };
const ordinalRules = new Intl.PluralRules("en-GB", { type: "ordinal" });

/** "1st", "2nd", "3rd", "11th", "22nd", "31st" (en-GB). */
export const ordinalDay = (day: number): string =>
  `${day}${ORDINAL_SUFFIX[ordinalRules.select(day)] ?? "th"}`;

const DAY_OPTIONS: readonly SelectOption[] = CHECK_IN_DAYS.map((day) => ({
  value: String(day),
  label: ordinalDay(day),
}));

export interface CheckInDayUpdate {
  checkInDay: number;
}

export interface CheckInDaySettingProps {
  /** The saved check-in day (1 to 31), or null when none is chosen (shown as the 1st). */
  checkInDay: number | null;
  /** Saves the change through the profile update. Rejects when the save fails. */
  onSave: (update: CheckInDayUpdate) => Promise<unknown>;
}

/**
 * Which day of the month the monthly check-in falls on (UX Batch E). Saves as soon as it changes,
 * like the net worth choices, and goes back if the save fails. No reminders: the day only sets
 * when the check-in is shown and the "Next check-in" date.
 */
export const CheckInDaySetting: FC<CheckInDaySettingProps> = ({ checkInDay, onSave }) => {
  const toast = useOptionalToast()?.toast;
  const [value, setValue] = useState(checkInDay ?? 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(checkInDay ?? 1);
  }, [checkInDay]);

  const change = async (e: ChangeEvent<HTMLSelectElement>) => {
    if (saving) return;
    const next = Number(e.target.value);
    const previous = value;
    setValue(next);
    setSaving(true);
    setError(null);
    try {
      await onSave({ checkInDay: next });
      toast?.({ title: CHECK_IN_DAY_SAVED, tone: "positive" });
    } catch {
      setValue(previous);
      setError(CHECK_IN_DAY_ERROR);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageSection
      headingId="settings-check-in-heading"
      icon={CalendarCheck}
      id={CHECK_IN_SETTING_ID}
      title={CHECK_IN_SETTING_TITLE}
      tone="neutral"
    >
      <Card className={sectionCard()}>
        <FormField hint={CHECK_IN_DAY_HINT} id="check-in-day-select" label={CHECK_IN_DAY_LABEL}>
          {(field) => (
            <Select
              {...controlProps(field)}
              aria-disabled={saving || undefined}
              className={dayField()}
              data-testid="check-in-day-select"
              onChange={(e) => void change(e)}
              options={DAY_OPTIONS}
              value={String(value)}
            />
          )}
        </FormField>
        {error ? (
          <p
            className={statusText({ tone: "danger" })}
            data-testid="check-in-day-error"
            id="check-in-day-error"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </Card>
    </PageSection>
  );
};

export default CheckInDaySetting;
