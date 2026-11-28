import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderCharacterChapter } from "./chapters/character";
import { renderChartsChapter } from "./chapters/charts";
import { renderColourChapter } from "./chapters/colour";
import { renderCover, renderTopBar } from "./chapters/cover";
import { renderDoAndDoNotChapter } from "./chapters/doAndDoNot";
import { renderEvolutionChapter } from "./chapters/evolution";
import { renderIllustrationChapter } from "./chapters/illustration";
import { renderLayoutChapter } from "./chapters/layout";
import { renderLogoChapter } from "./chapters/logo";
import { renderMaterialChapter } from "./chapters/material";
import { renderMotionChapter } from "./chapters/motion";
import { renderReferenceAppendix } from "./chapters/reference";
import { renderTypographyChapter } from "./chapters/typography";
import { renderStyles } from "./styles";
import { loadBrandTokens, REPO_ROOT } from "./tokens";

function renderPageControls(): string {
  const monitorIcon =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>';
  const sunIcon =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';
  const moonIcon =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
  const motionIcon =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line x1="10" y1="9" x2="10" y2="15"/><line x1="14" y1="9" x2="14" y2="15"/></svg>';

  return `<section class="page-controls" aria-label="Display controls">
    <fieldset class="theme-switch" aria-label="Colour theme">
      <button type="button" class="theme-btn" data-theme-choice="system" aria-pressed="true">${monitorIcon}<span>System</span></button>
      <button type="button" class="theme-btn" data-theme-choice="light" aria-pressed="false">${sunIcon}<span>Light</span></button>
      <button type="button" class="theme-btn" data-theme-choice="dark" aria-pressed="false">${moonIcon}<span>Dark</span></button>
    </fieldset>
    <button type="button" class="motion-toggle" id="motion-toggle" data-motion-toggle="" aria-pressed="false">${motionIcon}<span>Reduce motion</span></button>
  </section>`;
}

