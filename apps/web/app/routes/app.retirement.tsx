import { RetirementPlanResponse, UpsertRetirementPlanRequest } from "@flump/api-contract";
import { budgetEntryFromRow } from "@flump/finance-engine";
import { type ReactElement, useMemo } from "react";
import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
  useFetcher,
  useLoaderData,
} from "react-router";
import { RetirementPlanner } from "~/features/retirement/components/RetirementPlanner";
import { backendFetch, loadWorkspaceSnapshot } from "~/services/backend-client.server";
import { ifMatchFromForm, revalidateOnConflict } from "~/services/conflict";
import { actionErrorResponse } from "~/services/route-error.server";
import { getAuthSession, requireAccessToken } from "~/utils/auth.server";

export const meta: MetaFunction = () => [{ title: "Retirement plan | Flump" }];

export const shouldRevalidate = revalidateOnConflict;

export const loader = async (args: LoaderFunctionArgs) => {
  const { accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  const token = requireAccessToken({ accessToken });

  const [snapshot, planRes] = await Promise.all([
    loadWorkspaceSnapshot(args),
    backendFetch("/retirement-plan", {
      schema: RetirementPlanResponse,
      accessToken: token,
      method: "GET",
    }),
  ]);

  const plan = planRes.plan;
  const etag = plan.updatedAt ? `"${plan.updatedAt}"` : null;

  return {
    userProfile: snapshot.userProfile ?? null,
    accounts: snapshot.accounts ?? [],
    accountDetails: snapshot.accountDetails ?? [],
    budgetEntries: snapshot.budgetEntries ?? [],
    retirementPlan: plan,
    etag,
  };
};

export const action = async (args: ActionFunctionArgs) => {
  const { accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  const token = requireAccessToken({ accessToken });
  const formData = await args.request.formData();

  try {
    const rawPayload = formData.get("payload");
    const parsed = UpsertRetirementPlanRequest.parse(
      typeof rawPayload === "string" ? JSON.parse(rawPayload) : {},
    );
    const result = await backendFetch("/retirement-plan", {
      schema: RetirementPlanResponse,
      accessToken: token,
      method: "PUT",
      body: parsed,
      ifMatch: ifMatchFromForm(formData),
    });
    return { ok: true as const, plan: result.plan };
  } catch (err) {
    return actionErrorResponse(err);
  }
};

export default function RetirementRoute(): ReactElement {
  const loaderData = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const currentAge = useMemo(() => {
    const birthYear = loaderData.userProfile?.birthYear;
    if (typeof birthYear === "number" && Number.isInteger(birthYear)) {
      return Math.max(18, new Date().getUTCFullYear() - birthYear);
    }
    return 35;
  }, [loaderData.userProfile?.birthYear]);

  const accounts = useMemo(
    () =>
      (loaderData.accounts ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        balanceGbp: Number(a.balance ?? 0),
        monthlyContributionGbp:
          a.monthlyContribution !== null && a.monthlyContribution !== undefined
            ? Number(a.monthlyContribution)
            : null,
        interestRatePct:
          a.interestRate !== null && a.interestRate !== undefined ? Number(a.interestRate) : null,
      })),
    [loaderData.accounts],
  );

  const budgetEntries = useMemo(
    () => (loaderData.budgetEntries ?? []).map((row, idx) => budgetEntryFromRow(row, idx)),
    [loaderData.budgetEntries],
  );

  const mortgage = useMemo(
    () => (loaderData.accounts ?? []).find((a) => a.type === "Mortgage"),
    [loaderData.accounts],
  );

  const housing = useMemo(() => {
    const statusRaw = loaderData.userProfile?.housingStatus;
    const housingStatus =
      statusRaw === "renting" ||
      statusRaw === "mortgage" ||
      statusRaw === "own_outright" ||
      statusRaw === "living_with_family"
        ? statusRaw
        : null;
    return {
      housingStatus,
      monthlyHousingCostGbp: loaderData.userProfile?.monthlyHousingCost ?? null,
      mortgage: mortgage
        ? {
            balanceGbp: Math.abs(Number(mortgage.balance ?? 0)),
            interestRateApr:
              mortgage.interestRate !== null && mortgage.interestRate !== undefined
                ? Number(mortgage.interestRate)
                : 4.5,
            remainingTermMonths: mortgage.termMonths ?? null,
            monthlyPaymentGbp:
              mortgage.monthlyContribution !== null && mortgage.monthlyContribution !== undefined
                ? Number(mortgage.monthlyContribution)
                : null,
          }
        : null,
    };
  }, [loaderData.userProfile, mortgage]);

  const handleSavePlan = (payload: UpsertRetirementPlanRequest, etag: string | null) => {
    const fd = new FormData();
    fd.set("payload", JSON.stringify(payload));
    if (etag) fd.set("ifMatch", etag);
    fetcher.submit(fd, { method: "post" });
  };

  return (
    <RetirementPlanner
      currentAge={currentAge}
      accounts={accounts}
      accountDetails={loaderData.accountDetails ?? []}
      budgetEntries={budgetEntries}
      housing={housing}
      savedPlan={loaderData.retirementPlan}
      etag={loaderData.etag}
      isSaving={fetcher.state !== "idle"}
      onSavePlan={handleSavePlan}
    />
  );
}
