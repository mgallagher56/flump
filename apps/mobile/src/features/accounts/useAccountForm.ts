/**
 * The add and edit forms' state (E12 S8, plan 9.9b), as web's `AddEditAccountsDialog` holds it:
 * the typed values, what the form opened with (an edit sends only what changed), the mortgage link
 * and home value, and one idempotency key per opening of the add form, so a retry after a timeout
 * never adds a second copy. Every rule comes from the engine's shared form logic; this hook keeps
 * the state, says what needs changing and runs the save or the delete.
 */
import {
  type AccountFormState,
  type AccountOwnership,
  accountFieldSet,
  accountFormFromSaved,
  DEFAULT_JOINT_SHARE_PERCENT,
  describeJointLiabilityNotice,
  describeJointWholeValue,
  isOwedAccountType,
  mortgageLinkChoices,
  newAccountForm,
  type PropertyPrefill,
  propertyPrefillFor,
  resolveSharePercent,
  type SavedAccountForForm,
  typeChangeFlipsSign,
} from "@flump/finance-engine/account-form";
import * as Crypto from "expo-crypto";
import { useCallback, useMemo, useState } from "react";
import { ACCOUNT_FORM, FIX_FIELDS, saveFailedMessage } from "../../copy/accountForms";
import { type AccountWriteResult, useAccountWrites } from "../../data/accountWrites";
import {
  type AccountFormErrors,
  type AccountFormField,
  buildAccountRequest,
  validateAccountForm,
} from "./accountFormModel";

/** An account as the list read it: the saved fields the form opens with, and its version. */
export type FormAccount = SavedAccountForForm & { id: string; updatedAt?: string | null };

export type AccountFormMode =
  | { kind: "add"; estimate?: boolean }
  | { kind: "edit"; account: FormAccount };

export interface UseAccountFormInput {
  mode: AccountFormMode;
  /** Every account, for the mortgage's property choice and the estimate's prefill. */
  accounts: readonly FormAccount[];
  /** Web's partner mode: ownership shows on sole and new accounts too. */
  partnerMode: boolean;
  /** After a save that landed. `notice`: what saved but left something out (web's toast). */
  onSaved(notice?: string): void;
  /** After the account was deleted. */
  onDeleted(): void;
}

const asText = (value: number | null): string => (value === null ? "" : String(value));

/** The add form's start: web's estimate prefill for "Add an estimate", else blank. */
function startFor(mode: AccountFormMode, prefill: PropertyPrefill | null): AccountFormState {
  if (mode.kind === "edit") return accountFormFromSaved(mode.account);
  if (!prefill) return newAccountForm();
  return newAccountForm({
    initialName: prefill.name,
    initialType: "Property",
    initialSubtype: prefill.subtype,
    initialOwnership: prefill.ownership,
    initialSharePercent: prefill.sharePercent,
  });
}

