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
import { clearExplains, placeExplains } from "../explain";
import { applyReducedMotion, readReducedMotion } from "../motion";

// Round two: a new key, so the revised level 2 is the default even where round one stored a level.
const LEVEL_KEY = "flump-proto-level-r2";
const DEPTH_KEY = "flump-proto-depth";
const ICONS_KEY = "flump-proto-icons";
export const PROTO_DEPTHS = ["1", "2", "3"] as const;
export const PROTO_ICONS = ["glass", "orb", "lit"] as const;
const DEPTH_NAMES: Record<string, string> = { "1": "Soft", "2": "Medium", "3": "Rich" };
const ICON_NAMES: Record<string, string> = { glass: "Glass", orb: "Orb", lit: "Lit tile" };

/** Cards and clickable rows that take the pointer light (level 2, round two). */
const LIGHT_TARGETS =
  "main [data-card], main [data-kpi-card], main [data-section-card], main [data-tone='hero'], main li:has(a), [role='dialog'] [data-card]";

const readChoice = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
  try {
    const v = window.localStorage.getItem(key);
    return v !== null && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
};
const storeChoice = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private window: the choice still applies to this page.
  }
};
export const PROTO_LEVELS = [0, 1, 2, 3] as const;
export type ProtoLevel = (typeof PROTO_LEVELS)[number];

const LEVEL_NAMES: Record<ProtoLevel, string> = {
  0: "Today",
  1: "1 Material",
  2: "2 Revised",
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
    if (stored === null) return 2;
    const raw = Number(stored);
    return (PROTO_LEVELS as readonly number[]).includes(raw) ? (raw as ProtoLevel) : 2;
  } catch {
    return 2;
  }
};

export const PrototypeLayer: FC = () => {
  const location = useLocation();
  const { theme, setPreference } = useThemeContext();
  const [level, setLevel] = useState<ProtoLevel | null>(null);
  const [capture, setCapture] = useState(false);
  const [depth, setDepth] = useState<(typeof PROTO_DEPTHS)[number]>("2");
  const [icons, setIcons] = useState<(typeof PROTO_ICONS)[number]>("glass");

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
    const depthParam = params.get("depth");
    setDepth(
      depthParam && (PROTO_DEPTHS as readonly string[]).includes(depthParam)
        ? (depthParam as (typeof PROTO_DEPTHS)[number])
        : readChoice(DEPTH_KEY, PROTO_DEPTHS, "2"),
    );
    const iconsParam = params.get("icons");
    setIcons(
      iconsParam && (PROTO_ICONS as readonly string[]).includes(iconsParam)
        ? (iconsParam as (typeof PROTO_ICONS)[number])
        : readChoice(ICONS_KEY, PROTO_ICONS, "glass"),
    );
    applyReducedMotion(readReducedMotion());
  }, [location.search, setPreference]);

  useEffect(() => {
    document.documentElement.dataset.protoDepth = depth;
    storeChoice(DEPTH_KEY, depth);
  }, [depth]);

  useEffect(() => {
    document.documentElement.dataset.protoIcons = icons;
    storeChoice(ICONS_KEY, icons);
  }, [icons]);

  // The orbs pause in a hidden tab and while off screen.
  useEffect(() => {
    const html = document.documentElement;
    const onVisibility = () => {
      if (document.hidden) html.dataset.protoHidden = "";
      else delete html.dataset.protoHidden;
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
  useEffect(() => {
    if (typeof IntersectionObserver !== "function") return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        if (entry.isIntersecting) delete el.dataset.protoOffscreen;
        else el.dataset.protoOffscreen = "";
      }
    });
    const timer = window.setTimeout(() => {
      for (const el of document.querySelectorAll("[data-proto-ornament]")) observer.observe(el);
    }, 300);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [location.pathname]);

  // The pointer light: mouse and pen only, light follows the pointer, nothing moves or tilts.
  useEffect(() => {
    let lit: HTMLElement | null = null;
    let frame = 0;
    let last: PointerEvent | null = null;
    const clear = () => {
      if (lit) delete lit.dataset.protoLit;
      lit = null;
    };
    const paint = () => {
      frame = 0;
      const event = last;
      if (!event) return;
      const target = (event.target as Element | null)?.closest<HTMLElement>(LIGHT_TARGETS) ?? null;
      if (target !== lit) {
        clear();
        lit = target;
      }
      if (!lit) return;
      const box = lit.getBoundingClientRect();
      lit.style.setProperty("--light-x", `${((event.clientX - box.left) / box.width) * 100}%`);
      lit.style.setProperty("--light-y", `${((event.clientY - box.top) / box.height) * 100}%`);
      lit.dataset.protoLit = "";
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      last = event;
      if (!frame) frame = window.requestAnimationFrame(paint);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", clear);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", clear);
      if (frame) window.cancelAnimationFrame(frame);
      clear();
    };
  }, []);

  // Level 2: every calculated headline figure explains itself (see explain.ts).
  useEffect(() => {
    if (level !== 2) {
      clearExplains();
      return;
    }
    const timers = [400, 1500].map((ms) =>
      window.setTimeout(() => placeExplains(location.pathname), ms),
    );
    return () => {
      for (const t of timers) window.clearTimeout(t);
      clearExplains();
    };
  }, [level, location.pathname]);

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
      {level === 2 ? (
        <>
          <fieldset className="proto-control__group">
            <legend className="proto-control__legend">Depth</legend>
            <span aria-hidden="true" className="proto-control__label">
              Depth
            </span>
            {PROTO_DEPTHS.map((value) => (
              <button
                aria-label={`Depth ${DEPTH_NAMES[value]}`}
                aria-pressed={depth === value}
                className="proto-control__button"
                key={value}
                onClick={() => setDepth(value)}
                type="button"
              >
                {DEPTH_NAMES[value]}
              </button>
            ))}
          </fieldset>
          <fieldset className="proto-control__group">
            <legend className="proto-control__legend">Icons</legend>
            <span aria-hidden="true" className="proto-control__label">
              Icons
            </span>
            {PROTO_ICONS.map((value) => (
              <button
                aria-label={`Icons ${ICON_NAMES[value]}`}
                aria-pressed={icons === value}
                className="proto-control__button"
                key={value}
                onClick={() => setIcons(value)}
                type="button"
              >
                {ICON_NAMES[value]}
              </button>
            ))}
          </fieldset>
        </>
      ) : null}
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
