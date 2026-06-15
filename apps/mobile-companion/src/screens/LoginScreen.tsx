import { FontAwesome5 } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { useEffect, useMemo, useState } from "react";
import { Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../ThemeContext";
import { radii, spacing } from "../theme";

export default function LoginScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsBiometricSupported(compatible && enrolled);
    })();
  }, []);

  const handleBiometricUnlock = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Flump",
        fallbackLabel: "Use Passcode",
      });

      if (result.success) {
        navigation.replace("Main");
      }
    } catch (error) {
      Alert.alert("Authentication Error", "Could not complete biometric authentication.");
    }
  };

  const handleMockSignIn = () => {
    navigation.replace("Main");
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top spacing */}
      <View />

      {/* Brand & Heading */}
      <View style={styles.brandContainer}>
        <View style={styles.iconContainer}>
          <FontAwesome5 name="lock" size={48} color={colors.indigo[600]} />
        </View>
        <Text style={styles.title}>Flump.</Text>
        <Text style={styles.subtitle}>
          Securely track accounts, simulate mortgage overpayments, and forecast net worth on the go.
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        {isBiometricSupported && (
          <TouchableOpacity onPress={handleBiometricUnlock} style={styles.biometricButton}>
            <FontAwesome5 name="fingerprint" size={20} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Biometric Unlock</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={handleMockSignIn}
          style={[
            styles.signInButton,
            isBiometricSupported ? styles.signInSecondary : styles.signInPrimary,
          ]}
        >
          <Text style={styles.buttonText}>
            {isBiometricSupported ? "Sign In with Mock Auth" : "Sign In with WorkOS (Mock)"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Protected by enterprise-grade SSO. Flump does not share your data.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.slate[950],
      justifyContent: "space-between",
      paddingHorizontal: spacing[6],
      paddingVertical: spacing[10],
    },
    brandContainer: {
      alignItems: "center",
    },
    iconContainer: {
      backgroundColor: "rgba(99, 102, 241, 0.1)",
      padding: spacing[5],
      borderRadius: radii.lg * 1.5,
      borderWidth: 1,
      borderColor: "rgba(99, 102, 241, 0.2)",
      marginBottom: spacing[6],
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 24,
    },
    title: {
      color: colors.text,
      fontSize: 36,
      fontWeight: "800",
      letterSpacing: -0.5,
      textAlign: "center",
    },
    subtitle: {
      color: colors.slate[400],
      fontSize: 16,
      textAlign: "center",
      marginTop: 12,
      maxWidth: 280,
    },
    actionsContainer: {
      width: "100%",
      alignItems: "center",
    },
    biometricButton: {
      width: "100%",
      backgroundColor: colors.indigo[600],
      borderRadius: radii.full,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      marginBottom: 16,
      shadowColor: colors.indigo[600],
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 4,
    },
    signInButton: {
      width: "100%",
      borderRadius: radii.full,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
    },
    signInPrimary: {
      backgroundColor: colors.indigo[600],
      borderColor: colors.indigo[600],
      shadowColor: colors.indigo[600],
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 4,
    },
    signInSecondary: {
      borderColor: colors.slate[800],
      backgroundColor: colors.slate[900],
    },
    buttonText: {
      color: "#ffffff",
      fontWeight: "700",
      fontSize: 18,
    },
    footerText: {
      color: colors.slate[500],
      fontSize: 12,
      textAlign: "center",
      marginTop: 16,
    },
  });