export function buildBrandBook(): string {
  const tokens = loadBrandTokens();
  const css = renderStyles(tokens);

  const sections = [
    renderCover(tokens),
    renderCharacterChapter(tokens),
    renderLogoChapter(tokens),
    renderColourChapter(tokens),
    renderTypographyChapter(tokens),
    renderMaterialChapter(tokens),
    renderLayoutChapter(tokens),
    renderIllustrationChapter(tokens),
    renderMotionChapter(tokens),
    renderChartsChapter(tokens),
    renderDoAndDoNotChapter(tokens),
    renderEvolutionChapter(tokens),
    renderReferenceAppendix(tokens),
  ].join("\n");

  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Flump brand book</title>
<style>
${css}
</style>
<script>
(() => {
  try {
    const root = document.documentElement;
    root.classList.add("js-motion");
    const theme = localStorage.getItem("flump-brand-book-theme");
    if (theme === "light" || theme === "dark") {
      root.setAttribute("data-theme", theme);
    }
    if (localStorage.getItem("flump-brand-book-motion") === "reduce") {
      root.setAttribute("data-motion", "reduce");
    }
  } catch {}
})();
</script>
</head>
<body>
<a class="skip-link" href="#main-content">Skip to contents</a>
${renderTopBar(tokens, renderPageControls())}
<main class="book-main" id="main-content">
  ${sections}
</main>
<footer class="book-footer">
  <div class="spread-inner book-footer-inner">
    <span>Flump: finance without the fog</span>
    <span>Flump brand book</span>
  </div>
</footer>
<script>
(() => {
  const THEME_KEY = "flump-brand-book-theme";
  const MOTION_KEY = "flump-brand-book-motion";
  const root = document.documentElement;
  const themeButtons = document.querySelectorAll("[data-theme-choice]");
  const motionButton = document.querySelector("[data-motion-toggle]");
  const tocDrawer = document.querySelector(".toc-drawer");

  function readStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      if (value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }
    } catch {}
  }

  function syncTheme(choice) {
    let resolved = choice;
    if (resolved === "light" || resolved === "dark") {
      root.setAttribute("data-theme", resolved);
    } else {
      root.removeAttribute("data-theme");
      resolved = "system";
    }
    for (let i = 0; i < themeButtons.length; i += 1) {
      const btn = themeButtons[i];
      const pressed = btn.getAttribute("data-theme-choice") === resolved;
      btn.setAttribute("aria-pressed", pressed ? "true" : "false");
    }
  }

  function syncMotion(reduced) {
    if (reduced) {
      root.setAttribute("data-motion", "reduce");
    } else {
      root.removeAttribute("data-motion");
    }
    if (motionButton) {
      motionButton.setAttribute("aria-pressed", reduced ? "true" : "false");
    }
    document.dispatchEvent(new CustomEvent("flump:motion-change", { detail: { reduced: Boolean(reduced) } }));
  }

  function syncBarOffset() {
    const bar = document.querySelector(".book-bar");
    if (bar) {
      root.style.setProperty("--book-bar-offset", Math.ceil(bar.getBoundingClientRect().height + 12) + "px");
    }
  }

  syncBarOffset();
  window.addEventListener("resize", syncBarOffset);
  syncTheme(readStorage(THEME_KEY) || "system");
  syncMotion(readStorage(MOTION_KEY) === "reduce");

  for (let i = 0; i < themeButtons.length; i += 1) {
    const btn = themeButtons[i];
    btn.addEventListener("click", () => {
      const choice = btn.getAttribute("data-theme-choice") || "system";
      writeStorage(THEME_KEY, choice === "system" ? null : choice);
      syncTheme(choice);
    });
  }

  if (motionButton) {
    motionButton.addEventListener("click", () => {
      const next = root.getAttribute("data-motion") !== "reduce";
      writeStorage(MOTION_KEY, next ? "reduce" : null);
      syncMotion(next);
    });
  }

  if (tocDrawer) {
    const links = tocDrawer.querySelectorAll("a");
    for (let i = 0; i < links.length; i += 1) {
      links[i].addEventListener("click", () => {
        tocDrawer.removeAttribute("open");
      });
    }
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && tocDrawer.hasAttribute("open")) {
        tocDrawer.removeAttribute("open");
      }
    });
  }
})();
</script>
<script>
(() => {
  const root = document.documentElement;
  const mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
  const isReduced = () => root.getAttribute("data-motion") === "reduce" || Boolean(mq && mq.matches);

  function calmEase(t) {
    let u = t;
    for (let i = 0; i < 4; i += 1) {
      const x = 3 * (1 - u) * (1 - u) * u * 0.25 + 3 * (1 - u) * u * u * 0.2 + u * u * u;
      const dx = 3 * (1 - u) * (1 - u) * 0.25 + 6 * (1 - u) * u * -0.05 + 3 * u * u * 0.8;
      if (Math.abs(dx) < 1e-5) break;
      u = Math.min(1, Math.max(0, u - (x - t) / dx));
    }
    return 3 * (1 - u) * (1 - u) * u * 0.1 + 3 * (1 - u) * u * u + u * u * u;
  }

  const countFrames = new WeakMap();
  function snapCount(el) {
    const raf = countFrames.get(el);
    if (raf) cancelAnimationFrame(raf);
    countFrames.delete(el);
    el.textContent = gbp.format(Number(el.getAttribute("data-count-up") || "0"));
  }

  function runCount(el) {
    const target = Number(el.getAttribute("data-count-up") || "0");
    const dur = Number(el.getAttribute("data-count-duration") || "0");
    if (isReduced() || dur <= 0) {
      snapCount(el);
      return;
    }
    const prev = countFrames.get(el);
    if (prev) cancelAnimationFrame(prev);
    const start = performance.now();
    const tick = (now) => {
      if (isReduced()) {
        snapCount(el);
        return;
      }
      const p = Math.min(1, (now - start) / dur);
      el.textContent = gbp.format(Math.round(target * calmEase(p)));
      if (p < 1) {
        countFrames.set(el, requestAnimationFrame(tick));
      } else {
        countFrames.delete(el);
        el.textContent = gbp.format(target);
      }
    };
    el.textContent = gbp.format(0);
    countFrames.set(el, requestAnimationFrame(tick));
  }

  function playDemo(el) {
    if (isReduced()) return;
    el.classList.remove("is-playing");
    void el.offsetWidth;
    el.classList.add("is-playing");
    const counter = el.querySelector("[data-count-up]");
    if (counter) runCount(counter);
  }

  function syncMotionState() {
    const reduced = isReduced();
    for (const b of document.querySelectorAll("[data-motion-replay]")) b.disabled = reduced;
    if (reduced) {
      for (const p of document.querySelectorAll("[data-motion-playable]")) p.classList.remove("is-playing");
      for (const c of document.querySelectorAll("[data-count-up]")) snapCount(c);
    }
  }

  for (const btn of document.querySelectorAll("[data-motion-replay]")) {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-motion-replay");
      const target = key ? document.querySelector('[data-motion-playable="' + key + '"]') : null;
      if (target) playDemo(target);
    });
  }

  if ("IntersectionObserver" in window) {
    const demoObs = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const el = entry.target;
        if (entry.isIntersecting && !el.getAttribute("data-played-once")) {
          el.setAttribute("data-played-once", "true");
          playDemo(el);
        }
      }
    }, { threshold: 0.25 });
    for (const el of document.querySelectorAll("[data-motion-playable]")) demoObs.observe(el);
  }

  document.addEventListener("flump:motion-change", syncMotionState);
  window.addEventListener("beforeprint", () => {
    for (const c of document.querySelectorAll("[data-count-up]")) snapCount(c);
  });
  if (mq && mq.addEventListener) mq.addEventListener("change", syncMotionState);
  syncMotionState();
})();
</script>
<script>
(() => {
  const root = document.documentElement;
  const mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  const isReduced = () => root.getAttribute("data-motion") === "reduce" || Boolean(mq && mq.matches);

  function syncVideos() {
    const videos = document.querySelectorAll("video[data-brand-video]");
    const canPlay = !isReduced() && !document.hidden;
    for (let i = 0; i < videos.length; i += 1) {
      const v = videos[i];
      if (canPlay && v.getAttribute("data-in-view") === "true") {
        v.muted = true;
        v.loop = true;
        const p = v.play();
        if (p && p.catch) p.catch(() => {});
      } else {
        v.pause();
      }
    }
  }

  if ("IntersectionObserver" in window) {
    const vidObs = new IntersectionObserver((entries) => {
      for (let i = 0; i < entries.length; i += 1) {
        entries[i].target.setAttribute("data-in-view", entries[i].isIntersecting ? "true" : "false");
      }
      syncVideos();
    }, { threshold: 0.2 });
    const videos = document.querySelectorAll("video[data-brand-video]");
    for (let i = 0; i < videos.length; i += 1) {
      vidObs.observe(videos[i]);
    }
  }

  document.addEventListener("flump:motion-change", syncVideos);
  document.addEventListener("visibilitychange", syncVideos);
  window.addEventListener("beforeprint", () => {
    const videos = document.querySelectorAll("video[data-brand-video]");
    for (let i = 0; i < videos.length; i += 1) {
      videos[i].pause();
    }
  });
  if (mq && mq.addEventListener) mq.addEventListener("change", syncVideos);
  syncVideos();
})();
</script>
<script>
(() => {
  const root = document.documentElement;
  const mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  const isReduced = () => root.getAttribute("data-motion") === "reduce" || Boolean(mq && mq.matches);
  const tiltEls = document.querySelectorAll("[data-motion-tilt]");

  function resetTilts() {
    for (let i = 0; i < tiltEls.length; i += 1) {
      tiltEls[i].style.setProperty("--tilt-rx", "0deg");
      tiltEls[i].style.setProperty("--tilt-ry", "0deg");
    }
  }

  for (let i = 0; i < tiltEls.length; i += 1) {
    const el = tiltEls[i];
    el.addEventListener("pointermove", (e) => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      el.setAttribute("data-tilt-light", "on");
      el.style.setProperty("--light-x", (px * 100).toFixed(1) + "%");
      el.style.setProperty("--light-y", (py * 100).toFixed(1) + "%");
      el.style.setProperty("--tilt-rx", isReduced() ? "0deg" : ((0.5 - py) * 12).toFixed(2) + "deg");
      el.style.setProperty("--tilt-ry", isReduced() ? "0deg" : ((px - 0.5) * 12).toFixed(2) + "deg");
    });
    el.addEventListener("pointerleave", () => {
      el.removeAttribute("data-tilt-light");
      el.style.setProperty("--tilt-rx", "0deg");
      el.style.setProperty("--tilt-ry", "0deg");
    });
  }

  document.addEventListener("flump:motion-change", () => {
    if (isReduced()) resetTilts();
  });
  if (mq && mq.addEventListener) {
    mq.addEventListener("change", () => {
      if (isReduced()) resetTilts();
    });
  }
})();
</script>
</body>
</html>
`;
}

if (import.meta.main) {
  const outDir = resolve(REPO_ROOT, "docs/brand");
  const assetsDir = resolve(outDir, "assets");
  mkdirSync(assetsDir, { recursive: true });

  copyFileSync(resolve(REPO_ROOT, "apps/mobile/assets/icon.png"), resolve(assetsDir, "icon.png"));
  copyFileSync(
    resolve(REPO_ROOT, "apps/mobile/assets/adaptive-icon.png"),
    resolve(assetsDir, "adaptive-icon.png"),
  );

  const html = buildBrandBook();
  const outPath = resolve(outDir, "BRAND-BOOK.html");
  writeFileSync(outPath, html, "utf8");
  console.log(`Wrote ${outPath} (${Buffer.byteLength(html, "utf8")} bytes)`);
}
