import {
  AccountListResponse,
  TaxRecordListResponse,
  UserProfileResponse,
} from "@flump/api-contract";
import type { MtdIncomeTaxPosition } from "@flump/finance-engine";
import { backendFetch, backendFetchAll } from "~/services/backend-client.server";
import { mtdNoticePosition } from "./mtdNotice";

/**
 * The Making Tax Digital position for a page that does not load tax records itself (Invoicing).
 * Reads tax records and the profile, and accounts only when a rental record needs its share. The
 * line is optional, so any failure gives no line rather than failing the page.
 */
export async function loadMtdNoticePosition(
  accessToken: string,
  signal: AbortSignal,
  today: string,
): Promise<MtdIncomeTaxPosition> {
  try {
    const [records, profile] = await Promise.all([
      backendFetchAll("/tax-records", { accessToken, signal, schema: TaxRecordListResponse }),
      backendFetch("/user-profile", { accessToken, signal, schema: UserProfileResponse }),
    ]);
    const accounts = records.some((r) => r.source === "rental")
      ? await backendFetchAll("/accounts", { accessToken, signal, schema: AccountListResponse })
      : [];
    return mtdNoticePosition({
      // The contract leaves the optional dates out; the engine reads a missing one as null.
      records: records.map((r) => ({ ...r, endDate: r.endDate ?? null, notes: r.notes ?? null })),
      employmentType: profile?.employmentType ?? null,
      accounts,
      today,
    });
  } catch {
    return { kind: "none" };
  }
}
