import type {
  HomeStrip,
  HomeStripFirstCell,
  HomeStripSecondCell,
} from "@flump/finance-engine/home-strip";
import { type ReactNode, useMemo } from "react";
import { useWindowDimensions, View } from "react-native";
import { STRIP, spokenPounds } from "../../copy/home";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "../Button";
import { Card } from "../Card";
import { InfoTip } from "../InfoTip";
import { Money } from "../Money";
import { formatWholePounds } from "../Money/Money";
import { Text } from "../Text";
import { createStyles, skeletonHeights, stacks } from "./KpiStrip.styles";

/** One figure for a screen other than Home (the Budget tab's money in and going out, S10). */
interface KpiItem {
  /** Names the card's test id: `<testID>-<key>`. */
  key: string;
  label: string;
  /** Pounds, or null when unknown: "Not set", never £0. */
  value: number | null;
  caption?: string | null;
}

export interface KpiStripProps {
  /** The engine's `selectHomeStrip` answer. Absent while loading. */
  strip?: HomeStrip | null;
  /**
   * Figures drawn as they are, in place of Home's strip (the Budget tab, S10): two cards with the
   * same layout rules. With `emptyPrompt` and no items, the one prompt stands in for them.
   */
  items?: readonly KpiItem[];
  /** With `items`: one sentence in place of the cards, when both figures are unknown (web's rule). */
  emptyPrompt?: string;
  /** Waiting for the figures: two cells of still blocks, the size of the cells that replace them. */
  loading?: boolean;
  /** Opens where the budget is added (the website until S10). Home's strip only. */
  onAddBudget?: () => void;
  /** Opens where spending is added to the budget (the website until S10). Home's strip only. */
  onAddSpending?: () => void;
  /**
   * The links' words when they do not open the page itself (no web app address in this build: the
   * website's home page). Defaults to the page's own words.
   */
  websiteLabel?: string;
  /** Defaults to "kpi-strip". */
  testID?: string;
}

type Styles = ReturnType<typeof createStyles>;

interface KpiCardProps {
  label: string;
  /** Pounds; null is unknown ("Not set"); absent for a refused figure, which shows its notice. */
  value?: number | null;
  /** The line under the figure (or the refusal's notice), when there is one. */
  caption?: string | null;
  /** Its own control under the group (the income-only link). */
  action?: ReactNode;
  /** Plain-English explanation shown via an `InfoTip` toggle under the group. */
  explain?: string;
  testID: string;
  /** The group's test id, naming what the card shows ("kpi-strip-pension"). */
  groupTestID: string;
  stacked: boolean;
  styles: Styles;
}

/**
 * One card: the label, the figure and its caption read out as one item ("Left over each month,
 * £125, From your budget"). A link stays its own control under the group.
 */
function KpiCard({
  label,
  value,
  caption,
  action,
  explain,
  testID,
  groupTestID,
  stacked,
  styles,
}: KpiCardProps) {
  const figure =
    value === undefined ? null : value === null ? formatWholePounds(null) : spokenPounds(value);
  const spoken = [label, figure, caption].filter(Boolean).join(", ");
  return (
    <Card testID={testID} style={stacked ? styles.cellStacked : styles.cellInRow}>
      <View accessible accessibilityLabel={spoken} style={styles.group} testID={groupTestID}>
        <Text textStyle="label.md" color="secondary">
          {label}
        </Text>
        {value === undefined ? null : (
          <Money value={value} size="kpi" testID={`${testID}-figure`} />
        )}
        {caption ? (
          <Text textStyle="body.sm" color="secondary">
            {caption}
          </Text>
        ) : null}
      </View>
      {explain ? <InfoTip term={label} body={explain} testID={`${testID}-explain`} /> : null}
      {action}
    </Card>
  );
}

