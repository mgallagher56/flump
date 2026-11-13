import { X } from "lucide-react";
import {
  createContext,
  type FC,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cx } from "../../../styled-system/css";
import { Icon } from "../Icon";
import { INLINE_ALERT_TONE_META, type InlineAlertTone } from "../InlineAlert";
import { LiveRegion } from "../LiveRegion";
import {
  toastActionRecipe,
  toastBodyRecipe,
  toastDescriptionRecipe,
  toastDismissRecipe,
  toastIconRecipe,
  toastRecipe,
  toastTitleRecipe,
  toastViewportRecipe,
} from "./Toast.styles";

export type ToastTone = InlineAlertTone;

/**
 * Setup: render `<ToastProvider>` once, in `apps/web/app/root.tsx`, around the app. Components
 * then call `useToast().toast(...)`.
 *
 * A toast must never be the only route to an action or to information the user needs: it can be
 * missed, times out, and is gone on navigation. Mirror every toast action elsewhere on the page.
 *
 * Phone placement: the stack sits above `var(--app-bottom-bar-offset, 0px)` plus the safe-area
 * inset. The app shell sets `--app-bottom-bar-offset` to the mobile bottom bar height (as it does
 * `--app-header-offset`); without it the offset is 0.
 */

/** Default auto-dismiss delay for non-error toasts. */
export const TOAST_DEFAULT_DURATION_MS = 5000;

export interface ToastOptions {
  /** Short sentence-case message with no exclamation mark, for example "Copied". */
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Optional action, usually a small `Button`. */
  action?: ReactNode;
  /**
   * Auto-dismiss delay in ms. By default 5000, except that a toast with an `action` or long text
   * (over 80 characters) persists until dismissed. `0` always persists. Error (`danger`) toasts
   * never auto-dismiss, whatever this is set to. Timers pause while the document is hidden.
   */
  durationMs?: number;
}

export interface ToastApi {
  /** Shows a toast and returns its id. A bare string is shorthand for `{ title }`. */
  toast: (options: ToastOptions | string) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Text longer than this is too slow to read in 5 s, so the toast persists by default. */
export const TOAST_LONG_TEXT_CHARS = 80;

/** Time each queued announcement holds a region: the LiveRegion debounce plus settle time. */
export const TOAST_ANNOUNCE_DEBOUNCE_MS = 50;
export const TOAST_ANNOUNCE_SLOT_MS = 350;

const NBSP = "\u00A0";

export const useToast = (): ToastApi => {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside <ToastProvider>");
  return api;
};

interface ToastEntry extends ToastOptions {
  id: string;
}

interface ToastItemProps {
  entry: ToastEntry;
  dismissLabel: string;
  onDismiss: (id: string) => void;
}

const ToastItem: FC<ToastItemProps> = ({ entry, dismissLabel, onDismiss }) => {
  const tone = entry.tone ?? "neutral";
  const meta = INLINE_ALERT_TONE_META[tone];
  const longText = entry.title.length + (entry.description?.length ?? 0) > TOAST_LONG_TEXT_CHARS;
  const defaultDuration = entry.action || longText ? 0 : TOAST_DEFAULT_DURATION_MS;
  const duration = tone === "danger" ? 0 : (entry.durationMs ?? defaultDuration);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [docHidden, setDocHidden] = useState(typeof document !== "undefined" && document.hidden);
  const paused = hovered || focused || docHidden;
  const remaining = useRef(duration);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    const onVisibility = () => setDocHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Pausing keeps the unspent time, so the toast resumes where it left off.
  useEffect(() => {
    if (duration === 0 || paused) return;
    const startedAt = Date.now();
    const id = setTimeout(() => onDismissRef.current(entry.id), remaining.current);
    return () => {
      clearTimeout(id);
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt));
    };
  }, [paused, duration, entry.id]);

  // Only a mouse hovers. A tap fires pointerenter on touch and no pointerleave until the next
  // tap elsewhere, which would otherwise pin the toast open.
  const handlePointerEnter = (event: PointerEvent<HTMLLIElement>) => {
    if (event.pointerType === "mouse") setHovered(true);
  };
  const handlePointerLeave = (event: PointerEvent<HTMLLIElement>) => {
    if (event.pointerType === "mouse") setHovered(false);
  };

  const handleBlur = (event: FocusEvent<HTMLLIElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLLIElement>) => {
    if (event.key === "Escape") onDismiss(entry.id);
  };

  return (
    // The list item is not interactive itself; it only pauses the timer and forwards Escape from
    // the controls inside it. Announcements go through the live regions, not through this node.
    <li
      className={toastRecipe({ tone })}
      data-tone={tone}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      <span className={toastIconRecipe({ tone })}>
        <Icon icon={meta.icon} size="md" />
      </span>
      <div className={toastBodyRecipe()}>
        <p className={toastTitleRecipe()}>{entry.title}</p>
        {entry.description ? <p className={toastDescriptionRecipe()}>{entry.description}</p> : null}
        {entry.action ? <div className={toastActionRecipe()}>{entry.action}</div> : null}
      </div>
      <button
        type="button"
        aria-label={dismissLabel}
        className={toastDismissRecipe()}
        onClick={() => onDismiss(entry.id)}
      >
        <Icon icon={X} size="sm" />
      </button>
    </li>
  );
};

