import {
  type CheckInStep,
  categorizeAccountType,
  countsTowardNetWorth,
  doneKind,
} from "@flump/finance-engine/check-in";
import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Linking, View } from "react-native";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { CurrencyInput } from "../../components/CurrencyInput";
import { FormField } from "../../components/FormField";
import { InlineAlert } from "../../components/InlineAlert";
import { Money } from "../../components/Money";
import { Screen } from "../../components/Screen";
import { Skeleton } from "../../components/Skeleton";
import { StatusBadge } from "../../components/StatusBadge";
import { Text } from "../../components/Text";
import { Toast } from "../../components/Toast";
import {
  CHECK_IN,
  calculatedExplain,
  cardSummary,
  doneText,
  keepRestLabel,
  keptText,
  lastFigureText,
  lastMonthText,
  progressText,
  statementPromptText,
  typeLabel,
} from "../../copy/checkIn";
import { useDelayedLoading } from "../../data/useDelayedLoading";
import { type CheckInFlow, useCheckInFlow } from "../../features/check-in/checkInFlow";
import { type CheckInInputs, useCheckInData } from "../../features/check-in/useCheckInData";
import { useSaveCheckIn } from "../../features/check-in/useSaveCheckIn";
import { useTheme } from "../../theme/ThemeProvider";
import { CheckInDone } from "../CheckInDone";
import { createStyles } from "./CheckIn.styles";

/** Under the stack header, which already clears the top edge. */
const EDGES = ["bottom", "left", "right"] as const;

export interface CheckInProps {
  /** Signed in but offline: the cards show, saving is off and says why. */
  offline?: boolean;
  /** For the empty state's link to the website, until accounts can be added here (S8). */
  marketingOrigin: string;
  onClose(): void;
  /** Injected clock for tests. */
  now?: () => Date;
}

/**
 * The monthly check-in (E12 S3, plan 9.6): loading, a failed load (never shown as "no accounts"),
 * the empty state, the walk-through and the summary.
 */
export function CheckIn({ offline = false, marketingOrigin, onClose, now }: CheckInProps) {
  const data = useCheckInData(now);
  // The walk-through runs on one copy of the data: taken once every read has settled (never from a
  // cache that is being fetched again after the last check-in), and kept while it is open, so a
  // background refetch never resets the cards or the answers.
  const [inputs, setInputs] = useState<CheckInInputs | null>(null);
  const settled = data.status === "ready" && !data.fetching ? data.inputs : null;
  useEffect(() => {
    if (settled) setInputs((held) => held ?? settled);
  }, [settled]);
  const held = inputs ?? settled;
  const skeleton = useDelayedLoading(!held && data.status !== "error");

  if (held) {
    return (
      <Walkthrough
        inputs={held}
        offline={offline}
        marketingOrigin={marketingOrigin}
        onClose={onClose}
      />
    );
  }
  if (data.status === "error") {
    // `data.problem` says why (terms not agreed is a seam for PR #939); every reason reads the same
    // until the screens for them land.
    return (
      <Screen edges={EDGES} testID="check-in-load-error">
        <Text accessibilityRole="header" textStyle="heading.md">
          {CHECK_IN.loadErrorHeading}
        </Text>
        <Text color="secondary">{CHECK_IN.loadErrorBody}</Text>
        <Button label={CHECK_IN.tryAgain} testID="check-in-retry" onPress={data.retry} />
      </Screen>
    );
  }
  return (
    <Screen edges={EDGES} testID="check-in-loading">
      {skeleton ? <Skeleton label={CHECK_IN.loading} testID="check-in-skeleton" /> : null}
    </Screen>
  );
}

function Walkthrough({
  inputs,
  offline,
  marketingOrigin,
  onClose,
}: {
  inputs: CheckInInputs;
  offline: boolean;
  marketingOrigin: string;
  onClose(): void;
}) {
  const saver = useSaveCheckIn(inputs.month);
  const flow = useCheckInFlow(inputs, saver);

  if (flow.steps.length === 0) {
    return (
      <Screen edges={EDGES} testID="check-in-empty">
        <Text>{CHECK_IN.empty}</Text>
        <Button
          label={CHECK_IN.addAccount}
          accessibilityRole="link"
          variant="secondary"
          onPress={() => void Linking.openURL(marketingOrigin)}
        />
      </Screen>
    );
  }
  if (flow.finished && flow.summary) {
    return (
      <CheckInDone
        month={flow.month}
        summary={flow.summary}
        onDone={onClose}
        onChangeBalance={flow.reopen}
      />
    );
  }
  return <Cards flow={flow} inputs={inputs} offline={offline} />;
}

