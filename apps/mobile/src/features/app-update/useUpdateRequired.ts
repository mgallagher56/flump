import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import type { UpdateCheck } from "../../data/clientPolicy";

/**
 * Runs the version gate on launch and each time the app returns to the foreground (plan section
 * 4.9). With no check (a misconfigured build) it never blocks. A late answer from an earlier check
 * never overwrites a newer one.
 */
export function useUpdateRequired(check: UpdateCheck | undefined): {
  required: boolean;
  recheck(): void;
} {
  const [required, setRequired] = useState(false);
  const latest = useRef(0);

  const recheck = useCallback(() => {
    if (!check) return;
    latest.current += 1;
    const mine = latest.current;
    void check().then((answer) => {
      if (mine === latest.current) setRequired(answer);
    });
  }, [check]);

  useEffect(() => {
    recheck();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") recheck();
    });
    return () => {
      subscription.remove();
      // Drop any answer still on its way.
      latest.current += 1;
    };
  }, [recheck]);

  return { required, recheck };
}