export interface ToastProviderProps {
  children: ReactNode;
  /** Accessible name for the toast list. */
  label?: string;
  dismissLabel?: string;
  /** Cap on simultaneously visible toasts; the oldest non-error toast drops first. */
  maxVisible?: number;
  viewportClassName?: string;
}

/**
 * Sequential announcer for one live region. Messages queue and drain one per slot, so two toasts
 * raised in the same tick are both spoken (LiveRegion would otherwise drop the first). A message
 * equal to the one before gets a trailing no-break space so the region text actually changes.
 */
const useAnnouncer = () => {
  const [message, setMessage] = useState("");
  const queue = useRef<string[]>([]);
  const busy = useRef(false);
  const lastRaw = useRef<string | null>(null);
  const lastEmitted = useRef("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const drain = useCallback(() => {
    const next = queue.current.shift();
    if (next === undefined) {
      busy.current = false;
      return;
    }
    busy.current = true;
    let text = next;
    if (next === lastRaw.current) {
      text = lastEmitted.current.endsWith(NBSP) ? next : `${next}${NBSP}`;
    }
    lastRaw.current = next;
    lastEmitted.current = text;
    setMessage(text);
    timer.current = setTimeout(drain, TOAST_ANNOUNCE_SLOT_MS);
  }, []);

  const announce = useCallback(
    (text: string) => {
      queue.current.push(text);
      if (!busy.current) drain();
    },
    [drain],
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  return { message, announce };
};

/** Drops the oldest non-error toast first; errors only go when nothing else can. */
const evict = (list: ToastEntry[], max: number): ToastEntry[] => {
  const next = [...list];
  while (next.length > max) {
    const older = next.slice(0, -1);
    const index = older.findIndex((t) => t.tone !== "danger");
    next.splice(index === -1 ? 0 : index, 1);
  }
  return next;
};

export const ToastProvider: FC<ToastProviderProps> = ({
  children,
  label = "Notifications",
  dismissLabel = "Dismiss",
  maxVisible = 4,
  viewportClassName,
}) => {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const polite = useAnnouncer();
  const assertive = useAnnouncer();
  const counter = useRef(0);
  const announcePolite = polite.announce;
  const announceAssertive = assertive.announce;

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);
  const dismissAll = useCallback(() => setToasts([]), []);

  const toast = useCallback(
    (options: ToastOptions | string) => {
      const opts = typeof options === "string" ? { title: options } : options;
      counter.current += 1;
      const id = `toast-${counter.current}`;
      setToasts((current) => evict([...current, { ...opts, id }], maxVisible));
      const tone = opts.tone ?? "neutral";
      const body = opts.description ? `${opts.title}. ${opts.description}` : opts.title;
      // Same tone word as InlineAlert, so meaning does not rest on the icon colour.
      const spoken = tone === "neutral" ? body : `${INLINE_ALERT_TONE_META[tone].label}: ${body}`;
      if (tone === "danger") announceAssertive(spoken);
      else announcePolite(spoken);
      return id;
    },
    [maxVisible, announcePolite, announceAssertive],
  );

  const api = useMemo<ToastApi>(
    () => ({ toast, dismiss, dismissAll }),
    [toast, dismiss, dismissAll],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <LiveRegion
        message={polite.message}
        politeness="polite"
        debounceMs={TOAST_ANNOUNCE_DEBOUNCE_MS}
        announceInitial
        visuallyHidden
      />
      <LiveRegion
        message={assertive.message}
        politeness="assertive"
        debounceMs={TOAST_ANNOUNCE_DEBOUNCE_MS}
        announceInitial
        visuallyHidden
      />
      {toasts.length > 0 ? (
        <ol aria-label={label} className={cx(toastViewportRecipe(), viewportClassName)}>
          {toasts.map((entry) => (
            <ToastItem
              key={entry.id}
              entry={entry}
              dismissLabel={dismissLabel}
              onDismiss={dismiss}
            />
          ))}
        </ol>
      ) : null}
    </ToastContext.Provider>
  );
};

export default ToastProvider;
