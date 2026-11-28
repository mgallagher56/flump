/*
 * PROTOTYPE ONLY (app design prototypes branch, never merged).
 *
 * Switches the app between today's look and the three prototype levels by setting attributes on
 * <html> that `prototype.css` reads, and shows one small control on every page to change level and
 * theme. Query parameters set it from a link: `?level=0|1|2|3`, `?theme=light|dark`, `?capture=1`
 * (hides the control, for screenshots). The level is remembered in this browser only.
 */
import { type FC, useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { useThemeContext } from "~/ThemeContext";

const LEVEL_KEY = "flump-proto-level";
export const PROTO_LEVELS = [0, 1, 2, 3] as const;
export type ProtoLevel = (typeof PROTO_LEVELS)[number];

const LEVEL_NAMES: Record<ProtoLevel, string> = {
  0: "Today",
  1: "1 Material",
  2: "2 Still ornament",
  3: "3 Boldest",
};

/** The area each path belongs to, which picks the orb tones and the level 3 area colour. */
export const areaFor = (pathname: string): string => {
  if (pathname === "/" || pathname === "/app" || pathname === "/app/") return "home";
  if (pathname.startsWith("/app/accounts")) return "accounts";
  if (pathname.startsWith("/app/budget")) return "budget";
  if (pathname.startsWith("/app/take-home") || pathname.startsWith("/app/self-assessment"))
    return "pay";
  if (pathname.startsWith("/app/tax")) return "pay";
  if (pathname.startsWith("/app/debt")) return "debt";
  if (pathname.startsWith("/app/mortgage")) return "mortgage";
  if (pathname.startsWith("/app/savings")) return "savings";
  if (pathname.startsWith("/app/pension") || pathname.startsWith("/app/retirement"))
    return "pension";
  if (pathname.startsWith("/app/onboarding")) return "onboarding";
  if (pathname.startsWith("/app/profile")) return "settings";
  return "other";
};

const readStoredLevel = (): ProtoLevel => {
  try {
    const stored = window.localStorage.getItem(LEVEL_KEY);
    if (stored === null) return 1;
    const raw = Number(stored);
    return (PROTO_LEVELS as readonly number[]).includes(raw) ? (raw as ProtoLevel) : 1;
  } catch {
    return 1;
  }
};

export const PrototypeLayer: FC = () => {
  const location = useLocation();
  const { theme, setPreference } = useThemeContext();
  const [level, setLevel] = useState<ProtoLevel | null>(null);
  const [capture, setCapture] = useState(false);

  // Read the query once per navigation: a level or theme in the link wins and is remembered.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fromQuery = params.get("level");
    let next = readStoredLevel();
    if (fromQuery !== null && (PROTO_LEVELS as readonly number[]).includes(Number(fromQuery))) {
      next = Number(fromQuery) as ProtoLevel;
    }
    setLevel(next);
    const themeParam = params.get("theme");
    if (themeParam === "light" || themeParam === "dark") setPreference(themeParam);
    if (params.get("capture") === "1") setCapture(true);
  }, [location.search, setPreference]);

  useEffect(() => {
    if (level === null) return;
    const html = document.documentElement;
    if (level === 0) delete html.dataset.protoLevel;
    else html.dataset.protoLevel = String(level);
    try {
      window.localStorage.setItem(LEVEL_KEY, String(level));
    } catch {
      // Private window: the level still applies to this page.
    }
  }, [level]);

  useEffect(() => {
    document.documentElement.dataset.protoArea = areaFor(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    if (capture) document.documentElement.dataset.protoCapture = "";
  }, [capture]);

  if (level === null || capture || location.pathname === "/prototype") return null;

  return (
    <section aria-label="Prototype controls" className="proto-control">
      <span className="proto-control__label">Prototype</span>
      <fieldset className="proto-control__group">
        <legend className="proto-control__legend">Design level</legend>
        {PROTO_LEVELS.map((value) => (
          <button
            aria-pressed={level === value}
            className="proto-control__button"
            key={value}
            onClick={() => setLevel(value)}
            type="button"
          >
            {LEVEL_NAMES[value]}
          </button>
        ))}
      </fieldset>
      <button
        className="proto-control__button"
        onClick={() => setPreference(theme === "dark" ? "light" : "dark")}
        type="button"
      >
        {theme === "dark" ? "Light theme" : "Dark theme"}
      </button>
      <Link className="proto-control__link" to="/prototype">
        All screens
      </Link>
    </section>
  );
};

export default PrototypeLayer;
