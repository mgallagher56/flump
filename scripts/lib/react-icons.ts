// Ratchet for the E15 icon migration: `react-icons` is being replaced by Lucide (the `Icon`
// primitive in @repo/ui). Count `react-icons/...` import statements per file; a file may never
// gain imports, and its baseline entry must shrink as it migrates.

const IMPORT_FROM = /\bfrom\s*["']react-icons(?:\/[\w-]+)?["']/g;
const BARE_IMPORT = /\bimport\s*["']react-icons(?:\/[\w-]+)?["']/g;
const DYNAMIC_IMPORT = /\b(?:import|require)\(\s*["']react-icons(?:\/[\w-]+)?["']\s*\)/g;

export function countReactIconsImports(source: string): number {
  // Strip comments so a mention in prose does not count.
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  return (
    (code.match(IMPORT_FROM)?.length ?? 0) +
    (code.match(BARE_IMPORT)?.length ?? 0) +
    (code.match(DYNAMIC_IMPORT)?.length ?? 0)
  );
}
