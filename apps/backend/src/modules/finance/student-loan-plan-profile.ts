import type { EntityManager } from "typeorm";
import {
  STUDENT_LOAN_PLANS,
  type StudentLoanPlan,
  UserProfile,
} from "../../entities/user-profile.entity";

// System audit slice 6 (PP-7, DB-7, link L30): the profile's `student_loan_plans` is the one home
// for the student loan plan, the fact take-home reads. A Student Loan account also asks for its
// plan (`accounts.student_loan_plan`, kept for the payoff until slice 9). Saving such an account
// writes its plan to the profile when the profile has none, so the user is never asked twice.

const isPlan = (value: unknown): value is StudentLoanPlan =>
  typeof value === "string" && (STUDENT_LOAN_PLANS as readonly string[]).includes(value);

/**
 * The profile's plans after a Student Loan account with `accountPlan` is saved, or undefined
 * when the profile stays as it is.
 * - The profile has none (never answered, null; or said no loan, []): the account's plan. Adding a
 *   loan account is the newer answer than an earlier "no student loan".
 * - The profile already holds a plan: unchanged, even a different one. The profile is the home
 *   the user edits; an account never overwrites it.
 * - Not a Student Loan account, or no valid plan on it: unchanged.
 */
export function profilePlansAfterAccountWrite(
  profilePlans: readonly string[] | null | undefined,
  accountType: string | null | undefined,
  accountPlan: string | null | undefined,
): StudentLoanPlan[] | undefined {
  if (accountType !== "Student Loan" || !isPlan(accountPlan)) return undefined;
  if (profilePlans && profilePlans.length > 0) return undefined;
  return [accountPlan];
}

/**
 * Applies profilePlansAfterAccountWrite inside the account write's transaction (`manager`), so
 * the account and the profile change together or not at all. It is one conditional UPDATE: the
 * "profile has none" test is in its WHERE, so a Settings save landing at the same moment is never
 * overwritten (no read then write). A user with no profile row matches nothing and gets none: the
 * profile is created on first read, with the plan still on the account. `student_loan_plans` is a
 * simple-array: null is not answered and '' is "no student loan".
 */
export async function writeStudentLoanPlanToProfile(
  manager: EntityManager,
  userId: string,
  account: { type: string; studentLoanPlan: string | null },
): Promise<void> {
  const next = profilePlansAfterAccountWrite(null, account.type, account.studentLoanPlan);
  if (!next) return;
  await manager
    .getRepository(UserProfile)
    .createQueryBuilder()
    .update(UserProfile)
    .set({ studentLoanPlans: next })
    .where("user_id = :userId", { userId })
    .andWhere("(student_loan_plans IS NULL OR student_loan_plans = '')")
    .execute();
}
