import { z } from "zod";
import { IsoDateTime, Money, Notes, Uuid } from "../primitives.js";

export const BUDGET_FREQUENCIES = ["monthly", "annual", "weekly"] as const;
export const BudgetFrequency = z.enum(BUDGET_FREQUENCIES);

/** Budget categories stay open: web sends "living" and custom categories. */
export const BudgetCategory = z.string().trim().min(1).max(64);

export const CreateBudgetEntryRequest = z.object({
  category: BudgetCategory,
  name: z.string().trim().min(1).max(120).optional(),
  /** Deprecated alias for `name`, accepted for older clients. */
  title: z.string().trim().min(1).max(120).optional(),
  amount: Money,
  frequency: BudgetFrequency.optional(),
  isIncome: z.boolean().optional(),
  isEssential: z.boolean().optional(),
  notes: Notes.nullish(),
});

export const UpdateBudgetEntryRequest = z.object({
  category: BudgetCategory.optional(),
  name: z.string().trim().min(1).max(120).optional(),
  title: z.string().trim().min(1).max(120).optional(),
  amount: Money.optional(),
  frequency: BudgetFrequency.optional(),
  isIncome: z.boolean().optional(),
  isEssential: z.boolean().optional(),
  notes: Notes.nullish(),
});

/** Most custom budget categories one user may keep (audit L2), and the longest name. */
export const MAX_CUSTOM_BUDGET_CATEGORIES = 50;
export const MAX_BUDGET_CATEGORY_NAME_LENGTH = 64;

/**
 * `POST budget-entries/categories`. The handler also refuses a new category once the user has
 * MAX_CUSTOM_BUDGET_CATEGORIES (400), since the count depends on stored data.
 */
export const AddBudgetCategoryRequest = z.object({
  category: z.string().trim().min(1).max(MAX_BUDGET_CATEGORY_NAME_LENGTH),
});

/**
 * A budget entry as the client receives it: every `budget_entries` column, dates as ISO strings.
 * `userId` is the caller's own id (every read is scoped to it). `amount` is a number (B-05).
 */
export const BudgetEntryDto = z.strictObject({
  id: Uuid,
  userId: z.string(),
  category: z.string(),
  name: z.string(),
  amount: z.number().finite(),
  frequency: BudgetFrequency,
  isIncome: z.boolean(),
  isPrimaryIncome: z.boolean(),
  isEssential: z.boolean(),
  notes: z.string().nullable(),
  isDefault: z.boolean(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type BudgetEntryDto = z.infer<typeof BudgetEntryDto>;

/** `GET budget-entries` and `POST budget-entries/seed-defaults` (the full list after seeding). */
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
