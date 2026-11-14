import { useState } from "react";
import { useNavigate } from "react-router";
import { useUserProfile } from "~/hooks/useUserProfile";
import { draftFromValues, SAVE_AND_EXIT_ERROR, SAVE_AND_EXIT_PATH } from "./draft";
import type { OnboardingValues } from "./types";

/** "Save and exit": keeps the answers given so far on the profile, then leaves setup. */
export function useSaveAndExit(values: OnboardingValues) {
  const navigate = useNavigate();
  const { updateProfile } = useUserProfile();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveAndExit = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      await updateProfile(draftFromValues(values));
      navigate(SAVE_AND_EXIT_PATH);
    } catch {
      setError(SAVE_AND_EXIT_ERROR);
      setIsSaving(false);
    }
  };

  return { saveAndExit, isSaving, error };
}
