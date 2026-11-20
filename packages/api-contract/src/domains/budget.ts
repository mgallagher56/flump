import { z } from "zod";
import { IsoDateTime, Money, Notes, ResponseMoney, Uuid } from "../primitives.js";
import { AccountOwnership, SharePercent } from "./accounts.js";

export const BUDGET_FREQUENCIES = ["monthly", "annual", "weekly"] as const;
export const BudgetFrequency = z.enum(BUDGET_FREQUENCIES);

/** Budget categories stay open: web sends "living" and custom categories. */
export const BudgetCategory = z.string().trim().min(1).max(64);

/**
 * The saved fact a budget line is linked to (`budget_entries.link_kind`, system audit decision 1):
 * "take_home" (the profile's take-home pay), "housing" (the saved rent, mortgage payment or
 * household contribution), "savings" (one savings or investment account's monthly saving) or
 * "debt" (one card, loan or overdraft's monthly payment). A linked line's stored amount is never
 * read. "savings" and "debt" name their account in `linkAccountId`.
 */
export const BUDGET_ENTRY_LINK_KINDS = ["take_home", "housing", "savings", "debt"] as const;
export const BudgetEntryLinkKind = z.enum(BUDGET_ENTRY_LINK_KINDS);
export type BudgetEntryLinkKind = z.infer<typeof BudgetEntryLinkKind>;

const BUDGET_SHARE_DESCRIPTION =
  "Your share of a joint line, 1 to 99. Absent or null for a sole line, and for a line linked to take-home pay or an account, which takes its share from there.";

/**
 * A budget line's stored share (E34 C1, one home per value): 1 to 99 on a joint line. A line
 * linked to take-home pay, a savings account or a debt is always sole with no share.
 */
export const BudgetSharePercent = z
  .number()
  .int()
  .min(1)
  .max(99)
  .meta({ description: BUDGET_SHARE_DESCRIPTION });

/**
 * The share a request may send. Its bound stays at the accounts' 100 so older clients are not
 * broken by the wire contract; the server refuses 100 on a joint line (mark it sole instead), and
 * any share on a line linked to take-home pay or an account.
 */
const BudgetSharePercentRequest = SharePercent.meta({
  description: `${BUDGET_SHARE_DESCRIPTION} The server refuses 100 on a joint line: mark the line sole instead.`,
});

export const CreateBudgetEntryRequest = z.strictObject({
  category: BudgetCategory,
  name: z.string().trim().min(1).max(120).optional(),
  /** Deprecated alias for `name`, accepted for older clients. */
  title: z.string().trim().min(1).max(120).optional(),
  amount: Money,
  frequency: BudgetFrequency.optional(),
  isIncome: z.boolean().optional(),
  isEssential: z.boolean().optional(),
  notes: Notes.nullish(),
  /**
   * E34 C1: joint without a share stores 50; sole stores no share. A line linked to take-home pay
   * or an account is always sole and refuses a share of its own.
   */
  ownership: AccountOwnership.optional(),
  sharePercent: BudgetSharePercentRequest.nullish(),
  /**
   * Create the line linked to a saved fact ("Add your take-home pay"): its stored amount is set to
   * 0 and never read. Null or omitted for an ordinary line.
   */
  linkKind: BudgetEntryLinkKind.nullable().optional(),
  /**
   * The caller's own account a "savings" or "debt" line reads. Required with those kinds and
   * refused with any other; another user's account id is refused as not found.
   */
  linkAccountId: Uuid.nullable().optional(),
});
export type CreateBudgetEntryRequest = z.infer<typeof CreateBudgetEntryRequest>;

