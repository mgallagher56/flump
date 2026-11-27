/**
 * How the Profile page saves (E12 S9, plan 9.10), as web's Profile tab: every change saves at once.
 * While a save runs the control shows the new value; once it ends the control shows whatever the
 * profile query then holds: the saved answer, the old value after a failure, or the profile read
 * again after a 412. Each group says what went wrong in web's words; a save says "Saved".
 */
import { useCallback, useRef, useState } from "react";
import { SAVE } from "../../copy/settings";
import { type ProfileUpdate, useSaveProfile } from "../../data/profile";

/** The Profile page's groups, each with its own error line. */
type ProfileGroup = "details" | "netWorth" | "checkIn" | "sections";

export interface ProfileSaves {
  /** The values being saved, shown in place of the saved ones until the save ends. */
  readonly pending: Partial<ProfileUpdate>;
  /** Groups with a save running: their controls ignore presses until it ends (web's aria-disabled). */
  readonly busy: ReadonlySet<ProfileGroup>;
  /** What went wrong, per group. */
  readonly errors: Partial<Record<ProfileGroup, string>>;
  /** "Saved" after the latest save that worked, with a count so a second "Saved" is read again. */
  readonly toast: { readonly message: string; readonly count: number } | null;
  /**
   * Saves one change for a group. Resolves true when it was saved. `failedMessage` is the group's
   * own words for a failure (web's).
   */
  save(group: ProfileGroup, update: ProfileUpdate, failedMessage?: string): Promise<boolean>;
}

export function useProfileSaves(): ProfileSaves {
  const saveProfile = useSaveProfile();
  const [pending, setPending] = useState<Partial<ProfileUpdate>>({});
  const [busy, setBusy] = useState<ReadonlySet<ProfileGroup>>(new Set());
  const [errors, setErrors] = useState<Partial<Record<ProfileGroup, string>>>({});
  const [toast, setToast] = useState<ProfileSaves["toast"]>(null);
  const saved = useRef(0);

  const save = useCallback(
    async (group: ProfileGroup, update: ProfileUpdate, failedMessage: string = SAVE.failed) => {
      const keys = Object.keys(update) as (keyof ProfileUpdate)[];
      setPending((p) => ({ ...p, ...update }));
      setBusy((b) => new Set(b).add(group));
      setErrors(({ [group]: _cleared, ...rest }) => rest);
      const result = await saveProfile(update);
      setPending((p) => {
        const next = { ...p };
        for (const key of keys) delete next[key];
        return next;
      });
      setBusy((b) => {
        const next = new Set(b);
        next.delete(group);
        return next;
      });
      if (result === "saved") {
        saved.current += 1;
        setToast({ message: SAVE.saved, count: saved.current });
        return true;
      }
      setToast(null);
      setErrors((e) => ({ ...e, [group]: result === "conflict" ? SAVE.conflict : failedMessage }));
      return false;
    },
    [saveProfile],
  );

  return { pending, busy, errors, toast, save };
}
