import { renderK2LogoSvg } from "../renderHelpers";
import type { BrandTokens } from "../tokens";

interface HistoricalBlobColors {
  bodyTop: string;
  bodyBottom: string;
  shadow: string;
  highlight: string;
}

interface HistoricalFaviconColors {
  bg: string;
  fg: string;
}

// Exact paths and radial gradient geometry from FlumpLogo.tsx at commits 14f119be6, c79bbaf67, 1511013dd and 515cbcb92.
function renderHistoricalBlobSvg(id: string, label: string, c: HistoricalBlobColors): string {
  return `<svg width="64" height="64" viewBox="0 0 200 200" role="img" aria-label="${label}">
    <defs>
      <radialGradient cx="42%" cy="30%" id="${id}" r="75%">
        <stop offset="0" stop-color="${c.bodyTop}"/>
        <stop offset="1" stop-color="${c.bodyBottom}"/>
      </radialGradient>
    </defs>
    <ellipse cx="100" cy="168" rx="62" ry="9" fill="${c.shadow}" opacity="0.18"/>
    <path d="M100 38c36 0 64 30 64 66 0 36-20 62-64 62s-64-26-64-62c0-36 28-66 64-66z" fill="url(#${id})"/>
    <path fill="${c.highlight}" d="M78 52c14-9 38-9 50 3-14-3-34-1-50-3z" opacity="0.6"/>
    <path fill="${c.highlight}" d="M52 92c4-16 16-28 28-34-8 12-8 22-12 34 2 14 8 24 6 32-12-8-26-18-22-32z" opacity="0.4"/>
    <path fill="${c.highlight}" d="M146 82c8 10 12 24 8 40-6-8-10-20-8-40z" opacity="0.25"/>
  </svg>`;
}

// Exact SVG source from apps/web/public/favicon.svg at commits c2105f10d, 1511013dd and a713ff025.
function renderHistoricalFaviconSvg(label: string, c: HistoricalFaviconColors): string {
  return `<svg width="32" height="32" viewBox="0 0 32 32" role="img" aria-label="${label}">
    <rect fill="${c.bg}" width="32" height="32" rx="8"/>
    <path fill="${c.fg}" d="M10 8h13v4h-8.5v3H21v4h-6.5v5H10z"/>
  </svg>`;
}

// Exact geometry from apps/web/public/favicon.svg (9861ecb37, PR 981).
function renderCandidateCFaviconSvg(label: string): string {
  return `<svg width="32" height="32" viewBox="32 32 140 140" role="img" aria-label="${label}">
    <circle cx="108" cy="54" r="20" fill="var(--color-logo-violet)"/>
    <circle cx="140" cy="92" r="28" fill="var(--color-logo-sky)"/>
    <circle cx="84" cy="122" r="52" fill="var(--color-logo-backing)"/>
    <circle cx="84" cy="122" r="48" fill="var(--color-logo-teal)"/>
    <ellipse cx="66" cy="98" rx="11" ry="6" transform="rotate(-32 66 98)" fill="var(--color-logo-glint)" opacity="0.9"/>
  </svg>`;
}