function FirstCell({
  cell,
  onAddSpending,
  websiteLabel,
  testID,
  stacked,
  styles,
}: {
  cell: Exclude<HomeStripFirstCell, { kind: "unset" }>;
  onAddSpending?: () => void;
  websiteLabel?: string;
  testID: string;
  stacked: boolean;
  styles: Styles;
}) {
  const id = `${testID}-first`;
  if (cell.kind === "refused") {
    // The refusal's notice in place of the figure: never £0, never the budget prompt.
    return (
      <KpiCard
        label={STRIP.leftOver}
        caption={cell.notice}
        testID={id}
        groupTestID={`${testID}-refused`}
        stacked={stacked}
        styles={styles}
      />
    );
  }
  if (cell.kind === "incomeOnly") {
    return (
      <KpiCard
        label={STRIP.incomeOnly}
        value={cell.figure}
        // Web says what the income leaves out after its link; here it is the caption.
        caption={cell.leavesOut}
        action={
          <Button
            label={websiteLabel ?? STRIP.addSpending}
            variant="link"
            size="sm"
            accessibilityRole="link"
            testID={`${testID}-add-spending`}
            onPress={onAddSpending}
          />
        }
        testID={id}
        groupTestID={`${testID}-income-only`}
        stacked={stacked}
        styles={styles}
      />
    );
  }
  // A shortfall changes the label only: the figure keeps the ordinary text colour, with no icon.
  return (
    <KpiCard
      label={cell.kind === "short" ? STRIP.short : STRIP.leftOver}
      value={cell.figure}
      caption={cell.leavesOut ?? STRIP.leftOverCaption}
      explain={STRIP.leftOverExplain}
      testID={id}
      groupTestID={`${testID}-${cell.kind === "short" ? "short" : "left-over"}`}
      stacked={stacked}
      styles={styles}
    />
  );
}

function SecondCell({
  cell,
  testID,
  stacked,
  styles,
}: {
  cell: HomeStripSecondCell;
  testID: string;
  stacked: boolean;
  styles: Styles;
}) {
  if (cell.kind === "none") return null;
  const owed = cell.kind === "owed";
  return (
    <KpiCard
      label={owed ? STRIP.owed : STRIP.pension}
      value={cell.figure}
      caption={owed ? STRIP.owedCaption : STRIP.pensionCaption}
      testID={`${testID}-second`}
      groupTestID={`${testID}-${cell.kind}`}
      stacked={stacked}
      styles={styles}
    />
  );
}

/**
 * Home's two supporting figures under the hero, as web's `DashboardKpiStrip`: what is left over
 * each month (or short, or the budget's income only, or a refusal's notice), then what the person
 * owes or, with no debt, their pension pots. Everything comes from the engine's `selectHomeStrip`;
 * this draws it. With no budget the strip is one prompt, which hides the second figure too (web's
 * `KpiStrip` rule). The cells stay side by side at any width and stack from 150% text.
 */
export function KpiStrip({
  strip,
  items,
  emptyPrompt,
  loading = false,
  onAddBudget,
  onAddSpending,
  websiteLabel,
  testID = "kpi-strip",
}: KpiStripProps) {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const stacked = stacks(theme, fontScale);
  const layout = stacked ? styles.column : styles.row;

  if (!loading && items) {
    if (items.length === 0) {
      return emptyPrompt ? (
        <Card testID={`${testID}-prompt`} style={styles.prompt}>
          <Text>{emptyPrompt}</Text>
        </Card>
      ) : null;
    }
    return (
      <View style={layout} testID={testID}>
        {items.map((item) => (
          <KpiCard
            key={item.key}
            label={item.label}
            value={item.value}
            caption={item.caption}
            testID={`${testID}-${item.key}`}
            groupTestID={`${testID}-${item.key}-group`}
            stacked={stacked}
            styles={styles}
          />
        ))}
      </View>
    );
  }

  if (loading || !strip) {
    if (!loading) return null;
    const heights = skeletonHeights(theme, fontScale);
    // Hidden from screen readers: the hero above already says what is loading.
    return (
      <View
        style={layout}
        testID={`${testID}-loading`}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {(["first", "second"] as const).map((cell) => (
          <Card
            key={cell}
            testID={`${testID}-loading-${cell}`}
            style={stacked ? styles.cellStacked : styles.cellInRow}
          >
            <View style={styles.group}>
              {(["label", "figure", "caption"] as const).map((part) => (
                <View
                  key={part}
                  style={[styles.block, styles[`${part}Block`], { height: heights[part] }]}
                />
              ))}
            </View>
          </Card>
        ))}
      </View>
    );
  }

  if (strip.collapsed || strip.first.kind === "unset") {
    return (
      <Card testID={`${testID}-prompt`} style={styles.prompt}>
        <Text>{STRIP.prompt}</Text>
        <Button
          label={websiteLabel ?? STRIP.addBudget}
          variant="link"
          size="sm"
          accessibilityRole="link"
          testID={`${testID}-add-budget`}
          onPress={onAddBudget}
        />
      </Card>
    );
  }

  return (
    <View style={layout} testID={testID}>
      <FirstCell
        cell={strip.first}
        onAddSpending={onAddSpending}
        websiteLabel={websiteLabel}
        testID={testID}
        stacked={stacked}
        styles={styles}
      />
      <SecondCell cell={strip.second} testID={testID} stacked={stacked} styles={styles} />
    </View>
  );
}
