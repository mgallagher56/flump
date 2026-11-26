import { flushSync } from "react-dom";
import type { NavigateFunction } from "react-router-dom";

/*
 * Prototype 1b's enhancements, hand-written (no library) and wired once after hydration. Every
 * effect writes CSS custom properties or a data attribute and leaves the motion to CSS, so the
 * work per pointer move is a few style writes, batched to one per frame. With reduced motion only
 * the parts that are not movement remain (the instant theme switch, plain navigation).
 */

interface Options {
  reduced: boolean;
  navigate: NavigateFunction;
}

type Cleanup = () => void;

/** Runs `write` at most once per frame with the latest event. */
function perFrame<E>(write: (event: E) => void): (event: E) => void {
  let pending: E | null = null;
  let raf = 0;
  return (event: E) => {
    pending = event;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (pending) write(pending);
    });
  };
}

/** The primary calls to action lean a few pixels toward the pointer, and a light follows it. */
function magneticButtons(root: HTMLElement): Cleanup {
  const buttons = root.querySelectorAll<HTMLElement>('[data-proto="cta-primary"], #get-started a');
  const cleanups: Cleanup[] = [];
  for (const button of buttons) {
    const move = perFrame((event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      button.style.setProperty("--p1b-mx", `${x}px`);
      button.style.setProperty("--p1b-my", `${y}px`);
      button.style.setProperty("--p1b-tx", `${((x / rect.width - 0.5) * 6).toFixed(2)}px`);
      button.style.setProperty("--p1b-ty", `${((y / rect.height - 0.5) * 4).toFixed(2)}px`);
    });
    const leave = () => {
      button.style.setProperty("--p1b-tx", "0px");
      button.style.setProperty("--p1b-ty", "0px");
    };
    button.addEventListener("pointermove", move);
    button.addEventListener("pointerleave", leave);
    cleanups.push(() => {
      button.removeEventListener("pointermove", move);
      button.removeEventListener("pointerleave", leave);
    });
  }
  return () => {
    for (const c of cleanups) c();
  };
}

/**
 * Tiles and the sample dashboard tilt a few degrees toward the pointer, with a highlight where it
 * is. On touch, the press tilts toward the finger and the release lets it settle.
 */
function tilt(root: HTMLElement): Cleanup {
  const targets = root.querySelectorAll<HTMLElement>(".proto-tiles li, .p1b-preview > figure");
  const cleanups: Cleanup[] = [];
  for (const target of targets) {
    const max = target.tagName === "FIGURE" ? 3 : 5;
    const apply = (event: PointerEvent) => {
      const rect = target.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      target.style.setProperty("--p1b-ry", `${((px - 0.5) * 2 * max).toFixed(2)}deg`);
      target.style.setProperty("--p1b-rx", `${((0.5 - py) * 2 * max).toFixed(2)}deg`);
      target.style.setProperty("--p1b-hx", `${(px * 100).toFixed(1)}%`);
      target.style.setProperty("--p1b-hy", `${(py * 100).toFixed(1)}%`);
      target.dataset.tilt = "on";
    };
    const move = perFrame((event: PointerEvent) => {
      if (event.pointerType !== "touch") apply(event);
    });
    const down = (event: PointerEvent) => {
      if (event.pointerType === "touch") apply(event);
    };
    const reset = () => {
      target.style.setProperty("--p1b-rx", "0deg");
      target.style.setProperty("--p1b-ry", "0deg");
      target.dataset.tilt = "off";
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerdown", down);
    target.addEventListener("pointerleave", reset);
    const up = (event: PointerEvent) => {
      if (event.pointerType === "touch") reset();
    };
    target.addEventListener("pointerup", up);
    target.addEventListener("pointercancel", reset);
    cleanups.push(() => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerdown", down);
      target.removeEventListener("pointerleave", reset);
      target.removeEventListener("pointercancel", reset);
      target.removeEventListener("pointerup", up);
      reset();
    });
  }
  return () => {
    for (const c of cleanups) c();
  };
}

/**
 * The logo orb's highlight turns toward the pointer anywhere on the page, and the orb gives a
 * little (a squash that settles) when the page is scrolled quickly.
 */
