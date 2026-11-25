import * as SecureStore from "expo-secure-store";
import { useState } from "react";
import { View } from "react-native";
import { runSignInCheck, type SignInCheckReport } from "../../auth/signInCheck";
import { createTokenStore } from "../../auth/tokenStore";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Screen } from "../../components/Screen";
import { Text } from "../../components/Text";
import { loadSignInConfig } from "../../config";
import { checkAccountWithToken } from "../../data/account";
import { createWorkosClient } from "../../data/workos";

/**
 * Dev only: the S2a spike against real WorkOS. Sign in first, then run it once and read the rows
 * out. It shows no token values, email or name. Afterwards, sign out: the check rotates tokens.
 */
export function SignInCheck({ run = defaultRun }: { run?: () => Promise<SignInCheckReport> }) {
  const [report, setReport] = useState<SignInCheckReport | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const start = async () => {
    setPending(true);
    setProblem(null);
    try {
      setReport(await run());
    } catch (error) {
      setProblem(
        error instanceof Error && error.name === "NotSignedInError"
          ? "Sign in first."
          : "The check could not run.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <Screen edges={["right", "bottom", "left"]}>
      <Text>Runs the WorkOS questions from plan section 5.1 once. Shows no token values.</Text>
      <Button label="Run the sign-in check" pending={pending} onPress={() => void start()} />
      {problem ? <Text color="danger">{problem}</Text> : null}
      {report ? (
        <Card>
          <View>
            {rows(report).map(([label, value]) => (
              <Text key={label}>
                {label}: {value}
              </Text>
            ))}
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}

function rows(report: SignInCheckReport): [string, string][] {
  return [
    ["Issuer", report.issuer ?? "none"],
    ["Claim names", report.claimNames.join(", ") || "none"],
    ["Access token lifetime (seconds)", report.accessLifetimeSeconds?.toString() ?? "unknown"],
    ["Refresh with no client secret", report.refreshWithoutSecret],
    [
      "Refresh token replaced on use",
      report.refreshTokenReplaced === null ? "unknown" : report.refreshTokenReplaced ? "yes" : "no",
    ],
    ["Old refresh token used again", report.oldRefreshTokenReused],
    ["Replacement after that reuse", report.replacementAfterReuse],
    ["Backend GET /v1/user-profile", report.backend],
  ];
}

function defaultRun(): Promise<SignInCheckReport> {
  const config = loadSignInConfig();
  return runSignInCheck({
    tokens: createTokenStore(SecureStore, SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY),
    workos: createWorkosClient(config.auth),
    checkAccountWith: (token) => checkAccountWithToken(config.api.apiBaseUrl, token),
  });
}
