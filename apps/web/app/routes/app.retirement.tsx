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
import { retirementArgsFromLoader } from "~/features/retirement/retirementInput";
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

  const planArgs = useMemo(
    () =>
      retirementArgsFromLoader(
        {
          userProfile: loaderData.userProfile,
          accounts: loaderData.accounts ?? [],
          budgetEntries: (loaderData.budgetEntries ?? []).map((row, idx) =>
            budgetEntryFromRow(row, idx),
          ),
          retirementPlan: loaderData.retirementPlan,
        },
        new Date(),
      ),
    [loaderData],
  );

  const handleSavePlan = (payload: UpsertRetirementPlanRequest, etag: string | null) => {
    const fd = new FormData();
    fd.set("payload", JSON.stringify(payload));
    if (etag) fd.set("ifMatch", etag);
    fetcher.submit(fd, { method: "post" });
  };

  return (
    <RetirementPlanner
      // Remount with the new saved values after a save.
      key={loaderData.etag ?? "unsaved"}
      planArgs={planArgs}
      accountDetails={loaderData.accountDetails ?? []}
      etag={loaderData.etag}
      isSaving={fetcher.state !== "idle"}
      onSavePlan={handleSavePlan}
    />
  );
}