function Cards({
  flow,
  inputs,
  offline,
}: {
  flow: CheckInFlow;
  inputs: CheckInInputs;
  offline: boolean;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { steps, index } = flow;
  const step = steps[index] as CheckInStep;
  const position = index + 1;
  const total = steps.length;
  const done = flow.isDone(step.accountId);
  const next = position < total ? position : flow.nextOpen(index);
  const keepCount = flow.keepable.length;

  // The new position is said without moving focus (plan 9.6 acceptance 11), never on first open.
  const firstCard = useRef(true);
  useEffect(() => {
    if (firstCard.current) {
      firstCard.current = false;
      return;
    }
    AccessibilityInfo.announceForAccessibility(progressText(position, total));
  }, [position, total]);

  return (
    <Screen edges={EDGES} testID="check-in-cards">
      <Text color="secondary" testID="check-in-progress">
        {progressText(position, total)}
      </Text>
      {index === 0 ? <Text color="secondary">{CHECK_IN.description}</Text> : null}
      {offline ? <InlineAlert tone="info" message={CHECK_IN.offline} /> : null}
      {keepCount >= 2 ? (
        <Button
          label={keepRestLabel(keepCount, keepCount === total)}
          variant="secondary"
          testID="check-in-keep-rest"
          disabled={offline}
          onPress={() => void flow.keepRest()}
        />
      ) : null}
      <Toast message={flow.kept !== null ? keptText(flow.kept) : null} testID="check-in-kept" />
      <StepCard
        key={step.accountId}
        flow={flow}
        inputs={inputs}
        offline={offline}
        position={position}
        step={step}
      />
      <View style={styles.nav}>
        {position > 1 ? (
          <Button
            label={CHECK_IN.back}
            variant="ghost"
            testID="check-in-back"
            onPress={() => flow.setIndex(index - 1)}
          />
        ) : null}
        {done && next !== -1 ? (
          <Button
            label={CHECK_IN.next}
            variant="ghost"
            testID="check-in-next"
            onPress={() => flow.setIndex(next)}
          />
        ) : null}
      </View>
      {flow.canFinish ? (
        <Button
          label={CHECK_IN.finish}
          testID="check-in-finish"
          disabled={offline}
          onPress={() => void flow.finish()}
        />
      ) : null}
      {flow.finishFailed ? <InlineAlert message={CHECK_IN.finishError} /> : null}
    </Screen>
  );
}

function StepCard({
  flow,
  inputs,
  offline,
  position,
  step,
}: {
  flow: CheckInFlow;
  inputs: CheckInInputs;
  offline: boolean;
  position: number;
  step: CheckInStep;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const id = step.accountId;
  const calc = step.calculated;
  const saving = flow.isSaving(id);
  const draft = flow.draft(id);
  const figure = flow.figure(id);
  const done = flow.isDone(id);
  const outside = !countsTowardNetWorth(categorizeAccountType(step.type), inputs.basis);
  const fieldLabel = step.isLiability ? CHECK_IN.owedNow : CHECK_IN.newBalance;
  const type = typeLabel(step.type, step.name);
  const update = () => {
    if (draft !== null) void flow.answer(step, { kind: "update", value: draft });
  };

  return (
    <Card testID="check-in-card">
      {/* One group for screen readers: name, figure, month and position in one sentence. */}
      <View
        accessible
        accessibilityLabel={cardSummary({
          name: step.name,
          figure: calc ? calc.value : step.lastValue,
          lastMonth: step.lastMonth,
          position,
          total: flow.steps.length,
          type,
          outsideNetWorth: outside,
        })}
        style={styles.head}
      >
        <Text accessibilityRole="header" textStyle="heading.sm">
          {step.name}
        </Text>
        {type ? <Text color="secondary">{type}</Text> : null}
        {calc ? null : (
          <Text color="secondary" tabular>
            {lastFigureText(step.lastValue)}
          </Text>
        )}
        <Text color="secondary" tabular>
          {lastMonthText(step.lastMonth)}
        </Text>
        {outside ? <Text color="secondary">{CHECK_IN.outsideNetWorth}</Text> : null}
      </View>

      {calc ? (
        <View style={styles.calculated} testID="check-in-calculated">
          <StatusBadge label={CHECK_IN.calculated} />
          <Money value={calc.value} size="lg" testID="check-in-calculated-figure" />
          <Text color="secondary" tabular>
            {calculatedExplain(calc)}
          </Text>
          {step.statementPrompt ? (
            <Text color="secondary">{statementPromptText(step.statementPrompt)}</Text>
          ) : null}
        </View>
      ) : null}

      {done && figure ? (
        <View style={styles.actions}>
          <Text testID="check-in-done-status" tabular>
            {saving ? CHECK_IN.saving : doneText(doneKind(step, figure), figure.value)}
          </Text>
          <Button
            label={CHECK_IN.change}
            accessibilityLabel={`${CHECK_IN.change} ${step.name}`}
            variant="secondary"
            testID="check-in-change"
            disabled={saving || offline}
            onPress={() => flow.edit(id)}
          />
        </View>
      ) : (
        <View style={styles.section}>
          <FormField label={fieldLabel}>
            <CurrencyInput
              value={draft}
              onValueChange={(v) => flow.setDraft(id, v)}
              accessibilityLabel={`${fieldLabel} in pounds, ${step.name}`}
              editable={!saving}
              onSubmitEditing={offline ? undefined : update}
              testID="check-in-input"
            />
          </FormField>
          <View style={styles.actions}>
            <Button
              label={CHECK_IN.update}
              testID="check-in-update"
              disabled={draft === null || offline}
              pending={saving}
              onPress={update}
            />
            {calc ? (
              <Button
                label={CHECK_IN.keep}
                variant="secondary"
                testID="check-in-keep"
                disabled={saving || offline}
                onPress={() => void flow.answer(step, { kind: "keepCalculated" })}
              />
            ) : (
              <Button
                label={CHECK_IN.noChange}
                variant="secondary"
                testID="check-in-no-change"
                disabled={step.lastValue === null || saving || offline}
                onPress={() => void flow.answer(step, { kind: "noChange" })}
              />
            )}
          </View>
          {flow.hasError(id) ? (
            <>
              <InlineAlert message={CHECK_IN.stepError} testID="check-in-step-error" />
              <Button
                label={CHECK_IN.tryAgain}
                variant="secondary"
                testID="check-in-retry-save"
                disabled={offline}
                pending={saving}
                onPress={() => void flow.retry(step)}
              />
            </>
          ) : null}
        </View>
      )}
    </Card>
  );
}
