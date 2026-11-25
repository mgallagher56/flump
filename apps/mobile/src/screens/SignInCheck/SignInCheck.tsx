import * as SecureStore from "expo-secure-store";
import { useState } from "react";
import { View } from "react-native";
import { NotSignedInError, runSignInCheck, type SignInCheckReport } from "../../auth/signInCheck";
import { createTokenStore } from "../../auth/tokenStore";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Screen } from "../../components/Screen";
import { Text } from "../../components/Text";
import { loadSignInConfig, MobileConfigError } from "../../config";
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
      setProblem(problemText(error));
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

/**
 * Why the check could not run, in words the owner can act on. Config errors name the variable,
 * never its value; anything else gives only the error's type, never its message, so no response
 * text or token can reach the screen.
 */
export function problemText(error: unknown): string {
  if (error instanceof MobileConfigError) {
    return `This build is misconfigured: ${error.message} Set it in apps/mobile/.env.local and restart Metro.`;
  }
  if (error instanceof NotSignedInError) {
    return "Sign in first. Expo Go cannot finish a sign-in (it never receives the flump:// redirect), so use a development build.";
  }
  const kind = error instanceof Error ? error.name : "unknown error";
  return `The check could not run (${kind}).`;
}

function defaultRun(): Promise<SignInCheckReport> {
  const config = loadSignInConfig();
  return runSignInCheck({
    tokens: createTokenStore(SecureStore, SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY),
    workos: createWorkosClient(config.auth),
    checkAccountWith: (token) => checkAccountWithToken(config.api.apiBaseUrl, token),
  });
}