function logo(root: HTMLElement): Cleanup {
  const link = root.querySelector<HTMLElement>('[data-testid="home-logo"] a');
  if (!link) return () => {};
  const look = perFrame((event: PointerEvent) => {
    const rect = link.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(dx, dy) || 1;
    const reach = Math.min(1, distance / 400);
    link.style.setProperty("--p1b-lx", `${(50 + (dx / distance) * 22 * reach).toFixed(1)}%`);
    link.style.setProperty("--p1b-ly", `${(45 + (dy / distance) * 22 * reach).toFixed(1)}%`);
  });
  let lastY = window.scrollY;
  let lastT = performance.now();
  let squash = 0;
  let raf = 0;
  const settle = () => {
    squash *= 0.86;
    link.style.setProperty("--p1b-squash", squash.toFixed(3));
    raf = Math.abs(squash) > 0.002 ? requestAnimationFrame(settle) : 0;
  };
  const onScroll = () => {
    const now = performance.now();
    const velocity = (window.scrollY - lastY) / Math.max(1, now - lastT);
    lastY = window.scrollY;
    lastT = now;
    squash = Math.max(-0.08, Math.min(0.08, velocity * 0.02));
    if (!raf) raf = requestAnimationFrame(settle);
  };
  window.addEventListener("pointermove", look, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  return () => {
    window.removeEventListener("pointermove", look);
    window.removeEventListener("scroll", onScroll);
    cancelAnimationFrame(raf);
  };
}

/** Band headings settle word by word when they arrive. The words stay one heading's text. */
function settleHeadings(root: HTMLElement): Cleanup {
  const headings = Array.from(root.querySelectorAll<HTMLElement>("main h2"));
  const originals = new Map<HTMLElement, string>();
  for (const heading of headings) {
    const text = heading.textContent ?? "";
    if (!text.trim() || heading.children.length > 0) continue;
    originals.set(heading, text);
    heading.textContent = "";
    text.split(" ").forEach((word, i) => {
      if (i > 0) heading.append(" ");
      const span = document.createElement("span");
      span.className = "p1b-hword";
      span.style.setProperty("--proto-i", String(i));
      span.textContent = word;
      heading.append(span);
    });
    heading.dataset.split = "waiting";
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        (entry.target as HTMLElement).dataset.split = "settled";
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -12% 0px" },
  );
  for (const heading of originals.keys()) observer.observe(heading);
  return () => {
    observer.disconnect();
    for (const [heading, text] of originals) {
      heading.textContent = text;
      delete heading.dataset.split;
    }
  };
}

/**
 * Sample figures in pounds count up to their value once, when they first come into view. The
 * final value stays in the markup for screen readers; only an aria-hidden copy counts.
 */
function countFigures(root: HTMLElement): Cleanup {
  const gbp = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  });
  const figures = Array.from(root.querySelectorAll<HTMLElement>(".p1b-preview *")).filter(
    (el) => el.children.length === 0 && /^-?£[\d,]+$/.test(el.textContent?.trim() ?? ""),
  );
  const restores: Cleanup[] = [];
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        const el = entry.target as HTMLElement;
        const finalText = el.textContent ?? "";
        const target = Number(finalText.replace(/[^\d-]/g, ""));
        const visible = document.createElement("span");
        visible.setAttribute("aria-hidden", "true");
        const spoken = document.createElement("span");
        spoken.className = "p1b-sr";
        spoken.textContent = finalText;
        el.textContent = "";
        el.append(spoken, visible);
        const start = performance.now();
        const duration = 900;
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - (1 - t) ** 3;
          visible.textContent = gbp.format(Math.round(target * eased));
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        restores.push(() => {
          el.textContent = finalText;
        });
      }
    },
    { threshold: 0.6 },
  );
  for (const figure of figures) observer.observe(figure);
  return () => {
    observer.disconnect();
    for (const r of restores) r();
  };
}

/**
 * The theme switch wipes the new theme in as a circle from where it was pressed (View
 * Transitions). The click is held, replayed inside the transition, so the old theme is captured
 * first. Browsers without View Transitions cross-fade colours instead.
 */
function themeTransition(root: HTMLElement, reduced: boolean): Cleanup {
  let replaying = false;
  const onClick = (event: MouseEvent) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      'button[aria-label^="Colour theme"], [aria-label="Colour theme"] button',
    );
    if (!button || replaying || reduced) return;
    const html = document.documentElement;
    html.style.setProperty("--p1b-wipe-x", `${event.clientX}px`);
    html.style.setProperty("--p1b-wipe-y", `${event.clientY}px`);
    if (!document.startViewTransition) {
      html.classList.add("p1b-theming");
      window.setTimeout(() => html.classList.remove("p1b-theming"), 450);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    document.startViewTransition(
      () =>
        new Promise<void>((resolve) => {
          replaying = true;
          button.click();
          replaying = false;
          requestAnimationFrame(() => resolve());
        }),
    );
  };
  root.ownerDocument.addEventListener("click", onClick, true);
  return () => root.ownerDocument.removeEventListener("click", onClick, true);
}

/** In-site links cross-fade to the next page (View Transitions around the router's navigation). */
function pageTransitions(root: HTMLElement, navigate: NavigateFunction, reduced: boolean): Cleanup {
  const onClick = (event: MouseEvent) => {
    if (reduced || !document.startViewTransition) return;
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
    if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
    event.preventDefault();
    event.stopPropagation();
    const html = document.documentElement;
    html.classList.add("p1b-page-nav");
    const transition = document.startViewTransition(() => {
      flushSync(() => navigate(url.pathname + url.search + url.hash));
      window.scrollTo(0, 0);
    });
    transition.finished.finally(() => html.classList.remove("p1b-page-nav"));
  };
  root.addEventListener("click", onClick, true);
  return () => root.removeEventListener("click", onClick, true);
}

export function enhance(root: HTMLElement, { reduced, navigate }: Options): Cleanup {
  const cleanups: Cleanup[] = [themeTransition(root, reduced)];
  if (!reduced) {
    cleanups.push(
      magneticButtons(root),
      tilt(root),
      logo(root),
      settleHeadings(root),
      countFigures(root),
      pageTransitions(root, navigate, reduced),
    );
  }
  return () => {
    for (const c of cleanups) c();
  };
}
