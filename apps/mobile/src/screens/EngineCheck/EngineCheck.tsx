import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { createStyles } from "./EngineCheck.styles";
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
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const report = useMemo(() => given ?? runChecks(), [given]);
  const { vectors, formatting } = report;

  return (
    <SafeAreaView style={styles.screen} edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          Device check
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Runtime</Text>
          <Text style={styles.result}>{report.jsEngine}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Tax vectors</Text>
          <Text style={styles.result}>
            {vectors.failedIds.length === 0
              ? `All vectors pass (${vectors.checked} checked)`
              : `${vectors.failedIds.length} of ${vectors.checked} vectors fail`}
          </Text>
          {vectors.failedIds.map((id) => (
            <Text key={id} style={styles.detail}>
              {id}
            </Text>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Formatting</Text>
          <Text style={styles.result}>
            {formatting.mismatches.length === 0
              ? `All formatting cases match (${formatting.checked} checked)`
              : `${formatting.mismatches.length} of ${formatting.checked} formatting cases differ`}
          </Text>
          {formatting.mismatches.map((m) => (
            <Text key={m.call} style={styles.detail}>
              {`${m.call}: expected ${m.expected}, got ${m.actual}`}
            </Text>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>API address</Text>
          <Text style={styles.result}>{report.apiAddress}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
