// @vitest-environment node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MORTGAGE_NOT_LINKED_NOTICE } from "~/routes/app.accounts._index";
import type { BackendErrorKind } from "~/services/backend-error";
import { CONFLICT_MESSAGE } from "~/services/conflict";
import { QUICK_BALANCE_COPY } from "./components/QuickBalanceUpdate/QuickBalanceUpdate";

/**
 * The mobile app's add, edit and delete forms say what web's say (E12 S8, plan 9.9b). The app keeps
 * its words in `apps/mobile/src/copy/accountForms.ts`. Most of web's are written inline in the
 * dialog, so each is found in the dialog's own source; the rest are web's exported constants and
 * its i18n strings. Mobile-only words (the field errors) have no web equivalent and are not here.
 */
const MOBILE_SRC = new URL("../../../../mobile/src/", import.meta.url);

interface MobileForms {
  ACCOUNT_FORM: Record<string, string>;
  saveFailedMessage(kind: string): string;
  DELETE_ACCOUNT: {
    title(name: string): string;
    consequence: string;
    confirm(name: string): string;
    fallbackName: string;
  };
  QUICK_BALANCE: Record<string, string>;
}

const load = async () =>
  (await import(
    /* @vite-ignore */ fileURLToPath(new URL("copy/accountForms.ts", MOBILE_SRC))
  )) as MobileForms;

/** A web source file with its whitespace collapsed, so a string split over lines still matches. */
const source = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8").replace(/\s+/g, " ");

const DIALOG = source("../../components/dialogs/addEditAccountsDialog/AddEditAccountsDialog.tsx");
const JOINT = source("./components/JointOwnershipFields/JointOwnershipFields.tsx");
const ROUTE_ERRORS = source("../../services/route-error.server.ts");
const COMMON = JSON.parse(
  readFileSync(new URL("../../../public/locales/en/common.json", import.meta.url), "utf8"),
) as Record<string, string>;

describe("the mobile account forms say what web's say", () => {
  it("the titles and buttons are web's i18n strings", async () => {
    const { ACCOUNT_FORM } = await load();
    expect(ACCOUNT_FORM.addTitle).toBe(COMMON.addAccount);
    expect(ACCOUNT_FORM.editTitle).toBe(COMMON.editAccount);
    expect(ACCOUNT_FORM.edit).toBe(COMMON.edit);
    expect(ACCOUNT_FORM.save).toBe(COMMON.save);
    expect(ACCOUNT_FORM.delete).toBe(COMMON.delete);
  });

  it.each([
    "cancel",
    "name",
    "accountType",
    "balance",
    "owed",
    "notSet",
    "repaymentPlan",
    "choosePlan",
    "planRequired",
    "typeFlipsSign",
    "becomesSole",
    "repaid",
    "yearsLeft",
    "months",
    "fixedRateEnds",
    "whichProperty",
    "notLinked",
    "propertyFallback",
    "homeValue",
    "propertyValue",
    "homeValueHint",
    "propertyValueHint",
    "creditLimit",
    "creditLimitHint",
    "promoEnds",
    "promoEndsHint",
  ])("%s is written in web's dialog", async (key) => {
    const { ACCOUNT_FORM } = await load();
    const words = ACCOUNT_FORM[key];
    expect(words).toBeTruthy();
    expect(DIALOG).toContain(words);
  });

  it("ownership and share are web's JointOwnershipFields labels", async () => {
    const { ACCOUNT_FORM } = await load();
    expect(JOINT).toContain(`label="${ACCOUNT_FORM.ownership}"`);
    expect(JOINT).toContain(`label="${ACCOUNT_FORM.yourShare}"`);
  });

  it("the notices are web's constants", async () => {
    const { ACCOUNT_FORM } = await load();
    expect(ACCOUNT_FORM.conflict).toBe(CONFLICT_MESSAGE);
    expect(ACCOUNT_FORM.mortgageNotLinked).toBe(MORTGAGE_NOT_LINKED_NOTICE);
  });

  it.each([
    "unavailable",
    "server",
    "bad-response",
    "not-found",
    "forbidden",
    "not-invited",
    "rate-limited",
    "client",
    "unauthorised",
  ] satisfies BackendErrorKind[])(
    "a failed save (%s) says what web's action says",
    async (kind) => {
      const { saveFailedMessage } = await load();
      const words = saveFailedMessage(kind);
      // Web's map keys: a quoted key where it has a hyphen. Collapsed whitespace, as `source` gives.
      const key = kind.includes("-") ? `"${kind}"` : kind;
      expect(
        ROUTE_ERRORS.includes(`${key}: "${words}"`) || ROUTE_ERRORS.includes(`${key}: "${words}",`),
      ).toBe(true);
    },
  );

  it("a kind this version does not know reads as web's server failure", async () => {
    const { saveFailedMessage } = await load();
    expect(saveFailedMessage("something-new")).toBe(saveFailedMessage("server"));
  });

  it("the delete question, its consequence and its button are web's", async () => {
    const { DELETE_ACCOUNT } = await load();
    expect(DIALOG).toContain("`Delete ${deleteName}?`");
    expect(DELETE_ACCOUNT.title("Holiday fund")).toBe("Delete Holiday fund?");
    expect(DIALOG).toContain("{`Delete ${deleteName}`}");
    expect(DELETE_ACCOUNT.confirm("Holiday fund")).toBe("Delete Holiday fund");
    expect(DIALOG).toContain(DELETE_ACCOUNT.consequence);
    expect(DIALOG).toContain(`selectedAccount.name || "${DELETE_ACCOUNT.fallbackName}"`);
  });

  it("the quick balance update is web's", async () => {
    const { QUICK_BALANCE } = await load();
    expect(QUICK_BALANCE).toEqual({
      openBalance: QUICK_BALANCE_COPY.openBalance,
      openOwed: QUICK_BALANCE_COPY.openOwed,
      fieldBalance: QUICK_BALANCE_COPY.fieldBalance,
      fieldOwed: QUICK_BALANCE_COPY.fieldOwed,
      save: QUICK_BALANCE_COPY.save,
      saving: QUICK_BALANCE_COPY.saving,
      cancel: QUICK_BALANCE_COPY.cancel,
    });
  });
});
