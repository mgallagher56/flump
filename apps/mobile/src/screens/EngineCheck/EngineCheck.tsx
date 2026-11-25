import { useMemo } from "react";
import { Card } from "../../components/Card";
import { Screen } from "../../components/Screen";
import { Text } from "../../components/Text";
import { type CheckReport, runChecks } from "./runChecks";

export interface EngineCheckProps {
  /** For tests. The screen runs the checks itself when this is left unset. */
  report?: CheckReport;
}

/**
 * Dev only (left out of production builds). Runs the engine's hand-derived tax vectors and the
 * shared formatter fixture on this device's JavaScript engine and says whether they all pass.
 */
export function EngineCheck({ report: given }: EngineCheckProps) {
  const report = useMemo(() => given ?? runChecks(), [given]);
  const { vectors, formatting } = report;

  return (
    <Screen edges={["bottom", "left", "right"]}>
      <Text accessibilityRole="header" textStyle="heading.md">
        Device check
      </Text>

      <Card>
        <Text textStyle="label.md" color="secondary">
          Runtime
        </Text>
        <Text>{report.jsEngine}</Text>
      </Card>

      <Card>
        <Text textStyle="label.md" color="secondary">
          Tax vectors
        </Text>
        <Text tabular>
          {vectors.failedIds.length === 0
            ? `All vectors pass (${vectors.checked} checked)`
            : `${vectors.failedIds.length} of ${vectors.checked} vectors fail`}
        </Text>
        {vectors.failedIds.map((id) => (
          <Text key={id} textStyle="body.sm" color="secondary" tabular>
            {id}
          </Text>
        ))}
      </Card>

      <Card>
        <Text textStyle="label.md" color="secondary">
          Formatting
        </Text>
        <Text tabular>
          {formatting.mismatches.length === 0
            ? `All formatting cases match (${formatting.checked} checked)`
            : `${formatting.mismatches.length} of ${formatting.checked} formatting cases differ`}
        </Text>
        {formatting.mismatches.map((m) => (
          <Text key={m.call} textStyle="body.sm" color="secondary" tabular>
            {`${m.call}: expected ${m.expected}, got ${m.actual}`}
          </Text>
        ))}
      </Card>

      <Card>
        <Text textStyle="label.md" color="secondary">
          API address
        </Text>
        <Text>{report.apiAddress}</Text>
      </Card>
    </Screen>
  );
}
