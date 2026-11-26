import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

/**
 * Empty on purpose: the dialog is the platform's own alert (an iOS alert, an Android Material
 * dialog; CROSS-PLATFORM section 4), drawn in the system font and colours. Kept for the native
 * file set.
 */
export const createStyles = (_theme: Theme) => StyleSheet.create({});
