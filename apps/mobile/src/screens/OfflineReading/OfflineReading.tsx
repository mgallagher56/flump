import { type ReactNode, useEffect, useState } from "react";
import { SavedFiguresFrame } from "../../components/SavedFiguresFrame";
import { useShell } from "../../navigation/shell";
import { Loading } from "../Loading";
import { Offline } from "../Offline";

/**
 * Around each screen that reads figures (Home, Accounts, an account, the history; E12 S7). Online it
 * is the screen alone. Restored offline it is the screen over the saved figures, under a notice of
 * their age, when the sealed cache held them; otherwise `Offline`, as before S7. A spinner shows for
 * the moment the cache takes to read, so the offline screen never flashes first.
 */
const AGE_REFRESH_MS = 60_000;

export function OfflineReading({
  children,
  now = Date.now,
}: {
  children: ReactNode;
  /** The phone's clock, injected in tests. */
  now?: () => number;
}) {
  const shell = useShell();
  // Drawn again each minute, so "2 hours ago" does not go stale while the app stays open.
  const [, setTick] = useState(0);
  const showing = Boolean(shell.offline && shell.saved);
  useEffect(() => {
    if (!showing) return;
    const timer = setInterval(() => setTick((n) => n + 1), AGE_REFRESH_MS);
    return () => clearInterval(timer);
  }, [showing]);
  if (!shell.offline) return children;
  if (shell.saved) {
    return (
      <SavedFiguresFrame
        savedAt={shell.saved.savedAt}
        now={now()}
        checking={shell.checking ?? false}
        onTryAgain={shell.tryAgainQuietly ?? shell.retry}
      >
        {children}
      </SavedFiguresFrame>
    );
  }
  if (shell.restoringSaved) return <Loading />;
  return <Offline onRetry={shell.retry} onSignOut={shell.signOut} />;
}
