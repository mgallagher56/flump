import type { OnboardingSeedPayload } from "@flump/finance-engine";
import { persistOnboardingSeed } from "@flump/finance-engine";
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
import { SampleDataNote } from "~/features/signed-out/components/SampleDataNote";
import { SandboxBar } from "~/features/signed-out/components/SandboxBar";
import { sandboxPage } from "~/features/signed-out/components/SandboxBar/SandboxBar.styles";
import { financialBaselineAtom, writeOnboardingSeedCookie } from "~/state/baseline.store";
import { getAuthSession } from "~/utils/auth.server";
import { getSandboxPersonaData } from "~/utils/demoData";

export const meta: MetaFunction = () => [
  { title: "Live Demo Sandbox | Flump (Read-Only)" },
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

const PERSONAS = [
  { key: "debt", label: "Clearing £8k debt" },
  { key: "medium", label: "£45k earner, no debt" },
  { key: "high", label: "£100k high earner" },
] as const;

export default function SandboxRoute() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const personaParam = searchParams.get("persona");

  const initialPersona: "debt" | "medium" | "high" =
    personaParam === "wealth" || personaParam === "high"
      ? "high"
      : personaParam === "medium"
        ? "medium"
        : "debt";

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
        annualGrossSalary: 45000,
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
      {/* The single "Guidance, not advice" ProjectionNotice is rendered by HomeDashboard. */}
      <SandboxBar
        active={activePersona}
        onSave={handleSaveAndCreateAccount}
        onSelect={setActivePersona}
        personas={PERSONAS}
      />

      <SampleDataNote id="sandbox-sample-data-label">
        Sample data: illustrative figures, not yours. Tax due and take-home here are examples.
        Nothing here is saved to an account.
      </SampleDataNote>

      {/* Actual SPA Dashboard View */}
      <SampleModeProvider value>
        <HomeDashboard
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
