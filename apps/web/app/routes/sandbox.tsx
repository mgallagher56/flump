import type { OnboardingSeedPayload } from "@flump/finance-engine";
import { persistOnboardingSeed } from "@flump/finance-engine";
import { Button } from "@repo/ui";
import { useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import {
  type LoaderFunctionArgs,
  type MetaFunction,
  redirect,
  useNavigate,
  useSearchParams,
} from "react-router";
import { SampleModeProvider } from "~/context/SampleModeContext";
import { HomeDashboard } from "~/features/dashboard/components/HomeDashboard";
import { SandboxBar } from "~/features/signed-out/components/SandboxBar";
import {
  sandboxEnd,
  sandboxEndText,
  sandboxPage,
} from "~/features/signed-out/components/SandboxBar/SandboxBar.styles";
import { financialBaselineAtom, writeOnboardingSeedCookie } from "~/state/baseline.store";
import { getAuthSession } from "~/utils/auth.server";
import { getSandboxPersonaData } from "~/utils/demoData";

export const meta: MetaFunction = () => [
  { title: "Example figures | Flump" },
  { name: "robots", content: "noindex, nofollow" },
];

// The sandbox is for signed-out visitors only: signed-in users already have real data.
export const loader = async (args: LoaderFunctionArgs) => {
  try {
    const { user } = await getAuthSession(args, { ensureSignedIn: false });
    if (user) return redirect("/");
  } catch (error) {
    // Auth redirects and similar Responses must propagate; anything else means signed out.
    if (error instanceof Response) throw error;
  }
  return {};
};

/** Neutral names that describe what each sample household is doing (copy guide 7b, E31). */
const PERSONAS = [
  { key: "medium", label: "Renting" },
  { key: "debt", label: "Paying off debts" },
  { key: "high", label: "Paying a mortgage and letting a property" },
] as const;

export default function SandboxRoute() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const personaParam = searchParams.get("persona");

  const initialPersona: "debt" | "medium" | "high" =
    personaParam === "wealth" || personaParam === "high"
      ? "high"
      : personaParam === "debt"
        ? "debt"
        : "medium";

  const [activePersona, setActivePersona] = useState<"debt" | "medium" | "high">(initialPersona);
  const setBaseline = useSetAtom(financialBaselineAtom);

  useEffect(() => {
    if (activePersona === "debt") {
      setBaseline((prev) => ({
        ...prev,
        annualGrossSalary: 34000,
        financialStage: "STAGE_1_DEBT_RECOVERY",
        enabledModules: ["debt", "budget", "accounts"],
      }));
    } else if (activePersona === "medium") {
      setBaseline((prev) => ({
        ...prev,
        annualGrossSalary: 39000,
        financialStage: "STAGE_2_BUFFER_BUILD",
        enabledModules: ["accounts", "budget", "pension"],
      }));
    } else {
      setBaseline((prev) => ({
        ...prev,
        annualGrossSalary: 115000,
        financialStage: "STAGE_3_WEALTH_OPTIMIZE",
        enabledModules: ["accounts", "budget", "tax", "pension", "mortgage"],
      }));
    }
  }, [activePersona, setBaseline]);

  const dashboardData = getSandboxPersonaData(activePersona);

  const handleSaveAndCreateAccount = () => {
    const seed: OnboardingSeedPayload = {
      mode: activePersona === "debt" ? "DEBT" : "WEALTH",
      inferredStage:
        activePersona === "debt"
          ? "STAGE_1_DEBT_RECOVERY"
          : activePersona === "medium"
            ? "STAGE_2_BUFFER_BUILD"
            : "STAGE_3_WEALTH_OPTIMIZE",
      inferredModules:
        activePersona === "debt"
          ? ["debt", "budget", "accounts"]
          : activePersona === "medium"
            ? ["accounts", "budget", "pension"]
            : ["accounts", "budget", "tax", "pension", "mortgage"],
      timestamp: Date.now(),
    };

    writeOnboardingSeedCookie(seed);
    persistOnboardingSeed(seed as any);

    navigate("/signup");
  };

  return (
    <div className={sandboxPage()}>
      {/* The dashboard itself, with the bar as its one sample-data notice (E16 P4.4). */}
      <SampleModeProvider value>
        <HomeDashboard
          // The SandboxBar sits above the h1 on purpose: it is the sandbox's page-level bar and
          // one of its two notices (plan P4.4), not a projection notice, so P4.1's "never above
          // the h1" does not apply to it.
          banner={
            <SandboxBar
              active={activePersona}
              onSave={handleSaveAndCreateAccount}
              onSelect={setActivePersona}
              personas={PERSONAS}
            />
          }
          footer={
            <section
              aria-label="Sign up"
              className={sandboxEnd()}
              data-testid="sandbox-end"
              id="sandbox-end"
            >
              <p className={sandboxEndText()}>Ready to use your own figures?</p>
              <Button
                data-testid="sandbox-end-sign-up"
                id="sandbox-end-sign-up"
                size="md"
                type="button"
                onClick={handleSaveAndCreateAccount}
              >
                Sign up
              </Button>
            </section>
          }
          isSample
          persistVisibility={false}
          userProfile={dashboardData.userProfile}
          accountsData={dashboardData.accountsData as any}
          budgetData={dashboardData.budgetData as any}
          checklistProps={{
            hasAccounts: true,
            hasBudget: true,
            hasMortgageAccount: dashboardData.hasMortgageAccount,
            hasPension: true,
            hasProfile: true,
            hasRunForecast: dashboardData.hasRunForecast,
            hasSavings: dashboardData.hasSavings,
            hasTax: true,
            completedSteps: dashboardData.completedSteps,
          }}
          debtData={dashboardData.debtData as any}
          forecastData={dashboardData.forecastData as any}
          mortgageData={dashboardData.mortgageData as any}
          pensionData={dashboardData.pensionData as any}
          savingsData={dashboardData.savingsData as any}
          taxData={dashboardData.taxData as any}
          user={dashboardData.user as any}
        />
      </SampleModeProvider>
    </div>
  );
}
