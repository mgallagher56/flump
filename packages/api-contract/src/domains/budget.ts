import { z } from "zod";
import { Money, Notes } from "../primitives.js";

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

export const AddBudgetCategoryRequest = z.object({
  category: z.string().trim().min(1).max(64),
});
