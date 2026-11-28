import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderCharacterChapter } from "./chapters/character";
import { renderChartsChapter } from "./chapters/charts";
import { renderColourChapter } from "./chapters/colour";
import { renderCover, renderSidebarToc } from "./chapters/cover";
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
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>';
  const sunIcon =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';
  const moonIcon =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
  const motionIcon =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line x1="10" y1="9" x2="10" y2="15"/><line x1="14" y1="9" x2="14" y2="15"/></svg>';

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
<div class="page-shell">
  ${renderPageControls()}
  <div class="book-layout">
    ${renderSidebarToc()}
    <main class="book-main" id="main-content">
      ${sections}
      <footer class="book-footer">
        <span>Flump: finance without the fog</span>
        <span>Flump brand book</span>
      </footer>
    </main>
  </div>
</div>
<script>
(() => {
  const THEME_KEY = "flump-brand-book-theme";
  const MOTION_KEY = "flump-brand-book-motion";
  const root = document.documentElement;
  const themeButtons = document.querySelectorAll("[data-theme-choice]");
  const motionButton = document.querySelector("[data-motion-toggle]");

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
  }

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
