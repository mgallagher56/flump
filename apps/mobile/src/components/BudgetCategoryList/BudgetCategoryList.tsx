import { useMemo, useState } from "react";
import { View } from "react-native";
import { CATEGORIES, categoryLabel, MORTGAGE_PAGE, openPage } from "../../copy/budget";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "../Button";
import { Card } from "../Card";
import { Icon } from "../Icon";
import { formatWholePounds, Money } from "../Money/Money";
import { Pressable } from "../Pressable";
import { Text } from "../Text";
import { createStyles } from "./BudgetCategoryList.styles";

/** How an opened category shows one entry, as the engine's `budgetCategoryEntries` says. */
type CategoryEntryFigure =
  | { kind: "notSet" }
  | { kind: "nameOnly" }
  | { kind: "amount"; monthly: number };

/** One entry under an opened category: its name, figure and source line. Read only, as web. */
interface CategoryEntry {
  id: string;
  name: string;
  figure: CategoryEntryFigure;
  /** Where a linked line's figure comes from, or why it has none (web's `linkedSourceText`). */
  source?: string;
}

/** One row of "Where your money goes", from the engine's ranked categories. */
interface CategoryRow {
  category: string;
  /** The monthly total. Not shown when `notSet`, nor with no entries. */
  total: number;
  count: number;
  notSet: boolean;
  entries: readonly CategoryEntry[];
}

export interface BudgetCategoryListProps {
  /** The engine's ranked rows (`selectBudgetPageFromRows().categories`), largest first. */
  rows: readonly CategoryRow[];
  /** A quiet line under a row's name: the housing row names the tenure (web's `metaFor`). */
  metaFor?: (category: string) => string | undefined;
  /**
   * Makes a row a link in place of opening its entries: a mortgage holder's housing row opens
   * web's mortgage page (web's `hrefFor`).
   */
  linkFor?: (category: string) => (() => void) | undefined;
  /** Opens the editor: "Edit budget" on the section's heading row, the page's one edit action. */
  onEditBudget?: () => void;
  /** Defaults to "budget-categories". */
  testID?: string;
}

/** "£295", or "Not set" for a row with a linked line that is not set: never £0. */
function rowFigure(row: CategoryRow): string | null {
  if (row.count === 0) return null;
  return row.notSet ? formatWholePounds(null) : formatWholePounds(row.total);
}

/**
 * Where the money goes, as web's `BudgetCategoryList`: the engine's ranked categories, one figure
 * a row, and the row opens its entries, one category at a time. Each row is one control (its
 * name, tenure and figure read as its name); each entry is one item. Neutral ink throughout.
 */
export function BudgetCategoryList({
  rows,
  metaFor,
  linkFor,
  onEditBudget,
  testID = "budget-categories",
}: BudgetCategoryListProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <View style={styles.base} testID={testID}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" textStyle="heading.sm">
          {CATEGORIES.title}
        </Text>
        <Text textStyle="body.sm" color="secondary">
          {CATEGORIES.description}
        </Text>
        {onEditBudget ? (
          <Button
            label={CATEGORIES.editBudget}
            variant="outline"
            size="sm"
            testID={`${testID}-edit`}
            onPress={onEditBudget}
          />
        ) : null}
      </View>
      <Card padding="none">
        {rows.map((row, i) => {
          const label = categoryLabel(row.category);
          const meta = metaFor?.(row.category);
          const figure = rowFigure(row);
          const link = linkFor?.(row.category);
          const isOpen = !link && open === row.category;
          const words = [label, meta, figure].filter(Boolean).join(", ");
          const identity = (
            <>
              <View style={styles.name}>
                <Text>{label}</Text>
                {meta ? (
                  <Text textStyle="body.sm" color="secondary">
                    {meta}
                  </Text>
                ) : null}
              </View>
              {row.count > 0 ? <Money value={row.notSet ? null : row.total} size="sm" /> : null}
              <View style={link ? null : isOpen ? styles.up : styles.down}>
                <Icon name="chevron-right" size="sm" />
              </View>
            </>
          );
          return (
            <View key={row.category} style={i > 0 ? styles.divided : null}>
              {link ? (
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={`${words}${row.count > 0 ? ` ${CATEGORIES.aMonth}` : ""}, ${openPage(MORTGAGE_PAGE)}`}
                  testID={`${testID}-${row.category}`}
                  style={styles.row}
                  onPress={link}
                >
                  {identity}
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={words}
                  accessibilityState={{ expanded: isOpen }}
                  testID={`${testID}-${row.category}`}
                  style={[styles.row, isOpen ? styles.openRow : null]}
                  onPress={() => setOpen((was) => (was === row.category ? null : row.category))}
                >
                  {identity}
                </Pressable>
              )}
              {isOpen ? (
                <View style={styles.entries} testID={`${testID}-${row.category}-entries`}>
                  {row.entries.map((entry) => (
                    <EntryLine key={entry.id} entry={entry} styles={styles} testID={testID} />
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
      </Card>
    </View>
  );
}

function EntryLine({
  entry,
  styles,
  testID,
}: {
  entry: CategoryEntry;
  styles: ReturnType<typeof createStyles>;
  testID: string;
}) {
  const figure =
    entry.figure.kind === "amount"
      ? formatWholePounds(entry.figure.monthly)
      : entry.figure.kind === "notSet"
        ? formatWholePounds(null)
        : null;
  return (
    <View
      accessible
      accessibilityLabel={[entry.name, figure, entry.source].filter(Boolean).join(", ")}
      style={styles.entry}
      testID={`${testID}-entry-${entry.id}`}
    >
      <View style={styles.name}>
        <Text>{entry.name}</Text>
        {entry.source ? (
          <Text textStyle="body.sm" color="secondary">
            {entry.source}
          </Text>
        ) : null}
      </View>
      {entry.figure.kind === "nameOnly" ? null : (
        <Money
          value={entry.figure.kind === "amount" ? entry.figure.monthly : null}
          size="sm"
          color={entry.figure.kind === "notSet" ? "secondary" : "primary"}
        />
      )}
    </View>
  );
}
