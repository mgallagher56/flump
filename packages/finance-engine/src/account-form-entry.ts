/**
 * The add and edit account form on its own (`@flump/finance-engine/account-form`), for the mobile
 * app (E12 S8). Metro does not drop unused exports, so importing the package root bundles all of
 * it, including the tax vector catalogue. This entry reaches only what the account forms need;
 * `account-form-entry.test.ts` keeps the vectors out of it.
 */

export { isOwedAccountType } from "./account-balance.js";
export {
  ACCOUNT_FORM_TYPES,
  ACCOUNT_SUBTYPE_LABEL,
  type AccountFieldSet,
  type AccountFormFields,
  type AccountFormPrefill,
  type AccountFormState,
  type AccountRequest,
  accountBalanceShown,
  accountBalanceStored,
  accountFieldSet,
  accountFieldsFromValues,
  accountFormFromSaved,
  accountFormNeedsPlan,
  accountFormToSend,
  accountFormValues,
  accountRequestFrom,
  changedFields,
  INVESTMENT_SUBTYPE_OPTIONS,
  LOAN_SUBTYPE_OPTIONS,
  MORTGAGE_REPAYMENT_OPTIONS,
  MORTGAGE_SUBTYPE_OPTIONS,
  type MortgageLike,
  type MortgageLinkChoices,
  mortgageLinkChoices,
  newAccountForm,
  OWNERSHIP_OPTIONS,
  PROPERTY_SUBTYPE_OPTIONS,
  type PropertyPrefill,
  propertyPrefillFor,
  resolveSharePercent,
  SAVINGS_SUBTYPE_OPTIONS,
  type SavedAccountForForm,
  STUDENT_LOAN_PLAN_OPTIONS,
} from "./account-form.js";
export { typeChangeFlipsSign } from "./account-type-change.js";
export { isBuyToLetAccount } from "./buy-to-let.js";
export {
  type AccountOwnership,
  canAccountBeJoint,
  DEFAULT_JOINT_SHARE_PERCENT,
  describeJointLiabilityNotice,
  describeJointWholeValue,
} from "./joint-share.js";
