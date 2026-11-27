/**
 * The words of adding, changing and deleting an account (E12 S8, plan 9.9b), copied from web so
 * both apps say the same: `AddEditAccountsDialog`, `JointOwnershipFields`, `QuickBalanceUpdate`,
 * the accounts route actions and `route-error.server.ts`. The labels that change with the account
 * type (kind, rate, monthly amount) come from the engine's shared field set, not from here. Web's
 * `accountFormCopyParity.test.ts` pins each web string here to web's own.
 *
 * Mobile-only words are marked: web's number boxes refuse a figure outside their bounds as it is
 * typed, so web never needs to say so; the phone's boxes take any text, so the form says what to
 * change, plainly, under the field.
 */
export const ACCOUNT_FORM = {
  /** Web's `t("addAccount")`: the add form's title and its save button. */
  addTitle: "Add account",
  /** Web's `t("editAccount")`. */
  editTitle: "Edit account",
  /** Web's `t("edit")`: the account page's way into the form. */
  edit: "Edit",
  save: "Save",
  saving: "Saving",
  cancel: "Cancel",
  delete: "Delete",
  name: "Name",
  accountType: "Account type",
  balance: "Balance",
  owed: "Amount owed",
  notSet: "Not set",
  repaymentPlan: "Repayment plan",
  choosePlan: "Choose a plan",
  planRequired: "Choose a repayment plan",
  typeFlipsSign:
    "This turns the debt into something you own, so net worth this month and in every past month rises by twice its balance.",
  becomesSole: "An ISA or pension is held in one name, so this account will be saved as sole.",
  ownership: "Ownership",
  yourShare: "Your share",
  repaid: "How it is repaid (optional)",
  yearsLeft: "Years left (optional)",
  months: "Months",
  fixedRateEnds: "Fixed rate ends (optional)",
  whichProperty: "Which property is this mortgage on",
  notLinked: "Not linked",
  /** Web's fallback name for a property with none. */
  propertyFallback: "Property",
  homeValue: "What your home is worth (optional)",
  propertyValue: "What the property is worth (optional)",
  /** Web's InfoTip text, shown here as the field's hint. */
  homeValueHint:
    "Your own estimate. We add it as your home, so you do not need a separate property account.",
  propertyValueHint: "Your own estimate. We add it as a rental property, linked to this mortgage.",
  creditLimit: "Credit limit (optional)",
  creditLimitHint: "Your card or overdraft limit, even if the balance is £0.",
  promoEnds: "0% interest period ends (optional)",
  promoEndsHint: "When any 0% promotional interest period ends.",
  /** Web's `MORTGAGE_NOT_LINKED_NOTICE`. */
  mortgageNotLinked:
    "We saved the property but could not link it to your mortgage. Edit the mortgage to choose it.",
  /** Web's `CONFLICT_MESSAGE`: refused with 412, the saved accounts read again. */
  conflict:
    "We did not save this because it was changed somewhere else. The latest version is now loaded. Check it and save again.",
} as const;

/** Web's `ACTION_MESSAGE_BY_KIND` (`route-error.server.ts`): what a failed save says. */
const SAVE_FAILED = {
  unavailable: "We could not reach Flump. Check your connection and try again.",
  server: "That did not work because of a problem on our side. Try again in a moment.",
  "bad-response": "That did not work because of a problem on our side. Try again in a moment.",
  "not-found": "We could not find that. It may have been deleted.",
  forbidden: "Your account does not have permission to do that.",
  "not-invited": "This account has not been invited to the Flump beta yet.",
  "rate-limited":
    "You have tried this a few times in a short while. Wait a little, then try again.",
  client: "We could not save that. Check the details and try again.",
  unauthorised: "Your session has ended. Sign in again.",
  /** Mobile only: a failure with no kind (no API client in a misconfigured build). */
  unknown: "That did not work because of a problem on our side. Try again in a moment.",
} as const;

/** What a failed save says for its kind; a kind this version does not know reads as unknown. */
export const saveFailedMessage = (kind: string): string =>
  (SAVE_FAILED as Readonly<Record<string, string>>)[kind] ?? SAVE_FAILED.unknown;

/** Web's delete confirmation: the dialog's title, its consequence and its button. */
export const DELETE_ACCOUNT = {
  title: (name: string) => `Delete ${name}?`,
  consequence: "Its balance history will be deleted too. This cannot be undone.",
  confirm: (name: string) => `Delete ${name}`,
  /** Web's name for an account with none. */
  fallbackName: "this account",
} as const;

/** Web's `QUICK_BALANCE_COPY`. */
export const QUICK_BALANCE = {
  openBalance: "Update balance",
  openOwed: "Update amount owed",
  fieldBalance: "New balance",
  fieldOwed: "Amount owed now",
  save: "Save",
  saving: "Saving…",
  cancel: "Cancel",
} as const;

/** Mobile only: what to change in a field, under it, before anything is sent. */
export const FIELD_ERRORS = {
  name: "Enter a name for this account.",
  balance: "Enter the balance. Use 0 if it is empty.",
  owed: "Enter the amount owed. Use 0 if nothing is owed.",
  amount: "Enter an amount in pounds, such as 250 or 250.50.",
  rate: "Enter a percentage from 0 to 100.",
  share: "Enter your share as a whole percentage from 1 to 99.",
  years: "Enter a number of years from 0 to 50.",
  months: "Enter a number of months from 0 to 11.",
  date: "Enter a real date, such as 31 3 2027.",
} as const;

/** Mobile only: the line at the top of the form when a field needs changing. */
export const FIX_FIELDS = "Some details need changing. Each one says what to change.";
