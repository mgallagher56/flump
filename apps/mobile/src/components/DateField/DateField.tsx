import { useEffect, useMemo, useRef, useState } from "react";
// Raw React Native inputs are allowed inside src/components (biome.json, apps/mobile override).
import { TextInput, View } from "react-native";
import { useScrollFieldIntoView } from "../../device/keyboardInset";
import { useTheme } from "../../theme/ThemeProvider";
import { useTextScale } from "../../theme/useTextScale";
import { Button } from "../Button";
import { useFieldHint } from "../FormField/FormField";
import { Text } from "../Text";
import { boxWidth, createStyles } from "./DateField.styles";

const DAY = "Day";
const MONTH = "Month";
const YEAR = "Year";
const CLEAR = "Clear";

const EARLIEST_YEAR = 1900;
const LATEST_YEAR = 2100;

interface DateFieldChange {
  /** "YYYY-MM-DD" when the three boxes make a real date, otherwise `null`. */
  readonly iso: string | null;
  /** True when all three boxes are empty. */
  readonly blank: boolean;
}

export interface DateFieldProps {
  /** The field's name, as the FormField label above it: each box is read as "<label>, day". */
  label: string;
  /** "YYYY-MM-DD", or "" for no date. A new value from outside replaces what is typed. */
  value: string;
  /** Called on every change. */
  onValueChange(next: DateFieldChange): void;
  /** Shows "Clear", which empties the boxes, for an optional date. */
  clearable?: boolean;
  /** Defaults to true. */
  editable?: boolean;
  /** The group's test id; the boxes are `<testID>-day`, `-month` and `-year`, "Clear" `<testID>-clear`. */
  testID?: string;
}

interface Parts {
  readonly day: string;
  readonly month: string;
  readonly year: string;
}

type PartKey = keyof Parts;

const EMPTY: Parts = { day: "", month: "", year: "" };

const daysIn = (year: number, month: number): number => {
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return leap ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
};

/**
 * "YYYY-MM-DD" when the day, month and year make a real calendar date between 1900 and 2100
 * (31 April and 29 February outside a leap year are not), otherwise `null`. Surrounding spaces are
 * ignored; a day or month may have one or two digits, a year must have four.
 */
export function isoFromParts(day: string, month: string, year: string): string | null {
  const [d, m, y] = [day.trim(), month.trim(), year.trim()];
  if (!/^\d{1,2}$/.test(d) || !/^\d{1,2}$/.test(m) || !/^\d{4}$/.test(y)) return null;
  const [dn, mn, yn] = [Number(d), Number(m), Number(y)];
  if (yn < EARLIEST_YEAR || yn > LATEST_YEAR) return null;
  if (mn < 1 || mn > 12) return null;
  if (dn < 1 || dn > daysIn(yn, mn)) return null;
  return `${y}-${String(mn).padStart(2, "0")}-${String(dn).padStart(2, "0")}`;
}

function partsFrom(value: string): Parts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return EMPTY;
  const [, year = "", month = "", day = ""] = match;
  return { day: String(Number(day)), month: String(Number(month)), year };
}

const BOXES: readonly { key: PartKey; name: string; chars: number }[] = [
  { key: "day", name: DAY, chars: 2 },
  { key: "month", name: MONTH, chars: 2 },
  { key: "year", name: YEAR, chars: 4 },
];

/**
 * A date as three boxes, day, month and year, on the number pad: the GOV.UK date input pattern,
 * used in place of a native date picker (CROSS-PLATFORM section 5 exception). The boxes are 2, 2
 * and 4 characters wide, grow with the text and wrap at large sizes. Each is named with the field's
 * label ("Fixed rate ends, day"); the group itself is read through the FormField above it. It keeps
 * what is typed while editing and reports the date only when it is a real one.
 */
export function DateField({
  label,
  value,
  onValueChange,
  clearable = false,
  editable = true,
  testID,
}: DateFieldProps) {
  const theme = useTheme();
  const spokenHint = useFieldHint();
  // In a form, the field scrolls above the keyboard when it gains focus.
  const showField = useScrollFieldIntoView();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const textScale = useTextScale();
  const [parts, setParts] = useState<Parts>(() => partsFrom(value));
  const [focused, setFocused] = useState<PartKey | null>(null);
  // The last date this field reported ("" for none), so its own changes coming back leave the boxes alone.
  const reported = useRef(value);

  useEffect(() => {
    if (value === reported.current) return;
    reported.current = value;
    setParts(partsFrom(value));
  }, [value]);

  const report = (next: Parts) => {
    setParts(next);
    const iso = isoFromParts(next.day, next.month, next.year);
    reported.current = iso ?? "";
    const blank = !next.day.trim() && !next.month.trim() && !next.year.trim();
    onValueChange({ iso, blank });
  };

  // A gallery preview draws the scale itself, so the phone's setting must not multiply it again.
  const preview = theme.textScale !== 1;

  return (
    <View style={styles.base}>
      <View accessibilityRole="none" style={styles.parts} testID={testID}>
        {BOXES.map(({ key, name, chars }) => (
          <View key={key} style={styles.part}>
            {/* The box carries the name, with the field's label, so the word on screen is not read twice. */}
            <Text
              textStyle="body.sm"
              color="secondary"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {name}
            </Text>
            <View
              style={[
                styles.box,
                { width: boxWidth(theme, chars, textScale) },
                focused === key ? styles.focused : null,
                editable ? null : styles.disabled,
              ]}
            >
              <TextInput
                value={parts[key]}
                onChangeText={(text) => report({ ...parts, [key]: text })}
                onFocus={() => {
                  setFocused(key);
                  showField();
                }}
                onBlur={() => setFocused(null)}
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={chars}
                accessibilityLabel={`${label}, ${name.toLowerCase()}`}
                accessibilityHint={spokenHint}
                accessibilityState={{ disabled: !editable }}
                editable={editable}
                {...(preview ? { allowFontScaling: false } : {})}
                style={styles.input}
                testID={testID ? `${testID}-${key}` : undefined}
              />
            </View>
          </View>
        ))}
      </View>
      {clearable ? (
        <Button
          label={CLEAR}
          accessibilityLabel={`${CLEAR}, ${label}`}
          variant="link"
          disabled={!editable}
          testID={testID ? `${testID}-clear` : undefined}
          onPress={() => report(EMPTY)}
        />
      ) : null}
    </View>
  );
}
