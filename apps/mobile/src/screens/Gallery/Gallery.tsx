import { useMemo } from "react";
import { View } from "react-native";
import { Screen } from "../../components/Screen";
import { Text } from "../../components/Text";
import { ThemeProvider, useTheme } from "../../theme/ThemeProvider";
import { createStyles } from "./Gallery.styles";
import { GALLERY, type GalleryEntry } from "./galleryEntries";

/** The three ways each component is shown: each theme, and 200% text (plan section 6). */
export const PANELS = [
  { title: "Light", scheme: "light", textScale: 1 },
  { title: "Dark", scheme: "dark", textScale: 1 },
  { title: "200% text", scheme: "light", textScale: 2 },
] as const;

function Panel({ entry, panel }: { entry: GalleryEntry; panel: (typeof PANELS)[number] }) {
  return (
    <ThemeProvider scheme={panel.scheme} textScale={panel.textScale}>
      <PanelBody entry={entry} title={panel.title} />
    </ThemeProvider>
  );
}

function PanelBody({ entry, title }: { entry: GalleryEntry; title: string }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.panel}>
      <Text textStyle="label.md" color="secondary">
        {`${entry.component}, ${title}`}
      </Text>
      {entry.states.map((state) => (
        <View key={state.name} style={styles.state}>
          <Text textStyle="label.sm" color="muted">
            {state.name}
          </Text>
          {state.render()}
        </View>
      ))}
    </View>
  );
}

/**
 * Dev only (left out of production builds). Every component in every named state, in light, in
 * dark and at 200% text, in place of Storybook for the app.
 */
export function Gallery() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Screen edges={["right", "bottom", "left"]}>
      <Text accessibilityRole="header" textStyle="heading.md">
        Component gallery
      </Text>
      {GALLERY.map((entry) => (
        <View key={entry.component} style={styles.section}>
          <Text accessibilityRole="header" textStyle="heading.sm">
            {entry.component}
          </Text>
          {PANELS.map((panel) => (
            <Panel key={panel.title} entry={entry} panel={panel} />
          ))}
        </View>
      ))}
    </Screen>
  );
}
