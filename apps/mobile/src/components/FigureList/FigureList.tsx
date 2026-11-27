import { useMemo } from "react";
import { View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { Card } from "../Card";
import { Text } from "../Text";
import { createStyles } from "./FigureList.styles";

/** One line of the list: what it is, its figure already formatted, and a note. */
interface FigureListRow {
  id: string;
  /** "October 2026", or an account's name. */
  label: string;
  /** "£186,550", "+£150". Tabular. */
  figure: string;
  /** What a screen reader hears for the figure when it differs ("up £150"). */
  spoken?: string;
  /** How the figure was given ("Calculated", "Carried forward"); nothing for a typed one. */
  note?: string | null;
}

export interface FigureListProps {
  rows: readonly FigureListRow[];
  /** Read before the rows ("Net worth by month"), as web's table caption. */
  caption?: string;
  testID?: string;
}

/**
 * Months or accounts with one figure each, as web's "Show data" tables on a phone: what a screen
 * reader reads in place of a chart. Each line is one element ("October 2026, £186,550,
 * Calculated"). Figures in the ordinary text colour, whatever their sign.
 */
export function FigureList({ rows, caption, testID }: FigureListProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.base} testID={testID}>
      {caption ? (
        <Text textStyle="label.md" color="secondary">
          {caption}
        </Text>
      ) : null}
      <Card padding="none">
        {rows.map((row, i) => (
          <View
            key={row.id}
            accessible
            accessibilityLabel={[row.label, row.spoken ?? row.figure, row.note]
              .filter(Boolean)
              .join(", ")}
            style={[styles.row, i > 0 ? styles.divided : null]}
            testID={testID ? `${testID}-row-${row.id}` : undefined}
          >
            <View style={styles.label}>
              <Text>{row.label}</Text>
              {row.note ? (
                <Text textStyle="body.sm" color="secondary">
                  {row.note}
                </Text>
              ) : null}
            </View>
            <Text tabular>{row.figure}</Text>
          </View>
        ))}
      </Card>
    </View>
  );
}
