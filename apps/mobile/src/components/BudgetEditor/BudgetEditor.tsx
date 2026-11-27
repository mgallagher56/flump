import { useMemo } from "react";
import { View } from "react-native";
import { addToLabel, CATEGORIES, categoryLabel, EDITOR, perFrequency } from "../../copy/budget";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "../Button";
import { Card } from "../Card";
import { Icon } from "../Icon";
import { formatPounds, Money } from "../Money/Money";
import { Pressable } from "../Pressable";
import { Text } from "../Text";
import { createStyles } from "./BudgetEditor.styles";

/** One entry in the editor, as saved: its amount at the frequency it was typed. */
interface EditorRow {
  id: string;
  name: string;
  /** Pounds, or null for a linked line that is not set: never £0. */
  amount: number | null;
  frequency: string;
  /** The person's own sole, unlinked row: it opens the edit form. Otherwise read only here. */
  editable: boolean;
  /** Where a linked line's figure comes from (web's source line). */
  note?: string;
}

export interface EditorSectionView {
  category: string;
  rows: readonly EditorRow[];
}

export interface BudgetEditorProps {
  /** Money in first, then the categories in the read view's order (`editorSections`). */
  sections: readonly EditorSectionView[];
  onEdit(id: string): void;
  onAdd(category: string): void;
  /** Opens web's Budget page, where linked and joint entries are changed for now. */
  onOpenWebsite(): void;
  onFinish(): void;
  /** Defaults to "budget-editor". */
  testID?: string;
}

/** Web's section label: income shows as "Money in". */
const sectionLabel = (category: string) =>
  category === "income" ? EDITOR.moneyIn : categoryLabel(category);

const hasPence = (value: number) => Math.round(value * 100) % 100 !== 0;

/**
 * The phone's budget editor, as web's `BudgetEditor` in the order it lists: Money in, then each
 * category with its entries and its "Add to" button, and "Finish editing" at the foot. Each own
 * entry is one control that opens the edit form; a linked or joint entry is one link to the
 * website, where it is changed until S11 and S12. Categories are added and removed there too.
 */
export function BudgetEditor({
  sections,
  onEdit,
  onAdd,
  onOpenWebsite,
  onFinish,
  testID = "budget-editor",
}: BudgetEditorProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.base} testID={testID}>
      <Text accessibilityRole="header" textStyle="heading.sm">
        {EDITOR.heading}
      </Text>
      {sections.map((section) => {
        const label = sectionLabel(section.category);
        return (
          <View
            key={section.category}
            style={styles.section}
            testID={`${testID}-${section.category}`}
          >
            <Text accessibilityRole="header" textStyle="label.md">
              {label}
            </Text>
            {section.rows.length > 0 ? (
              <Card padding="none">
                {section.rows.map((row, i) => {
                  const fractionDigits: 0 | 2 = row.amount !== null && hasPence(row.amount) ? 2 : 0;
                  const figure =
                    row.amount === null
                      ? formatPounds(null)
                      : `${formatPounds(row.amount, fractionDigits)} ${perFrequency(row.frequency)}`;
                  const words = [row.name, figure, row.note].filter(Boolean).join(", ");
                  return (
                    <Pressable
                      key={row.id}
                      accessibilityRole={row.editable ? "button" : "link"}
                      accessibilityLabel={
                        row.editable ? words : `${words}, ${CATEGORIES.changeOnWebsite}`
                      }
                      testID={`${testID}-row-${row.id}`}
                      style={[styles.row, i > 0 ? styles.divided : null]}
                      onPress={row.editable ? () => onEdit(row.id) : onOpenWebsite}
                    >
                      <View style={styles.name}>
                        <Text>{row.name}</Text>
                        {row.note ? (
                          <Text textStyle="body.sm" color="secondary">
                            {row.note}
                          </Text>
                        ) : null}
                        {row.editable ? null : (
                          <Text textStyle="body.sm" color="secondary">
                            {CATEGORIES.changeOnWebsite}
                          </Text>
                        )}
                      </View>
                      <View style={styles.figure}>
                        <Money
                          value={row.amount}
                          fractionDigits={fractionDigits}
                          size="sm"
                          color={row.amount === null ? "secondary" : "primary"}
                        />
                        {row.amount === null ? null : (
                          <Text textStyle="body.sm" color="secondary">
                            {perFrequency(row.frequency)}
                          </Text>
                        )}
                      </View>
                      <Icon name="chevron-right" size="sm" />
                    </Pressable>
                  );
                })}
              </Card>
            ) : (
              <Text color="secondary">{EDITOR.noEntries}</Text>
            )}
            <Button
              label={addToLabel(section.category)}
              variant="ghost"
              size="sm"
              testID={`${testID}-add-${section.category}`}
              onPress={() => onAdd(section.category)}
            />
          </View>
        );
      })}
      <Button label={EDITOR.finish} testID={`${testID}-finish`} onPress={onFinish} />
    </View>
  );
}
