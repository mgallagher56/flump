// Ratchet for UX-GUIDELINES rules T2 and C2 (check K11, "judgement lint"): red and amber, and
// the alarm icons, are for errors and destructive actions, never for judging the user's money
// (an ordinary debt, a negative net worth, renting, a missed target). Count `status.danger` and
// `status.warning` token uses and the Lucide `Flame`, `TriangleAlert`, `Siren` and `Skull` icons
// per file, outside the allow-list below; a file may never gain one, and the baseline shrinks.

const JUDGEMENT_TOKEN = /\bstatus\.(?:danger|warning)\b/g;

/** Lucide names, including the legacy `AlertTriangle` alias and the `*Icon` export forms. */
const JUDGEMENT_ICONS = ["Flame", "TriangleAlert", "AlertTriangle", "Siren", "Skull"];
const ICON_NAME = `(?:${JUDGEMENT_ICONS.join("|")})(?:Icon)?`;
const LUCIDE_IMPORT = /\bimport\s*(?:type\s*)?\{([^}]*)\}\s*from\s*["']lucide-react["']/g;

/**
 * Components whose job is to show an error, a warning about Flump itself, or a destructive
 * action. Matched as path prefixes, so a component's `.tsx` and `.styles.ts` are both covered.
 * Each entry needs a reason; anything else that wants red or amber is a judgement to review.
 */
export const JUDGEMENT_ALLOW_LIST: ReadonlyArray<{ path: string; reason: string }> = [
  {
    path: "packages/ui/src/primitives/InlineAlert/",
    reason: "the error and warning message primitive; its tone is chosen per message",
  },
  {
    path: "packages/ui/src/primitives/Toast/",
    reason: "error toasts report a failed action",
  },
  {
    path: "packages/ui/src/primitives/StatusBadge/",
    reason: "the status primitive defines the tones; judgement happens at the call site",
  },
  {
    path: "packages/ui/src/primitives/Button/",
    reason: "the danger variant marks a destructive action (delete, disconnect)",
  },
  {
    path: "packages/ui/src/primitives/Menu/",
    reason: "the danger item variant marks a destructive menu action",
  },
  {
    path: "packages/ui/src/patterns/ConfirmDialog/",
    reason: "confirms a permanent delete (UX-GUIDELINES D1)",
  },
  {
    path: "packages/ui/src/primitives/FormField/",
    reason: "validation error text under a field",
  },
  {
    path: "packages/ui/src/primitives/TextInput/",
    reason: "invalid-state border paired with FormField error text",
  },
  {
    path: "packages/ui/src/primitives/Select/",
    reason: "invalid-state border paired with FormField error text",
  },
  {
    path: "packages/ui/src/primitives/Checkbox/",
    reason: "invalid-state border paired with FormField error text",
  },
  {
    path: "packages/ui/src/primitives/RadioCardGroup/",
    reason: "invalid-state border and its error text",
  },
  {
    path: "apps/web/app/components/core/inputs/",
    reason: "legacy FLP input, select and checkbox invalid states (same role as FormField)",
  },
  {
    path: "packages/ui/src/patterns/TaxRatesStatusBanner/",
    reason: "warns that Flump's own tax rates are provisional or a fallback, not the user's money",
  },
  {
    path: "apps/web/app/features/feedback/components/ErrorShell/",
    reason: "error page shell",
  },
  {
    path: "apps/web/app/features/feedback/components/RouteErrorBoundary/",
    reason: "route error boundary",
  },
  {
    path: "apps/web/app/features/feedback/components/RouteErrorState/",
    reason: "route error state",
  },
  {
    path: "apps/marketing/src/pages/NotFoundPage/",
    reason: "404 page",
  },
];

export function isJudgementAllowed(relPath: string): boolean {
  return JUDGEMENT_ALLOW_LIST.some(({ path }) => relPath.startsWith(path));
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Judgement tokens plus references to a judgement icon imported from lucide-react. */
export function countJudgementUses(source: string): number {
  const code = stripComments(source);
  let total = code.match(JUDGEMENT_TOKEN)?.length ?? 0;

  // Local names bound to a judgement icon: `Flame`, `TriangleAlert as Warn`, `SkullIcon`.
  const locals = new Set<string>();
  for (const [, specifiers] of code.matchAll(LUCIDE_IMPORT)) {
    for (const spec of (specifiers ?? "").split(",")) {
      const m = spec.trim().match(new RegExp(`^(?:type\\s+)?(${ICON_NAME})(?:\\s+as\\s+(\\w+))?$`));
      if (m) locals.add((m[2] ?? m[1]) as string);
    }
  }
  if (locals.size === 0) return total;
  const withoutImports = code.replace(LUCIDE_IMPORT, "");
  for (const name of locals) {
    total += withoutImports.match(new RegExp(`(?<![\\w$.])${name}(?![\\w$])`, "g"))?.length ?? 0;
  }
  return total;
}
