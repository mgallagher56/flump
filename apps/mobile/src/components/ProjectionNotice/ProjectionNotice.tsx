import { useMemo } from "react";
import { View } from "react-native";
import { SCENARIO } from "../../copy/budget";
import { useTheme } from "../../theme/ThemeProvider";
import { Text } from "../Text";
import { createStyles } from "./ProjectionNotice.styles";

export interface ProjectionNoticeProps {
  /** Defaults to "projection-notice". */
  testID?: string;
}

/**
 * The one quiet notice on a projection, as web's `ProjectionNotice`: the fixed words (R6), never
 * reworded or shortened, on the neutral surface with no warning colour. One per scenario zone.
 */
export function ProjectionNotice({ testID = "projection-notice" }: ProjectionNoticeProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View accessible style={styles.base} testID={testID}>
      <Text textStyle="body.sm" color="secondary">
        {SCENARIO.notice}
      </Text>
    </View>
  );
}