export function useAccountForm({
  mode,
  accounts,
  partnerMode,
  onSaved,
  onDeleted,
}: UseAccountFormInput) {
  const writes = useAccountWrites();
  const editing = mode.kind === "edit";
  // Taken once, when the form opens, as web's dialog takes its props on opening.
  const [prefill] = useState<PropertyPrefill | null>(() =>
    mode.kind === "add" && mode.estimate ? propertyPrefillFor(accounts) : null,
  );
  const [opened] = useState<AccountFormState>(() => startFor(mode, prefill));
  const [form, setForm] = useState<AccountFormState>(opened);
  const [requestKey] = useState(() => Crypto.randomUUID());
  const [linkTouched, setLinkTouched] = useState(false);
  const [homeValue, setHomeValue] = useState<number | null>(null);
  const [unread, setUnread] = useState<ReadonlySet<AccountFormField>>(new Set());
  const [errors, setErrors] = useState<AccountFormErrors>({});
  const [busy, setBusy] = useState<"saving" | "deleting" | null>(null);
  const [alert, setAlert] = useState<string | null>(null);

  const saved = mode.kind === "edit" ? mode.account : null;
  const fieldSet = accountFieldSet(form);
  const owed = isOwedAccountType(form.type);
  const startedJoint = saved?.ownership === "joint";
  // Web's rule: ownership shows where the account can be joint and partner mode is on, or the
  // account is already joint, or the form has made it joint.
  const showsJoint = fieldSet.joint && (partnerMode || startedJoint || form.ownership === "joint");
  const effectiveOwnership: AccountOwnership =
    fieldSet.joint && form.ownership === "joint" ? "joint" : "sole";
  const links = useMemo(
    () =>
      mortgageLinkChoices({
        state: form,
        accounts,
        savedLinkedAccountId: saved?.linkedAccountId ?? null,
        editing,
        linkTouched,
      }),
    [form, accounts, saved?.linkedAccountId, editing, linkTouched],
  );

  /** Sets one field that holds text or a choice. */
  const set = useCallback(
    <K extends keyof AccountFormState>(key: K, value: AccountFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  /** A typed figure: its value as text, and whether the control could read what was typed. */
  const setFigure = useCallback(
    (key: AccountFormField & keyof AccountFormState, value: number | null, text: string) => {
      setForm((prev) => ({ ...prev, [key]: asText(value) }));
      setUnread((prev) => {
        const next = new Set(prev);
        if (value === null && text.trim() !== "") next.add(key);
        else next.delete(key);
        return next;
      });
    },
    [],
  );

  /** A date: its ISO text, or blank, or unread while the boxes do not make a real date. */
  const setDate = useCallback(
    (
      key: "fixedRateEndDate" | "promoZeroPercentUntil",
      next: { iso: string | null; blank: boolean },
    ) => {
      setForm((prev) => ({ ...prev, [key]: next.iso ?? "" }));
      setUnread((prev) => {
        const out = new Set(prev);
        if (next.iso === null && !next.blank) out.add(key);
        else out.delete(key);
        return out;
      });
    },
    [],
  );

  const setShare = useCallback((value: number | null, text: string) => {
    setForm((prev) => ({ ...prev, sharePercent: value }));
    setUnread((prev) => {
      const next = new Set(prev);
      if (value === null && text.trim() !== "") next.add("sharePercent");
      else next.delete("sharePercent");
      return next;
    });
  }, []);

  const setHome = useCallback((value: number | null, text: string) => {
    setHomeValue(value);
    setUnread((prev) => {
      const next = new Set(prev);
      if (value === null && text.trim() !== "") next.add("homeValue");
      else next.delete("homeValue");
      return next;
    });
  }, []);

  /** A new type clears the kind, as web's select does. */
  const setType = useCallback((type: string) => {
    setForm((prev) => ({ ...prev, type, accountSubtype: "" }));
  }, []);

  const setOwnership = useCallback((ownership: AccountOwnership) => {
    setForm((prev) => ({
      ...prev,
      ownership,
      sharePercent: prev.sharePercent ?? DEFAULT_JOINT_SHARE_PERCENT,
    }));
  }, []);

  const chooseProperty = useCallback((id: string) => {
    setLinkTouched(true);
    setForm((prev) => ({ ...prev, linkedAccountId: id }));
  }, []);

  const fail = (result: Exclude<AccountWriteResult, { status: "saved" }>) => {
    if (result.status === "conflict") setAlert(ACCOUNT_FORM.conflict);
    else if (result.status === "failed") setAlert(saveFailedMessage(result.kind));
    else setAlert(saveFailedMessage("client"));
  };

  const save = useCallback(async () => {
    if (busy) return;
    const found = validateAccountForm({ state: form, editing, showsJoint, unread });
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setAlert(FIX_FIELDS);
      return;
    }
    setAlert(null);
    const request = buildAccountRequest({
      editing,
      opened,
      current: form,
      linkedAccountId: links.linkedAccountId,
      homeValue,
      showHomeValue: links.showHomeValue,
    });
    if (request.kind === "none") {
      onSaved();
      return;
    }
    setBusy("saving");
    const result =
      request.kind === "update" && saved
        ? await writes.update(saved.id, request.body, saved.updatedAt)
        : request.kind === "createWithProperty"
          ? await writes.createMortgageWithProperty(request.body, `${requestKey}:mortgage`)
          : await writes.create(
              request.body,
              `${requestKey}:${form.type === "Mortgage" ? "mortgage" : "account"}`,
            );
    if (result.status !== "saved") {
      setBusy(null);
      fail(result);
      return;
    }
    // "Add an estimate" for a mortgage with no property: link the mortgage to the new one, at the
    // mortgage's version. The property is kept either way; a failed link says so.
    const link = prefill?.linkMortgage;
    if (!editing && link && form.type === "Property" && result.id) {
      const linked = await writes.update(link.id, { linkedAccountId: result.id }, link.updatedAt);
      setBusy(null);
      onSaved(linked.status === "saved" ? undefined : ACCOUNT_FORM.mortgageNotLinked);
      return;
    }
    setBusy(null);
    onSaved();
  }, [
    busy,
    form,
    editing,
    showsJoint,
    unread,
    opened,
    links,
    homeValue,
    saved,
    writes,
    requestKey,
    prefill,
    onSaved,
  ]);

  const remove = useCallback(async () => {
    if (busy || !saved) return;
    setBusy("deleting");
    setAlert(null);
    const result = await writes.remove(saved.id);
    setBusy(null);
    if (result.status === "saved") onDeleted();
    else fail(result);
  }, [busy, saved, writes, onDeleted]);

  const resolvedShare = resolveSharePercent(effectiveOwnership, form.sharePercent);

  return {
    editing,
    form,
    fieldSet,
    owed,
    showsJoint,
    links,
    homeValue,
    errors,
    alert,
    busy,
    /** Web's note under ownership for a joint debt. */
    jointLiabilityNotice: describeJointLiabilityNotice({
      type: form.type,
      ownership: effectiveOwnership,
    }),
    /** Web's hint under the balance: a joint account's field holds the whole of it. */
    wholeBalanceHint: describeJointWholeValue(
      { type: form.type, ownership: effectiveOwnership, sharePercent: resolvedShare },
      owed ? "amount owed" : "balance",
    ),
    typeFlipsSign: editing && typeChangeFlipsSign(saved?.type, form.type),
    becomesSole: Boolean(startedJoint && !fieldSet.joint),
    set,
    setFigure,
    setDate,
    setShare,
    setHome,
    setType,
    setOwnership,
    chooseProperty,
    save,
    remove,
  };
}

export type AccountForm = ReturnType<typeof useAccountForm>;
