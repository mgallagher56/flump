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
import { renderTypographyChapter } from "./chapters/typography";
import { renderStyles } from "./styles";
import { loadBrandTokens, REPO_ROOT } from "./tokens";

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
    renderEvolutionChapter(),
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
</head>
<body>
<a class="skip-link" href="#main-content">Skip to contents</a>
<div class="page-shell">
  <div class="book-layout">
    ${renderSidebarToc()}
    <main class="book-main" id="main-content">
      ${sections}
      <footer class="book-footer">
        <span>Flump: finance without the fog</span>
        <span>Generated from <code>packages/tokens/src</code></span>
      </footer>
    </main>
  </div>
</div>
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
