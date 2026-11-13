import type { ReactElement } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import TaxContainer from "~/containers/tax/TaxContainer";
import { backendFetch, loadWorkspaceSnapshot } from "~/services/backend-client.server";
import { BackendError } from "~/services/backend-error";
import { actionErrorResponse } from "~/services/route-error.server";
import { getAuthSession, requireAccessToken } from "~/utils/auth.server";
import { roundTo2dp } from "~/utils/roundTo2dp";

/**
 * Mirrors the per-request cap on `POST /tax-records/bulk`: the backend `MAX_BULK_TAX_RECORDS` and
 * `BulkCreateTaxRecordsRequest` in packages/api-contract (a literal there, not exported).
 */
const BULK_TAX_RECORDS_CHUNK = 500;

const chunk = <T,>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

export const action = async (args: ActionFunctionArgs) => {
  const { accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  const token = requireAccessToken({ accessToken });
  const formData = await args.request.formData();
  const intent = formData.get("intent");

  try {
    if (intent === "update-profile") {
      const annualSalary = formData.get("annualSalary");
      const propertyOwnershipShare = formData.get("propertyOwnershipShare");
      await backendFetch(`/user-profile`, {
        accessToken: token,
        method: "PATCH",
        body: {
          annualSalary: annualSalary ? roundTo2dp(Number.parseFloat(annualSalary as string)) : null,
          propertyOwnershipShare: propertyOwnershipShare
            ? roundTo2dp(Number.parseFloat(propertyOwnershipShare as string))
            : 100.0,
        },
      });
    } else if (intent === "create-transaction") {
      const name = formData.get("name");
      const source = formData.get("source");
      const type = formData.get("type");
      const category = formData.get("category");
      const amount = formData.get("amount");
      const date = formData.get("date");
      const frequency = formData.get("frequency");
      const endDate = formData.get("endDate") || null;
      const notes = formData.get("notes") || null;
      const receiptFilename = formData.get("receiptFilename") || null;
      const receiptMimeType = formData.get("receiptMimeType") || null;
      const receiptData = formData.get("receiptData") || null;

      await backendFetch(`/tax-records`, {
        accessToken: token,
        method: "POST",
        body: {
          name,
          source,
          type,
          category,
          amount: amount ? roundTo2dp(Number.parseFloat(amount as string)) : 0,
          date,
          frequency,
          endDate,
          notes,
          receiptFilename,
          receiptMimeType,
          receiptData,
        },
      });
    } else if (intent === "update-transaction") {
      const id = formData.get("id");
      const name = formData.get("name");
      const source = formData.get("source");
      const type = formData.get("type");
      const category = formData.get("category");
      const amount = formData.get("amount");
      const date = formData.get("date");
      const frequency = formData.get("frequency");
      const endDate = formData.get("endDate") || null;
      const notes = formData.get("notes") || null;
      const receiptFilename = formData.get("receiptFilename") || null;
      const receiptMimeType = formData.get("receiptMimeType") || null;
      const receiptData = formData.get("receiptData") || null;
      const receiptClear = formData.get("receiptClear") === "1";

      await backendFetch(`/tax-records/${encodeURIComponent(String(id ?? ""))}`, {
        accessToken: token,
        method: "PATCH",
        body: {
          name,
          source,
          type,
          category,
          amount: amount ? roundTo2dp(Number.parseFloat(amount as string)) : 0,
          date,
          frequency,
          endDate,
          notes,
          receiptFilename,
          receiptMimeType,
          // Omitting receiptData keeps the stored receipt (E20-N15); null clears it.
          ...(receiptData ? { receiptData } : receiptClear ? { receiptData: null } : {}),
        },
      });
    } else if (intent === "delete-transaction") {
      const id = formData.get("id");
      await backendFetch(`/tax-records/${encodeURIComponent(String(id ?? ""))}`, {
        accessToken: token,
        method: "DELETE",
      });
    } else if (intent === "delete-tax-year") {
      const recordIdsJson = formData.get("recordIds") as string | null;
      if (recordIdsJson) {
        const recordIds: unknown = JSON.parse(recordIdsJson);
        if (!Array.isArray(recordIds)) throw new SyntaxError("recordIds must be an array");
        await Promise.all(
          recordIds.map((id) =>
            backendFetch(`/tax-records/${encodeURIComponent(String(id ?? ""))}`, {
              accessToken: token,
              method: "DELETE",
            }),
          ),
        );
      }
    } else if (intent === "bulk-create-transactions") {
      const recordsJson = formData.get("records") as string;
      const capPreviousJson = formData.get("capPreviousRecordIds") as string | null;

      const records = recordsJson ? JSON.parse(recordsJson) : [];
      const capPreviousRecordIds = capPreviousJson ? JSON.parse(capPreviousJson) : [];
      if (!Array.isArray(records) || !Array.isArray(capPreviousRecordIds)) {
        throw new SyntaxError("records and capPreviousRecordIds must be arrays");
      }

      // Requests are sequential and at most BULK_TAX_RECORDS_CHUNK each. A batch that fits goes
      // as one request. Otherwise every record chunk is created first (empty cap list) and the
      // cap-only chunks follow, so a mid-copy failure never leaves previous records capped with
      // no successor.
      type BulkBody = { records: unknown[]; capPreviousRecordIds: unknown[] };
      const fits =
        records.length <= BULK_TAX_RECORDS_CHUNK &&
        capPreviousRecordIds.length <= BULK_TAX_RECORDS_CHUNK;
      const bodies: BulkBody[] = fits
        ? [{ records, capPreviousRecordIds }]
        : [
            ...chunk(records, BULK_TAX_RECORDS_CHUNK).map((r) => ({
              records: r,
              capPreviousRecordIds: [],
            })),
            ...chunk(capPreviousRecordIds, BULK_TAX_RECORDS_CHUNK).map((c) => ({
              records: [],
              capPreviousRecordIds: c,
            })),
          ];
      let created = 0;
      for (const body of bodies) {
        try {
          await backendFetch(`/tax-records/bulk`, {
            accessToken: token,
            method: "POST",
            body,
          });
        } catch (error) {
          if (created === 0 || !(error instanceof BackendError)) throw error;
          return data(
            {
              success: false as const,
              error: `The copy was only partly completed: ${created} of ${records.length} records were created. Check your tax records before trying again.`,
            },
            { status: error.status ?? 502 },
          );
        }
        created += body.records.length;
      }
    }
    return data({ success: true });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return data({ success: false, error: "We couldn't read those records." }, { status: 400 });
    }
    return actionErrorResponse(error);
  }
};

export const loader = async (args: LoaderFunctionArgs) => {
  const { taxRecords, userProfile, accounts, user } = await loadWorkspaceSnapshot(args, {
    includeTax: true,
  });
  return data({ records: taxRecords, userProfile, accounts, user });
};

const TaxRoute = (): ReactElement => {
  return <TaxContainer />;
};

export default TaxRoute;

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