export function renderLogoHistoryDiagram(tokens: BrandTokens): string {
  const stages = [
    {
      date: "12 and 14 Nov 2026",
      title: "Direction C teal blob",
      commit: "14f119be6, c79bbaf67, c2105f10d",
      lightBg: "#f5f1ea",
      lightInk: "#2b2620",
      darkBg: "#1d1a17",
      darkInk: "#f4efe7",
      lightLogo: renderHistoricalBlobSvg("hist-blob-c-light", "Direction C light teal blob logo", {
        bodyTop: "#0f6b5e",
        bodyBottom: "#0a564b",
        shadow: "#2b2620",
        highlight: "#f6f1e8",
      }),
      darkLogo: renderHistoricalBlobSvg("hist-blob-c-dark", "Direction C dark mint blob logo", {
        bodyTop: "#6fd0ba",
        bodyBottom: "#0a564b",
        shadow: "#f4efe7",
        highlight: "#fffdf9",
      }),
      lightFavicon: renderHistoricalFaviconSvg("Direction C light favicon", {
        bg: "#0f6b5e",
        fg: "#ffffff",
      }),
      darkFavicon: renderHistoricalFaviconSvg("Direction C dark favicon", {
        bg: "#6fd0ba",
        fg: "#1d1a17",
      }),
      note: "The teal blob first landed on 12 Nov (14f119be6), where bare stopColor tokens fell back to black until c79bbaf67 fixed them on 14 Nov. Favicon c2105f10d paired a teal or mint tile with a white or dark F.",
    },
    {
      date: "24 Nov 2026",
      title: "Midnight and Mint charcoal blob",
      commit: "1511013dd (PR 901)",
      lightBg: "#eef6f3",
      lightInk: "#0f2a2a",
      darkBg: "#14171c",
      darkInk: "#f1eee8",
      lightLogo: renderHistoricalBlobSvg("hist-blob-mm-light", "24 Nov charcoal light blob logo", {
        bodyTop: "#2c323b",
        bodyBottom: "#14171c",
        shadow: "#0f2a2a",
        highlight: "#f8fcfa",
      }),
      darkLogo: renderHistoricalBlobSvg("hist-blob-mm-dark", "24 Nov mint dark blob logo", {
        bodyTop: "#9be3d2",
        bodyBottom: "#6fd0ba",
        shadow: "#f1eee8",
        highlight: "#0e1a17",
      }),
      lightFavicon: renderHistoricalFaviconSvg("24 Nov charcoal light favicon", {
        bg: "#14171c",
        fg: "#f8fcfa",
      }),
      darkFavicon: renderHistoricalFaviconSvg("24 Nov mint dark favicon", {
        bg: "#6fd0ba",
        fg: "#14171c",
      }),
      note: "PR 901 painted the mark with the button fill tokens (primary.solid and primary.hover) to match the Midnight and Mint mock-ups, turning the light logo and favicon charcoal.",
    },
    {
      date: "25 Nov 2026",
      title: "Light logo turns teal",
      commit: "515cbcb92, a713ff025 (PR 937)",
      lightBg: "#eef6f3",
      lightInk: "#0f2a2a",
      darkBg: "#14171c",
      darkInk: "#f1eee8",
      lightLogo: renderHistoricalBlobSvg("hist-blob-teal-light", "25 Nov teal light blob logo", {
        bodyTop: "#0b6b5d",
        bodyBottom: "#084f45",
        shadow: "#0f2a2a",
        highlight: "#f8fcfa",
      }),
      darkLogo: renderHistoricalBlobSvg("hist-blob-teal-dark", "25 Nov mint dark blob logo", {
        bodyTop: "#9be3d2",
        bodyBottom: "#6fd0ba",
        shadow: "#f1eee8",
        highlight: "#0e1a17",
      }),
      lightFavicon: renderHistoricalFaviconSvg("25 Nov teal light favicon", {
        bg: "#084f45",
        fg: "#f8fcfa",
      }),
      darkFavicon: renderHistoricalFaviconSvg("25 Nov mint dark favicon", {
        bg: "#6fd0ba",
        fg: "#14171c",
      }),
      note: "After the owner reported the light logo as black, PR 937 added primary.mark and primary.markLit so the light mark and favicon returned to teal while dark stayed mint.",
    },
    {
      date: "27 Nov 2026",
      title: "K2 glass bubbles and candidate C",
      commit: "37bc21245, 9861ecb37 (PR 981)",
      lightBg: "#eef6f3",
      lightInk: "#0f2a2a",
      darkBg: "#14171c",
      darkInk: "#f1eee8",
      lightLogo: renderK2LogoSvg(tokens, {
        idPrefix: "hist-k2-light",
        sizePx: 64,
        title: "K2 logo in light theme",
      }),
      darkLogo: renderK2LogoSvg(tokens, {
        idPrefix: "hist-k2-dark",
        sizePx: 64,
        title: "K2 logo in dark theme",
      }),
      lightFavicon: renderCandidateCFaviconSvg("Candidate C favicon in light theme"),
      darkFavicon: renderCandidateCFaviconSvg("Candidate C favicon in dark theme"),
      note: "Chosen from three option rounds: three climbing glass bubbles in the logo.* tokens across web, marketing and mobile, with flat-fill favicon candidate C and new mobile app icons.",
    },
  ];

  const cardsHtml = stages
    .map((stage, idx) => {
      const lightClass = idx === 3 ? "theme-light" : "";
      const darkClass = idx === 3 ? "theme-dark" : "";
      return `<article class="card">
        <div class="badge-row" style="justify-content:space-between">
          <span class="pill num">${stage.date}</span>
          <code>${stage.commit}</code>
        </div>
        <h4 class="card-title">${stage.title}</h4>
        <div class="logo-stage-pair">
          <div class="logo-mini-ground ${lightClass}" style="background:${stage.lightBg};color:${stage.lightInk}">
            <span class="swatch-note" style="color:${stage.lightInk}">Light</span>
            <div class="logo-mini-icons">
              ${stage.lightLogo}
              ${stage.lightFavicon}
            </div>
          </div>
          <div class="logo-mini-ground ${darkClass}" style="background:${stage.darkBg};color:${stage.darkInk}">
            <span class="swatch-note" style="color:${stage.darkInk}">Dark</span>
            <div class="logo-mini-icons">
              ${stage.darkLogo}
              ${stage.darkFavicon}
            </div>
          </div>
        </div>
        <p class="swatch-note">${stage.note}</p>
      </article>`;
    })
    .join("");

  return `<div class="grid-2">${cardsHtml}</div>`;
}
