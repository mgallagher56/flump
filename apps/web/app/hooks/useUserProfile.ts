import { atom, useAtom } from "jotai";
import { useCallback } from "react";

export interface UserProfile {
  id: string;
  userId: string;
  displayName: string | null;
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
  pensionPercent: number;
  isSalarySacrifice: boolean;
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
  pensionPercent: 5.0,
  isSalarySacrifice: true,
  setupChecklistCompletedSteps: [],
  createdAt: "",
  updatedAt: "",
};

export const userProfileAtom = atom<UserProfile>(DEFAULT_PROFILE);

/**
 * Hook to access and update the global user profile.
 * The profile is fetched once via the loader and set into the atom.
 * Components can read and mutate profile data through this hook.
 */
export function useUserProfile() {
  const [profile, setProfile] = useAtom(userProfileAtom);

  const updateProfile = useCallback(
    async (updates: UserProfileUpdate): Promise<void> => {
      const apiUrl =
        (window as Window & { ENV?: { VITE_API_URL?: string } }).ENV?.VITE_API_URL ??
        "http://localhost:4000";
      const res = await fetch(`${apiUrl}/user-profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer mock-session-token",
        },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      const updated = (await res.json()) as UserProfile;
      setProfile(updated);
    },
    [setProfile],
  );

  const markChecklistStep = useCallback(
    async (step: string, completed: boolean): Promise<void> => {
      const apiUrl =
        (window as Window & { ENV?: { VITE_API_URL?: string } }).ENV?.VITE_API_URL ??
        "http://localhost:4000";
      const res = await fetch(`${apiUrl}/user-profile/checklist`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer mock-session-token",
        },
        body: JSON.stringify({ step, completed }),
      });
      if (!res.ok) throw new Error("Failed to update checklist");
      const updated = (await res.json()) as UserProfile;
      setProfile(updated);
    },
    [setProfile],
  );

  return { profile, setProfile, updateProfile, markChecklistStep };
}
