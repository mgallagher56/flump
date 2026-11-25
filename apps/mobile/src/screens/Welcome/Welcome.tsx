import { Link } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { APP_NAME, TAGLINE } from "../../copy/brand";
import { useTheme } from "../../theme/ThemeProvider";
import { createStyles } from "./Welcome.styles";

/** The placeholder first screen: the name and the tagline, in the system's light or dark theme. */
export function Welcome() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.name}>
          {APP_NAME}
        </Text>
        <Text style={styles.tagline}>{TAGLINE}</Text>
        {__DEV__ ? (
          <Link href="/engine-check" asChild>
            <Pressable accessibilityRole="link" style={styles.devLink}>
              <Text style={styles.devLinkText}>Device check</Text>
            </Pressable>
          </Link>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
