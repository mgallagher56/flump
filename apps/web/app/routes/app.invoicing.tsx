import {
  CreateInvoiceRequest,
  CreateWorkLogEntryRequest,
  DeleteInvoiceResponse,
  DeleteWorkLogEntryResponse,
  InvoiceListResponse,
  InvoiceResponse,
  InvoicingSettingsResponse,
  MarkInvoicePaidRequest,
  UpdateInvoiceRequest,
  UpdateInvoicingSettingsRequest,
  UpdateWorkLogEntryRequest,
  WorkLogEntryListResponse,
  WorkLogEntryResponse,
} from "@flump/api-contract";
import type { ReactElement } from "react";
import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
  useFetcher,
  useLoaderData,
} from "react-router";
import { InvoicingWorkspace } from "~/features/invoicing/components/InvoicingWorkspace";
import { backendFetch } from "~/services/backend-client.server";
import { ifMatchFromForm, revalidateOnConflict } from "~/services/conflict";
import { actionErrorResponse, throwRouteError } from "~/services/route-error.server";
import { getAuthSession, requireAccessToken } from "~/utils/auth.server";

export const meta: MetaFunction = () => [{ title: "Work log and invoicing | Flump" }];

export const shouldRevalidate = revalidateOnConflict;

export const loader = async (args: LoaderFunctionArgs) => {
  const { accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  const token = requireAccessToken({ accessToken });

  const [settingsRes, workLogsRes, invoicesRes] = await Promise.all([
    backendFetch("/invoicing/settings", {
      schema: InvoicingSettingsResponse,
      accessToken: token,
      method: "GET",
    }).catch(throwRouteError),
    backendFetch("/work-logs", {
      schema: WorkLogEntryListResponse,
      accessToken: token,
      method: "GET",
    }).catch(throwRouteError),
    backendFetch("/invoices", {
      schema: InvoiceListResponse,
      accessToken: token,
      method: "GET",
    }).catch(throwRouteError),
  ]);

  const settings = settingsRes.settings;
  const settingsEtag = settings.updatedAt ? `"${settings.updatedAt}"` : null;

  return {
    settings,
    settingsEtag,
    workLogs: workLogsRes.entries,
    invoices: invoicesRes.invoices,
  };
};

function parseJsonPayload(formData: FormData): unknown {
  const raw = formData.get("payload");
  return typeof raw === "string" && raw.trim() !== "" ? JSON.parse(raw) : {};
}

export const action = async (args: ActionFunctionArgs) => {
  const { accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  const token = requireAccessToken({ accessToken });
  const formData = await args.request.formData();
  const intent = String(formData.get("intent") ?? "");
  const id = String(formData.get("id") ?? "");

  try {
    switch (intent) {
      case "update-settings": {
        const parsed = UpdateInvoicingSettingsRequest.parse(parseJsonPayload(formData));
        const result = await backendFetch("/invoicing/settings", {
          schema: InvoicingSettingsResponse,
          accessToken: token,
          method: "PATCH",
          body: parsed,
          ifMatch: ifMatchFromForm(formData),
        });
        return { ok: true as const, settings: result.settings };
      }
      case "create-work-log": {
        const parsed = CreateWorkLogEntryRequest.parse(parseJsonPayload(formData));
        const result = await backendFetch("/work-logs", {
          schema: WorkLogEntryResponse,
          accessToken: token,
          method: "POST",
          body: parsed,
        });
        return { ok: true as const, entry: result.entry };
      }
      case "update-work-log": {
        const parsed = UpdateWorkLogEntryRequest.parse(parseJsonPayload(formData));
        const result = await backendFetch(`/work-logs/${encodeURIComponent(id)}`, {
          schema: WorkLogEntryResponse,
          accessToken: token,
          method: "PATCH",
          body: parsed,
          ifMatch: ifMatchFromForm(formData),
        });
        return { ok: true as const, entry: result.entry };
      }
      case "delete-work-log": {
        const result = await backendFetch(`/work-logs/${encodeURIComponent(id)}`, {
          schema: DeleteWorkLogEntryResponse,
          accessToken: token,
          method: "DELETE",
        });
        return { ok: true as const, deletedId: result.id };
      }
      case "create-invoice": {
        const parsed = CreateInvoiceRequest.parse(parseJsonPayload(formData));
        const result = await backendFetch("/invoices", {
          schema: InvoiceResponse,
          accessToken: token,
          method: "POST",
          body: parsed,
        });
        return { ok: true as const, invoice: result.invoice };
      }
      case "update-invoice": {
        const parsed = UpdateInvoiceRequest.parse(parseJsonPayload(formData));
        const result = await backendFetch(`/invoices/${encodeURIComponent(id)}`, {
          schema: InvoiceResponse,
          accessToken: token,
          method: "PATCH",
          body: parsed,
          ifMatch: ifMatchFromForm(formData),
        });
        return { ok: true as const, invoice: result.invoice };
      }
      case "delete-invoice": {
        const result = await backendFetch(`/invoices/${encodeURIComponent(id)}`, {
          schema: DeleteInvoiceResponse,
          accessToken: token,
          method: "DELETE",
        });
        return { ok: true as const, deletedId: result.id };
      }
      case "issue-invoice": {
        const result = await backendFetch(`/invoices/${encodeURIComponent(id)}/issue`, {
          schema: InvoiceResponse,
          accessToken: token,
          method: "POST",
          body: {},
          ifMatch: ifMatchFromForm(formData),
        });
        return { ok: true as const, invoice: result.invoice };
      }
      case "mark-invoice-paid": {
        const parsed = MarkInvoicePaidRequest.parse(parseJsonPayload(formData));
        const result = await backendFetch(`/invoices/${encodeURIComponent(id)}/mark-paid`, {
          schema: InvoiceResponse,
          accessToken: token,
          method: "POST",
          body: parsed,
          ifMatch: ifMatchFromForm(formData),
        });
        return { ok: true as const, invoice: result.invoice };
      }
      case "void-invoice": {
        const result = await backendFetch(`/invoices/${encodeURIComponent(id)}/void`, {
          schema: InvoiceResponse,
          accessToken: token,
          method: "POST",
          body: {},
          ifMatch: ifMatchFromForm(formData),
        });
        return { ok: true as const, invoice: result.invoice };
      }
      default: {
        throw new Error(`Unsupported invoicing action intent: ${intent}`);
      }
    }
  } catch (err) {
    return actionErrorResponse(err);
  }
};

export default function InvoicingRoute(): ReactElement {
  const loaderData = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const submitAction = (
    intent: string,
    options: { id?: string; payload?: unknown; ifMatch?: string | null } = {},
  ) => {
    const fd = new FormData();
    fd.set("intent", intent);
    if (options.id) fd.set("id", options.id);
    if (options.payload !== undefined) fd.set("payload", JSON.stringify(options.payload));
    if (options.ifMatch) fd.set("version", options.ifMatch.replace(/^"|"$/g, ""));
    fetcher.submit(fd, { method: "post" });
  };

  return (
    <InvoicingWorkspace
      key={loaderData.settingsEtag ?? "unsaved"}
      settings={loaderData.settings}
      settingsEtag={loaderData.settingsEtag}
      workLogs={loaderData.workLogs}
      invoices={loaderData.invoices}
      isSubmitting={fetcher.state !== "idle"}
      onCreateWorkLog={(payload) => submitAction("create-work-log", { payload })}
      onUpdateWorkLog={(id, payload, ifMatch) =>
        submitAction("update-work-log", { id, payload, ifMatch })
      }
      onDeleteWorkLog={(id) => submitAction("delete-work-log", { id })}
      onCreateInvoice={(payload) => submitAction("create-invoice", { payload })}
      onUpdateInvoice={(id, payload, ifMatch) =>
        submitAction("update-invoice", { id, payload, ifMatch })
      }
      onDeleteInvoice={(id) => submitAction("delete-invoice", { id })}
      onIssueInvoice={(id, ifMatch) => submitAction("issue-invoice", { id, ifMatch })}
      onMarkInvoicePaid={(id, payload, ifMatch) =>
        submitAction("mark-invoice-paid", { id, payload, ifMatch })
      }
      onVoidInvoice={(id, ifMatch) => submitAction("void-invoice", { id, ifMatch })}
      onUpdateSettings={(payload, ifMatch) => submitAction("update-settings", { payload, ifMatch })}
    />
  );
}
