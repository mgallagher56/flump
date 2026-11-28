import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import type { LucideIcon } from "lucide-react";
import { Button } from "../../packages/ui/src/primitives/Button/Button";
import { Card } from "../../packages/ui/src/primitives/Card/Card";
import { ExampleTag } from "../../packages/ui/src/primitives/ExampleTag/ExampleTag";
import { IconTile, type IconTileDomain } from "../../packages/ui/src/primitives/IconTile/IconTile";
import { StatusBadge } from "../../packages/ui/src/primitives/StatusBadge/StatusBadge";
import { REPO_ROOT } from "./tokens";

const webRequire = createRequire(resolve(REPO_ROOT, "apps/web/package.json"));
const uiRequire = createRequire(resolve(REPO_ROOT, "packages/ui/package.json"));

const React = webRequire("react") as typeof import("react");
const { renderToStaticMarkup } = webRequire(
  "react-dom/server",
) as typeof import("react-dom/server");
const lucide = uiRequire("lucide-react") as Record<string, LucideIcon>;

let cachedUiCss: string | null = null;

function renderStaticClean(element: React.ReactElement): string {
  return renderToStaticMarkup(element).replaceAll(' xmlns="http://www.w3.org/2000/svg"', "");
}

function stripCssLayerBlock(css: string, layerName: string): string {
  const marker = `@layer ${layerName} {`;
  const start = css.indexOf(marker);
  if (start === -1) return css;

  let depth = 0;
  let end = -1;
  for (let i = start + marker.length - 1; i < css.length; i += 1) {
    const ch = css[i];
    if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }

  if (end === -1) return css;
  return `${css.slice(0, start)}${css.slice(end)}`.trim();
}

