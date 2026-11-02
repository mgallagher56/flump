import { atom, useAtom } from "jotai";
import { useCallback } from "react";
import { useRouteLoaderData } from "react-router";

export interface UserProfile {
  id: string;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  currency: string;
  country: string;
  employmentType: "employed" | "self-employed" | "other" | null;
  annualSalary: number | null;
  monthlyTakeHome: number | null;
  hasSecondIncome: boolean;
  secondIncomeMonthly: number | null;
  hasRentalIncome: boolean;
  rentalIncomeMonthly: number | null;
  hasMortgage: boolean;
  propertyOwnershipShare: number;
  pensionPercent: number;
  pensionEmployerPercent: number;
  isSalarySacrifice: boolean;
  monthlySavingsTarget: number | null;
  savingsAllocationMode: "total" | "per_account";
  savingsDefaultInterestRate: number;
  setupChecklistCompletedSteps: string[];
  createdAt: string;
  updatedAt: string;
}

export type UserProfileUpdate = Partial<
  Omit<UserProfile, "id" | "userId" | "createdAt" | "updatedAt">
>;

export const DEFAULT_PROFILE: UserProfile = {
  id: "",
  userId: "",
  displayName: null,
  avatarUrl: null,
  currency: "GBP",
  country: "GB",
  employmentType: null,
  annualSalary: null,
  monthlyTakeHome: null,
  hasSecondIncome: false,
  secondIncomeMonthly: null,
  hasRentalIncome: false,
  rentalIncomeMonthly: null,
  hasMortgage: false,
  propertyOwnershipShare: 100.0,
  pensionPercent: 5.0,
  pensionEmployerPercent: 3.0,
  isSalarySacrifice: true,
  monthlySavingsTarget: null,
  savingsAllocationMode: "per_account",
  savingsDefaultInterestRate: 5.0,
  setupChecklistCompletedSteps: [],
  createdAt: "",
  updatedAt: "",
};

export const normalizeProfile = (p: Partial<UserProfile>): UserProfile => ({
  ...DEFAULT_PROFILE,
  ...p,
  avatarUrl: p.avatarUrl !== undefined ? p.avatarUrl : DEFAULT_PROFILE.avatarUrl,
  annualSalary:
    p.annualSalary !== null && p.annualSalary !== undefined ? Number(p.annualSalary) : null,
  monthlyTakeHome:
    p.monthlyTakeHome !== null && p.monthlyTakeHome !== undefined
      ? Number(p.monthlyTakeHome)
      : null,
  secondIncomeMonthly:
    p.secondIncomeMonthly !== null && p.secondIncomeMonthly !== undefined
      ? Number(p.secondIncomeMonthly)
      : null,
  rentalIncomeMonthly:
    p.rentalIncomeMonthly !== null && p.rentalIncomeMonthly !== undefined
      ? Number(p.rentalIncomeMonthly)
      : null,
  propertyOwnershipShare:
    p.propertyOwnershipShare !== null && p.propertyOwnershipShare !== undefined
      ? Number(p.propertyOwnershipShare)
      : 100.0,
  pensionPercent:
    p.pensionPercent !== null && p.pensionPercent !== undefined ? Number(p.pensionPercent) : 5.0,
  pensionEmployerPercent:
    p.pensionEmployerPercent !== null && p.pensionEmployerPercent !== undefined
      ? Number(p.pensionEmployerPercent)
      : 3.0,
  monthlySavingsTarget:
    p.monthlySavingsTarget !== null && p.monthlySavingsTarget !== undefined
      ? Number(p.monthlySavingsTarget)
      : null,
  savingsDefaultInterestRate:
    p.savingsDefaultInterestRate !== null && p.savingsDefaultInterestRate !== undefined
      ? Number(p.savingsDefaultInterestRate)
      : 5.0,
});

export const userProfileAtom = atom<UserProfile>(DEFAULT_PROFILE);

/**
 * Hook to access and update the global user profile.
 * The profile is fetched once via the loader and set into the atom.
 * Components can read and mutate profile data through this hook.
 */
export function useUserProfile() {
  const [profile, rawSetProfile] = useAtom(userProfileAtom);
  let rootData: { accessToken?: string | null } | undefined;
  try {
    // biome-ignore lint/correctness/useHookAtTopLevel: fallback when rendered outside DataRouter in unit tests
    rootData = useRouteLoaderData<{ accessToken?: string | null }>("root");
  } catch {
    rootData = undefined;
  }
  const accessToken = rootData?.accessToken;
  const authHeader = `Bearer ${accessToken || "mock-session-token"}`;

  const setProfile = useCallback(
    (p: UserProfile | Partial<UserProfile>) => {
      rawSetProfile(normalizeProfile(p));
    },
    [rawSetProfile],
  );

  const updateProfile = useCallback(
    async (updates: UserProfileUpdate): Promise<void> => {
      const apiUrl =
        (window as Window & { ENV?: { VITE_API_URL?: string } }).ENV?.VITE_API_URL ??
        import.meta.env.VITE_API_URL ??
        "http://localhost:4000";
      const res = await fetch(`${apiUrl}/user-profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      const updated = (await res.json()) as UserProfile;
      setProfile(updated);
    },
    [setProfile, authHeader],
  );

  const markChecklistStep = useCallback(
    async (step: string, completed: boolean): Promise<void> => {
      const apiUrl =
        (window as Window & { ENV?: { VITE_API_URL?: string } }).ENV?.VITE_API_URL ??
        import.meta.env.VITE_API_URL ??
        "http://localhost:4000";
      const res = await fetch(`${apiUrl}/user-profile/checklist`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({ step, completed }),
      });
      if (!res.ok) throw new Error("Failed to update checklist");
      const updated = (await res.json()) as UserProfile;
      setProfile(updated);
    },
    [setProfile, authHeader],
  );

  return { profile, setProfile, updateProfile, markChecklistStep };
}