export const UpdateBudgetEntryRequest = z.strictObject({
  category: BudgetCategory.optional(),
  name: z.string().trim().min(1).max(120).optional(),
  title: z.string().trim().min(1).max(120).optional(),
  amount: Money.optional(),
  frequency: BudgetFrequency.optional(),
  isIncome: z.boolean().optional(),
  isEssential: z.boolean().optional(),
  notes: Notes.nullish(),
  /** Omitted ownership and share stay as saved. */
  ownership: AccountOwnership.optional(),
  sharePercent: BudgetSharePercentRequest.nullish(),
  /**
   * Link the row to a saved fact (its stored amount is then set to 0 and never read), or null to
   * unlink it: send the figure the row keeps as `amount` with the null.
   */
  linkKind: BudgetEntryLinkKind.nullable().optional(),
  /**
   * The account a "savings" or "debt" line reads; null (with `linkKind: null`) to unlink. Only the
   * caller's own savings or debt account is accepted.
   */
  linkAccountId: Uuid.nullable().optional(),
});
export type UpdateBudgetEntryRequest = z.infer<typeof UpdateBudgetEntryRequest>;

/** Most custom budget categories one user may keep (audit L2), and the longest name. */
export const MAX_CUSTOM_BUDGET_CATEGORIES = 50;
export const MAX_BUDGET_CATEGORY_NAME_LENGTH = 64;

/**
 * `POST budget-entries/categories`. The handler also refuses a new category once the user has
 * MAX_CUSTOM_BUDGET_CATEGORIES (400), since the count depends on stored data.
 */
export const AddBudgetCategoryRequest = z.strictObject({
  category: z.string().trim().min(1).max(MAX_BUDGET_CATEGORY_NAME_LENGTH),
});
export type AddBudgetCategoryRequest = z.infer<typeof AddBudgetCategoryRequest>;

/**
 * A budget entry as the client receives it: every `budget_entries` column, dates as ISO strings.
 * `userId` is the caller's own id (every read is scoped to it). `amount` is a number (B-05).
 */
export const BudgetEntryDto = z.strictObject({
  id: Uuid,
  userId: z.string(),
  category: z.string(),
  name: z.string(),
  amount: ResponseMoney,
  frequency: BudgetFrequency,
  isIncome: z.boolean(),
  isPrimaryIncome: z.boolean(),
  isEssential: z.boolean(),
  notes: z.string().nullable(),
  isDefault: z.boolean(),
  /** E34 C1: "sole" or "joint"; rows from before the columns existed read as sole. */
  ownership: AccountOwnership.default("sole"),
  /** The user's share (1-99) of a joint entry; null when sole or linked to take-home pay or an account. */
  sharePercent: BudgetSharePercent.nullable().default(null),
  /**
   * The saved fact the row is linked to, or null; rows from before the column read null. When set,
   * `amount` is a stored 0 that is never read: the engine resolves the line.
   */
  linkKind: BudgetEntryLinkKind.nullable().default(null),
  /**
   * The account a "savings" or "debt" line reads, or null (also once that account is deleted, when
   * the line reads "Not set"). Rows from before the column read null.
   */
  linkAccountId: Uuid.nullable().default(null),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type BudgetEntryDto = z.infer<typeof BudgetEntryDto>;

/** `GET budget-entries`. */
export const BudgetEntryListResponse = z.array(BudgetEntryDto);
export type BudgetEntryListResponse = z.infer<typeof BudgetEntryListResponse>;

/** `POST budget-entries` and `PATCH budget-entries/:id`. */
export const BudgetEntryResponse = BudgetEntryDto;
export type BudgetEntryResponse = z.infer<typeof BudgetEntryResponse>;

/** `POST budget-entries/categories`: the user's custom categories after the add (lower-cased). */
export const AddBudgetCategoryResponse = z.strictObject({
  success: z.literal(true),
  categories: z.array(z.string()),
});
export type AddBudgetCategoryResponse = z.infer<typeof AddBudgetCategoryResponse>;

/** `DELETE budget-entries/:id`. */
export const DeleteBudgetEntryResponse = z.strictObject({ success: z.literal(true) });
export type DeleteBudgetEntryResponse = z.infer<typeof DeleteBudgetEntryResponse>;
