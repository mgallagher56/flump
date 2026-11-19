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
import {
  retirementArgsFromLoader,
  workplaceSalaryNotSetFromLoader,
} from "~/features/retirement/retirementInput";
import { backendFetch, loadWorkspaceSnapshot } from "~/services/backend-client.server";
import { BackendError } from "~/services/backend-error";
import { ifMatchFromForm, revalidateOnConflict } from "~/services/conflict";
import { actionErrorResponse } from "~/services/route-error.server";
import { getAuthSession, requireAccessToken } from "~/utils/auth.server";

export const meta: MetaFunction = () => [{ title: "Retirement plan | Flump" }];

export const shouldRevalidate = revalidateOnConflict;

/**
 * RD9: Retirement is a friends-beta feature. For anyone else the backend answers /retirement-plan
 * with its unknown-route 404, and the page is the app's normal not-found page, as for any unknown
 * URL. Any other error is rethrown unchanged.
 */
function rethrowAsNotFound(err: unknown): never {
  if (err instanceof BackendError && err.status === 404) {
    throw new Response("Not Found", { status: 404, statusText: "Not Found" });
  }
  throw err;
}

export const loader = async (args: LoaderFunctionArgs) => {
  const { accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  const token = requireAccessToken({ accessToken });

  const [snapshot, planRes] = await Promise.all([
    loadWorkspaceSnapshot(args, { includeBudget: true }),
    backendFetch("/retirement-plan", {
      schema: RetirementPlanResponse,
      accessToken: token,
      method: "GET",
    }).catch(rethrowAsNotFound),
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
    if (err instanceof BackendError && err.status === 404) rethrowAsNotFound(err);
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
      workplaceSalaryNotSet={workplaceSalaryNotSetFromLoader(loaderData.userProfile)}
    />
  );
}
