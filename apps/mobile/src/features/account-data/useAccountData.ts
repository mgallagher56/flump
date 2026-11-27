/**
 * The export and the deletion as a screen drives them (E12 S9, plan 9.10). The requests themselves
 * live in `src/data` (`exportData.ts`, `deleteAccount.ts`) and reach screens through the app
 * session (`AppSession.accountData`); what each outcome does to the session (the wipe, the last
 * step) is the session controller's. Shared by the Data page, the delete page, the last step, and
 * the Not invited and Terms screens.
 */
import { useRef, useState } from "react";
import { useSession } from "../../auth/SessionProvider";
import type { ReauthResult } from "../../auth/session";
import type { ExportState } from "../../components/ExportDataSection/ExportDataSection";
import {
  DELETE,
  REAUTH,
  reauthConfirmed,
  WEB_DELETE,
  WEB_FINISH_DELETION,
} from "../../copy/accountData";
import type { DeleteOutcome } from "../../data/deleteAccount";
import type { ExportOutcome } from "../../data/exportData";

/** What the app session hands these hooks: the two requests, with the session's token. */
export interface AccountDataActions {
  exportData(): Promise<ExportOutcome>;
  deleteAccount(): Promise<DeleteOutcome>;
}

/** "Download your data": the section's state and its one action. */
export function useExportData(): { state: ExportState; download(): void; available: boolean } {
  const app = useSession();
  const [state, setState] = useState<ExportState>("idle");
  const inFlight = useRef(false);
  const actions = app?.accountData;

  async function run() {
    if (inFlight.current || !app || !actions) return;
    inFlight.current = true;
    setState("pending");
    try {
      const outcome = await actions.exportData();
      if (outcome === "accountDeleted") {
        // An erased account: the last step of the deletion replaces this screen.
        app.session.deletionPending();
        setState("idle");
      } else if (outcome === "ended") {
        // The session has ended and its own screen shows.
        setState("idle");
      } else {
        setState(outcome);
      }
    } catch {
      setState("failed");
    } finally {
      inFlight.current = false;
    }
  }

  return { state, download: () => void run(), available: Boolean(actions) };
}

/** Which words the deletion speaks: the first request, or the last step's repeat. */
export type DeletionStep = "delete" | "finish";

export interface DeletionFlow {
  pending: boolean;
  confirmLabel: string;
  pendingLabel: string;
  message: { text: string; tone: "danger" | "info" } | null;
  /** "Sign in again", offered after a 403 `recent_login_required`. */
  action: { label: string; onPress(): void; pending: boolean } | null;
  confirm(): void;
}

const WORDS: Record<
  DeletionStep,
  { confirm: string; pending: string; rateLimited: string; failed: string }
> = {
  delete: {
    confirm: WEB_DELETE.confirm,
    pending: WEB_DELETE.pending,
    rateLimited: WEB_DELETE.rateLimited,
    failed: WEB_DELETE.failed,
  },
  finish: {
    confirm: WEB_FINISH_DELETION.confirm,
    pending: WEB_FINISH_DELETION.pending,
    rateLimited: WEB_FINISH_DELETION.rateLimited,
    failed: WEB_FINISH_DELETION.failed,
  },
};

/**
 * The deletion request and what each answer leads to. `deleted` wipes the device (the session
 * does it, with no server sign-out); `identity_pending` and a 410 move to the last step; a 403
 * offers "Sign in again", which re-authenticates in place and deletes nothing: the person presses
 * the button again.
 */
export function useDeletionFlow(step: DeletionStep): DeletionFlow {
  const app = useSession();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<DeletionFlow["message"]>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [reauthPending, setReauthPending] = useState(false);
  const [stillPending, setStillPending] = useState(false);
  const inFlight = useRef(false);
  const words = WORDS[step];
  const confirmLabel =
    step === "finish" && stillPending ? WEB_FINISH_DELETION.retry : words.confirm;

  async function run() {
    const actions = app?.accountData;
    if (inFlight.current || !app || !actions) return;
    inFlight.current = true;
    setPending(true);
    setMessage(null);
    setNeedsSignIn(false);
    let outcome: DeleteOutcome;
    try {
      outcome = await actions.deleteAccount();
    } catch {
      outcome = "failed";
    }
    inFlight.current = false;
    setPending(false);
    switch (outcome) {
      case "deleted":
        await app.session.accountDeleted();
        return;
      case "identityPending":
      case "accountDeleted":
        if (step === "delete") {
          app.session.deletionPending();
          return;
        }
        setStillPending(true);
        return setMessage({ text: WEB_FINISH_DELETION.identityPending, tone: "danger" });
      case "recentLoginRequired":
        setNeedsSignIn(true);
        return setMessage({ text: WEB_DELETE.recentLogin, tone: "danger" });
      case "unavailable":
        return setMessage({ text: DELETE.unavailable, tone: "danger" });
      case "rateLimited":
        return setMessage({ text: words.rateLimited, tone: "danger" });
      case "noAnswer":
        return setMessage({ text: DELETE.noAnswer, tone: "danger" });
      case "failed":
        return setMessage({ text: words.failed, tone: "danger" });
    }
  }

  async function signInAgain() {
    if (!app || reauthPending) return;
    setReauthPending(true);
    let result: ReauthResult;
    try {
      result = await app.session.reauthenticate();
    } catch {
      result = "failed";
    }
    setReauthPending(false);
    switch (result) {
      case "confirmed":
        setNeedsSignIn(false);
        return setMessage({ text: reauthConfirmed(confirmLabel), tone: "info" });
      case "differentAccount":
        return setMessage({ text: REAUTH.differentAccount, tone: "danger" });
      case "failed":
        return setMessage({ text: REAUTH.failed, tone: "danger" });
      case "unavailable":
        return setMessage({ text: REAUTH.unavailable, tone: "danger" });
      case "cancelled":
        // A closed browser changes nothing, the message included.
        return;
    }
  }

  return {
    pending,
    confirmLabel,
    pendingLabel: words.pending,
    message,
    action: needsSignIn
      ? { label: WEB_DELETE.signInAgain, onPress: () => void signInAgain(), pending: reauthPending }
      : null,
    confirm: () => void run(),
  };
}
