import type { ReactElement } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import TaxContainer from "~/containers/tax/TaxContainer";
import { loadWorkspaceSnapshot } from "~/services/backend-client.server";
import { getAuthSession } from "~/utils/utils";

export const action = async (args: ActionFunctionArgs) => {
  const { accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  const formData = await args.request.formData();
  const intent = formData.get("intent");

  const apiUrl = process.env.VITE_API_URL || "http://localhost:4000";
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken || "mock-session-token"}`,
  };

  try {
    if (intent === "update-profile") {
      const annualSalary = formData.get("annualSalary");
      const propertyOwnershipShare = formData.get("propertyOwnershipShare");
      const res = await fetch(`${apiUrl}/user-profile`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          annualSalary: annualSalary ? Number.parseFloat(annualSalary as string) : null,
          propertyOwnershipShare: propertyOwnershipShare
            ? Number.parseFloat(propertyOwnershipShare as string)
            : 100.0,
        }),
      });
      if (!res.ok) throw new Error("Failed to update user profile");
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

      const res = await fetch(`${apiUrl}/tax-records`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name,
          source,
          type,
          category,
          amount: amount ? Number.parseFloat(amount as string) : 0,
          date,
          frequency,
          endDate,
          notes,
          receiptFilename,
          receiptMimeType,
          receiptData,
        }),
      });
      if (!res.ok) throw new Error("Failed to create tax record");
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

      const res = await fetch(`${apiUrl}/tax-records/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          name,
          source,
          type,
          category,
          amount: amount ? Number.parseFloat(amount as string) : 0,
          date,
          frequency,
          endDate,
          notes,
          receiptFilename,
          receiptMimeType,
          receiptData,
        }),
      });
      if (!res.ok) throw new Error("Failed to update tax record");
    } else if (intent === "delete-transaction") {
      const id = formData.get("id");
      const res = await fetch(`${apiUrl}/tax-records/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken || "mock-session-token"}`,
        },
      });
      if (!res.ok) throw new Error("Failed to delete tax record");
    } else if (intent === "bulk-create-transactions") {
      const recordsJson = formData.get("records") as string;
      const capPreviousJson = formData.get("capPreviousRecordIds") as string | null;

      const records = recordsJson ? JSON.parse(recordsJson) : [];
      const capPreviousRecordIds = capPreviousJson ? JSON.parse(capPreviousJson) : [];

      const res = await fetch(`${apiUrl}/tax-records/bulk`, {
        method: "POST",
        headers,
        body: JSON.stringify({ records, capPreviousRecordIds }),
      });
      if (!res.ok) throw new Error("Failed to bulk create tax records");
    }
    return data({ success: true });
  } catch (error) {
    console.error("Action error in tax route:", error);
    return data({ success: false, error: (error as Error).message }, { status: 500 });
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
