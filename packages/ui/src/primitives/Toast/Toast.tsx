import { X } from "lucide-react";
import {
  createContext,
  type FC,
  type FocusEvent,
  type KeyboardEvent,
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
   * Auto-dismiss delay in ms. Defaults to 5000. `0` keeps the toast until dismissed. Error
   * (`danger`) toasts never auto-dismiss, whatever this is set to.
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
  const duration = tone === "danger" ? 0 : (entry.durationMs ?? TOAST_DEFAULT_DURATION_MS);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;
  const remaining = useRef(duration);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

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
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
  /** Cap on simultaneously visible toasts; the oldest drops first. */
  maxVisible?: number;
  viewportClassName?: string;
}

interface Announcement {
  polite: string;
  assertive: string;
}

export const ToastProvider: FC<ToastProviderProps> = ({
  children,
  label = "Notifications",
  dismissLabel = "Dismiss",
  maxVisible = 4,
  viewportClassName,
}) => {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const [announcement, setAnnouncement] = useState<Announcement>({ polite: "", assertive: "" });
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);
  const dismissAll = useCallback(() => setToasts([]), []);

  const toast = useCallback(
    (options: ToastOptions | string) => {
      const opts = typeof options === "string" ? { title: options } : options;
      counter.current += 1;
      const id = `toast-${counter.current}`;
      setToasts((current) => [...current, { ...opts, id }].slice(-maxVisible));
      const spoken = opts.description ? `${opts.title}. ${opts.description}` : opts.title;
      // LiveRegion ignores an unchanged message, so alternate a trailing no-break space to let the
      // same text (for example "Copied" twice) be announced again.
      const message = counter.current % 2 === 0 ? `${spoken} ` : spoken;
      const channel = opts.tone === "danger" ? "assertive" : "polite";
      setAnnouncement((current) => ({ ...current, [channel]: message }));
      return id;
    },
    [maxVisible],
  );

  const api = useMemo<ToastApi>(
    () => ({ toast, dismiss, dismissAll }),
    [toast, dismiss, dismissAll],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <LiveRegion
        message={announcement.polite}
        politeness="polite"
        debounceMs={50}
        announceInitial
        visuallyHidden
      />
      <LiveRegion
        message={announcement.assertive}
        politeness="assertive"
        debounceMs={50}
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
