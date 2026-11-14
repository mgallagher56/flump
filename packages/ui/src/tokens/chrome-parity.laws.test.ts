import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { NAV_BREAKPOINT, navConditions } from "./breakpoints";

/**
 * Shared chrome law: the marketing site and the web app render the same logo, theme switcher,
 * top bar, mobile drawer, footer and favicon, all from `@repo/ui`, and switch the top nav at one
 * breakpoint defined in the shared preset. Each site keeps only its own links and calls to action.
 */

const REPO = path.resolve(__dirname, "../../../..");
const UI_SRC = path.join(REPO, "packages/ui/src");
const WEB_APP = path.join(REPO, "apps/web/app");
const MARKETING_SRC = path.join(REPO, "apps/marketing/src");

const read = (...parts: string[]) => fs.readFileSync(path.join(REPO, ...parts), "utf-8");

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "styled-system") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.(test|stories)\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const APP_FILES = [...sourceFiles(WEB_APP), ...sourceFiles(MARKETING_SRC)];
const rel = (file: string) => path.relative(REPO, file);

/** Files that own each site's top bar and mobile drawer. */
const SITE_HEADER_FILES = [
  "apps/web/app/components/structure/header/Header.tsx",
  "apps/web/app/components/structure/header/MobileNavDrawer/MobileNavDrawer.tsx",
  "apps/web/app/components/structure/header/MobileNavDrawer/MobileNavDrawer.styles.ts",
  "apps/marketing/src/components/Header/Header.tsx",
  "apps/marketing/src/components/Header/Header.styles.ts",
];

