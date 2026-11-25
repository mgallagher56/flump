import { ActivityIndicator } from "react-native";
import { Screen } from "../../components/Screen";
import { LOADING_LABEL } from "../../copy/auth";
import { useTheme } from "../../theme/ThemeProvider";

/** While the stored session is checked on launch, or sign-out finishes. */
export function Loading() {
  const theme = useTheme();
  return (
    <Screen centred>
      <ActivityIndicator
        size="large"
        color={theme.colors.primary}
        accessible
        accessibilityLabel={LOADING_LABEL}
        accessibilityRole="progressbar"
      />
    </Screen>
  );
}