export function getUiSpecimensCss(): string {
  if (cachedUiCss !== null) return cachedUiCss;

  const pandaBin = resolve(REPO_ROOT, "packages/ui/node_modules/.bin/panda");
  const uiDir = resolve(REPO_ROOT, "packages/ui");
  const tmpCssPath = resolve(tmpdir(), `flump-brand-ui-${process.pid}-${Date.now()}.css`);

  try {
    execFileSync(
      pandaBin,
      [
        "cssgen",
        "--cwd",
        uiDir,
        "--include",
        "./src/primitives/Button/Button.styles.ts",
        "--include",
        "./src/primitives/Card/Card.styles.ts",
        "--include",
        "./src/primitives/ExampleTag/ExampleTag.styles.ts",
        "--include",
        "./src/primitives/StatusBadge/StatusBadge.styles.ts",
        "--include",
        "./src/primitives/Icon/Icon.styles.ts",
        "--include",
        "./src/primitives/IconTile/IconTile.styles.ts",
        "-o",
        tmpCssPath,
      ],
      { stdio: "pipe" },
    );
    let rawCss = existsSync(tmpCssPath) ? readFileSync(tmpCssPath, "utf8") : "";
    rawCss = stripCssLayerBlock(rawCss, "reset");
    rawCss = stripCssLayerBlock(rawCss, "base");
    rawCss = rawCss.replace(
      "@layer reset, base, tokens, recipes, utilities;",
      "@layer tokens, recipes, utilities;",
    );
    rawCss = rawCss.replaceAll(":where(:root, :host)", ":where(:root, :host), .theme-light");
    rawCss = rawCss.replaceAll(
      ":where(.dark, [data-theme='dark'])",
      ":where(.dark, [data-theme='dark']), .theme-dark",
    );
    for (const dup of [
      "    --shadows-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);\n",
      "    --radii-sm: 6px;\n",
      "    --radii-md: 8px;\n",
      "    --radii-lg: 12px;\n",
      "    --radii-xl: 16px;\n",
      "    --radii-2xl: 24px;\n",
    ]) {
      rawCss = rawCss.replace(dup, "");
    }
    rawCss = rawCss.replace(/—/g, "-").replace(/https?:\/\//gi, "");
    cachedUiCss = rawCss;
    return cachedUiCss;
  } finally {
    rmSync(tmpCssPath, { force: true });
  }
}

export function renderUiButtonsSpecimen(): string {
  const buttons = React.createElement(
    "div",
    { className: "ui-specimen-row", "data-ui-specimen": "button" },
    React.createElement(Button, { type: "button", variant: "primary" }, "Request an invite"),
    React.createElement(Button, { type: "button", variant: "secondary" }, "Edit details"),
    React.createElement(Button, { type: "button", variant: "outline" }, "Interactive preview"),
    React.createElement(Button, { type: "button", variant: "ghost" }, "Cancel"),
    React.createElement(Button, { type: "button", variant: "dangerSubtle" }, "Delete debt"),
  );
  return renderStaticClean(buttons);
}

export function renderUiExampleTagSpecimen(variant: "paper" | "onContrast" = "paper"): string {
  return `<span class="ui-tag-slot" data-ui-specimen="example-tag">${renderStaticClean(
    React.createElement(ExampleTag, { variant }),
  )}</span>`;
}

export function renderUiStatusBadgesSpecimen(): string {
  const badges = React.createElement(
    "div",
    { className: "ui-specimen-row", "data-ui-specimen": "status-badge" },
    React.createElement(StatusBadge, { variant: "positive", showIcon: true }, "Saved"),
    React.createElement(StatusBadge, { variant: "warning", showIcon: true }, "Unverified estimate"),
    React.createElement(StatusBadge, { variant: "danger", showIcon: true }, "Could not save"),
    React.createElement(StatusBadge, { variant: "info", showIcon: true }, "Connected"),
    React.createElement(StatusBadge, { variant: "neutral" }, "Illustration, not saved"),
    React.createElement(StatusBadge, { variant: "brand" }, "Preview"),
  );
  return renderStaticClean(badges);
}

export function renderUiCardsSpecimen(): string {
  const stack = React.createElement(
    "div",
    { className: "ui-card-trio", "data-ui-specimen": "card" },
    React.createElement(
      Card,
      { as: "article", material: "plain", elevation: "resting", padding: "lg" },
      React.createElement(
        "div",
        { className: "ui-card-inner" },
        React.createElement("h4", { className: "card-title" }, "Resting data card"),
        React.createElement(
          "p",
          { className: "prose" },
          "Saved balances, budgets and tables sit on solid cards with a hairline edge so figures stay sharp.",
        ),
        React.createElement("p", { className: "ui-card-figure num" }, "£21,000"),
      ),
    ),
    React.createElement(
      Card,
      { as: "article", material: "glass", elevation: "resting", padding: "lg" },
      React.createElement(
        "div",
        { className: "ui-card-inner" },
        React.createElement("h4", { className: "card-title" }, "Soft glass card"),
        React.createElement(
          "p",
          { className: "prose" },
          "A neutral translucent fill with a top inner light and diagonal sheen for marketing features.",
        ),
        React.createElement(
          "div",
          { className: "ui-card-foot" },
          React.createElement(StatusBadge, { variant: "brand" }, "Marketing surface"),
        ),
      ),
    ),
    React.createElement(
      Card,
      { as: "article", material: "paper", elevation: "resting", padding: "lg" },
      React.createElement(
        "div",
        { className: "ui-card-inner" },
        React.createElement(
          "div",
          { className: "ui-card-head" },
          React.createElement("h4", { className: "card-title" }, "Paper document card"),
          React.createElement(ExampleTag, { variant: "paper" }),
        ),
        React.createElement(
          "p",
          { className: "prose num" },
          "Ruled paper texture, a 1 pixel edge and a soft shadow for sample statements.",
        ),
        React.createElement("p", { className: "ui-card-figure num" }, "£3,249 a month"),
      ),
    ),
  );
  return renderStaticClean(stack);
}

interface DomainTileSpec {
  domain: IconTileDomain;
  iconName: string;
  area: string;
  colour: string;
  scope: string;
}

const DOMAIN_TILE_SPECS: ReadonlyArray<DomainTileSpec> = [
  {
    domain: "net-worth",
    iconName: "Landmark",
    area: "Net worth and mortgage",
    colour: "Teal",
    scope: "Headline picture and home equity",
  },
  {
    domain: "savings",
    iconName: "PiggyBank",
    area: "Savings",
    colour: "Sage",
    scope: "Cash pots and AER growth",
  },
  {
    domain: "debt",
    iconName: "CreditCard",
    area: "Debt and borrowing",
    colour: "Apricot",
    scope: "Cards, loans and overdrafts, never red",
  },
  {
    domain: "pension",
    iconName: "TrendingUp",
    area: "Pension",
    colour: "Sky",
    scope: "Workplace and personal pots",
  },
  {
    domain: "tax",
    iconName: "Receipt",
    area: "Pay and Self Assessment",
    colour: "Violet",
    scope: "Income and UK tax estimates",
  },
  {
    domain: "budget",
    iconName: "Wallet",
    area: "Budget",
    colour: "Rose",
    scope: "Monthly bills and breathing room",
  },
  {
    domain: "accounts",
    iconName: "Building2",
    area: "Accounts",
    colour: "Blue-teal / soft pink",
    scope: "Account lists and general highlights",
  },
];

export function renderUiDomainTilesSpecimen(): string {
  const items = DOMAIN_TILE_SPECS.map((spec) => {
    const iconComp = lucide[spec.iconName];
    if (!iconComp) {
      throw new Error(`Missing Lucide icon ${spec.iconName}`);
    }
    const tileMarkup = renderStaticClean(
      React.createElement(IconTile, {
        icon: iconComp,
        domain: spec.domain,
        colouredIcon: true,
      }),
    );
    return `<div class="domain-tile-card">
      ${tileMarkup}
      <div class="domain-tile-meta">
        <strong class="domain-tile-name">${spec.area}</strong>
        <span class="domain-tile-colour">${spec.colour}</span>
        <span class="swatch-note">${spec.scope}</span>
      </div>
    </div>`;
  }).join("");

  return `<div class="domain-tile-grid" data-ui-specimen="icon-tile">${items}</div>`;
}