describe("Shared chrome law (marketing and web)", () => {
  describe("logo", () => {
    it("neither app defines its own logo component or text wordmark", () => {
      const offenders = APP_FILES.filter((file) => {
        const src = fs.readFileSync(file, "utf-8");
        return (
          /(const|function|class)\s+[A-Z]\w*Logo\b/.test(src) ||
          /Logo\.tsx$/.test(file) ||
          /Flump<span/.test(src)
        );
      }).map(rel);
      expect(offenders, "Use HomeLogo / FlumpLogo from @repo/ui").toEqual([]);
    });

    it("both site headers render HomeLogo from @repo/ui", () => {
      for (const file of [
        "apps/web/app/components/structure/header/Header.tsx",
        "apps/marketing/src/components/Header/Header.tsx",
      ]) {
        const src = read(file);
        expect(src, file).toMatch(/import \{[^}]*\bHomeLogo\b[^}]*\} from "@repo\/ui"/s);
        expect(src, file).toContain("<HomeLogo");
      }
    });
  });

  describe("theme switcher", () => {
    it("neither app defines its own theme switcher component", () => {
      const offenders = APP_FILES.filter((file) => {
        const src = fs.readFileSync(file, "utf-8");
        return (
          /(const|function|class)\s+(ThemeToggle|ThemeSwitch\w*|ColorModeSwitch|DarkModeToggle)\b/.test(
            src,
          ) || /(ThemeToggle|ThemeSwitch\w*|ColorModeSwitch)\.tsx$/.test(file)
        );
      }).map(rel);
      expect(offenders, "Use ThemeToggle from @repo/ui").toEqual([]);
    });

    it("neither app reads or writes the theme storage key itself", () => {
      const offenders = APP_FILES.filter((file) =>
        /["'`]flump-theme["'`]|localStorage\.(get|set|remove)Item\([^)]*theme/i.test(
          fs.readFileSync(file, "utf-8"),
        ),
      ).map(rel);
      expect(offenders, "Use useThemePreference / THEME_STORAGE_KEY from @repo/ui").toEqual([]);
    });

    it("both apps inline the shared pre-paint theme script", () => {
      const html = read("apps/marketing/index.html");
      expect(html).toContain("/* theme-init */");
      expect(html).not.toContain("localStorage");
      expect(read("apps/marketing/vite.config.ts")).toContain("THEME_INIT_SCRIPT");
      expect(read("apps/web/app/root.tsx")).toMatch(/\bTHEME_INIT_SCRIPT\b[^;]*from "@repo\/ui"/s);
    });
  });

  describe("nav breakpoint", () => {
    it("is defined once in the shared preset, at Panda's lg", () => {
      expect(NAV_BREAKPOINT).toBe("64rem");
      expect(navConditions.navInline).toContain(NAV_BREAKPOINT);
      expect(navConditions.navCollapsed).toContain(NAV_BREAKPOINT);
      expect(read("packages/ui/panda.preset.ts")).toContain("...navConditions");
    });

    it("TopBar switches only on the shared nav conditions", () => {
      const styles = read("packages/ui/src/patterns/TopBar/TopBar.styles.ts");
      expect(styles).toContain("_navInline");
      expect(styles, "TopBar must not use raw breakpoints").not.toMatch(/\b(sm|md|lg|xl|2xl):\s/);
      expect(styles).not.toMatch(/@media/);
    });

    it("site headers use TopBar and NavDrawer and set no breakpoint of their own", () => {
      for (const file of SITE_HEADER_FILES) {
        const src = read(file);
        expect(src, `${file} must not render its own <header>`).not.toMatch(/<header\b/);
        // `sm` is allowed for swapping a long label for a short one; anything that could hide or
        // show the nav (md and up) must come from the shared `_navInline` / `_navCollapsed`.
        expect(src, `${file} must not set a nav display breakpoint`).not.toMatch(
          /display:\s*\{[^}]*\b(md|lg|xl|2xl):/,
        );
        expect(src, `${file} must not hardcode a breakpoint`).not.toMatch(
          /@media|\b\d{3,4}px\b.*(min|max)-width|(min|max)-width:\s*\d/,
        );
      }
      for (const file of [
        "apps/web/app/components/structure/header/Header.tsx",
        "apps/marketing/src/components/Header/Header.tsx",
      ]) {
        expect(read(file), file).toContain("<TopBar");
      }
      for (const file of [
        "apps/web/app/components/structure/header/MobileNavDrawer/MobileNavDrawer.tsx",
        "apps/marketing/src/components/Header/Header.tsx",
      ]) {
        expect(read(file), file).toContain("<NavDrawer");
      }
    });
  });

  describe("footer", () => {
    it("both sites render SiteFooter from @repo/ui", () => {
      for (const file of [
        "apps/web/app/features/signed-out/components/SignedOutFooter/SignedOutFooter.tsx",
        "apps/marketing/src/components/Footer/Footer.tsx",
      ]) {
        const src = read(file);
        expect(src, file).toContain("<SiteFooter");
        expect(src, file).not.toMatch(/<footer\b/);
      }
    });
  });

  describe("favicon", () => {
    it("both apps serve the same favicon file and link it", () => {
      const web = fs.readFileSync(path.join(REPO, "apps/web/public/favicon.svg"));
      const marketing = fs.readFileSync(path.join(REPO, "apps/marketing/public/favicon.svg"));
      expect(web.equals(marketing), "apps/web and apps/marketing favicon.svg differ").toBe(true);
      expect(fs.existsSync(path.join(REPO, "apps/web/public/favicon.ico"))).toBe(false);
      expect(read("apps/web/app/root.tsx")).toContain('href: "/favicon.svg"');
      expect(read("apps/marketing/index.html")).toContain('href="/favicon.svg"');
    });
  });

  it("the shared chrome lives in @repo/ui as colocated patterns", () => {
    for (const name of ["HomeLogo", "NavDrawer", "SiteFooter", "ThemeToggle", "TopBar"]) {
      const files = fs.readdirSync(path.join(UI_SRC, "patterns", name));
      for (const suffix of [".tsx", ".styles.ts", ".stories.tsx", ".test.tsx"]) {
        expect(files, `${name}${suffix}`).toContain(`${name}${suffix}`);
      }
      expect(files).toContain("index.ts");
    }
  });
});
