import { useEffect, useState, useSyncExternalStore } from "react";
import type { AppLock } from "../../auth/deviceLock";
import { useSession } from "../../auth/SessionProvider";
import { AppLockSetting } from "../../components/AppLockSetting";
import { Card } from "../../components/Card";
import { APP_LOCK } from "../../copy/accountData";

/**
 * App lock on the This phone page (E12 S9): the switch, wired to the session's app lock. Turning it
 * on or off asks the phone first; a cancelled prompt changes nothing. Absent where this app binary
 * has no lock module (a development build from before S9).
 */
export function AppLockRow() {
  const lock = useSession()?.appLock;
  return lock ? <AppLockControl lock={lock} /> : null;
}

function AppLockControl({ lock }: { lock: AppLock }) {
  const phase = useSyncExternalStore(lock.subscribe, lock.getPhase);
  const [availability, setAvailability] = useState<"available" | "noScreenLock" | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void lock.availability().then((next) => {
      if (live) setAvailability(next);
    });
    return () => {
      live = false;
    };
  }, [lock]);

  const value = phase === "unlocked" || phase === "locked" || phase === "noScreenLock";

  async function change(next: boolean) {
    setBusy(true);
    setMessage(null);
    const result = next ? await lock.turnOn() : await lock.turnOff();
    setBusy(false);
    if (result === "failed") setMessage(APP_LOCK.failed);
    if (result === "noScreenLock") setAvailability("noScreenLock");
  }

  return (
    <Card>
      <AppLockSetting
        value={value}
        // Turning it off stays possible even if the phone's screen lock has since gone.
        availability={availability === "noScreenLock" && !value ? "noScreenLock" : "available"}
        busy={busy || availability === null || phase === "checking"}
        message={message}
        onChange={(next) => void change(next)}
      />
    </Card>
  );
}
