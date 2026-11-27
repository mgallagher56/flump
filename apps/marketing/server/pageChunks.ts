/**
 * Which built files a page loads, read from Vite's build manifest (`dist/client/.vite/manifest.json`).
 * Each page is its own chunk (`src/lazyPages.tsx`). The server preloads the requested page's chunk
 * and the shared chunks it imports, so hydration does not wait for a second round trip; the
 * marketing weight check (`scripts/check-marketing-weight.ts`) measures the home page from the same
 * lists. Pure: no file access.
 */

/** The part of a Vite manifest entry this module reads. */
interface ManifestChunk {
  readonly file: string;
  readonly imports?: readonly string[];
  readonly dynamicImports?: readonly string[];
  readonly isEntry?: boolean;
}

export type BuildManifest = Readonly<Record<string, ManifestChunk>>;

/** The files a chunk loads at once: itself and everything it imports statically, in load order. */
export function staticClosure(manifest: BuildManifest, key: string): string[] {
  const seen = new Set<string>();
  const files: string[] = [];
  const visit = (k: string) => {
    if (seen.has(k)) return;
    seen.add(k);
    const chunk = manifest[k];
    if (!chunk) throw new Error(`The build manifest has no chunk ${k}`);
    for (const imported of chunk.imports ?? []) visit(imported);
    files.push(chunk.file);
  };
  visit(key);
  return files;
}

/** The manifest key of the client entry (the script index.html loads). */
export function entryKey(manifest: BuildManifest): string {
  const entries = Object.entries(manifest).filter(([, chunk]) => chunk.isEntry);
  if (entries.length !== 1) throw new Error(`Expected one entry chunk, found ${entries.length}`);
  return entries[0]?.[0] as string;
}

/** A page's own files: its chunk and the shared chunks it imports, less what the entry already loads. */
export function pageFiles(manifest: BuildManifest, pageKey: string): string[] {
  const entry = new Set(staticClosure(manifest, entryKey(manifest)));
  return staticClosure(manifest, pageKey).filter((file) => !entry.has(file));
}

/**
 * The files a page may load later by dynamic import (for home: GSAP and three.js), less anything
 * it already loads at once. The entry's own dynamic imports are the other pages' chunks, which this
 * page never loads, so the walk does not enter the entry.
 */
export function pageLazyFiles(manifest: BuildManifest, pageKey: string): string[] {
  const entry = entryKey(manifest);
  const first = new Set([...staticClosure(manifest, entry), ...staticClosure(manifest, pageKey)]);
  const lazy = new Set<string>();
  const seen = new Set<string>([entry]);
  const walk = (k: string) => {
    if (seen.has(k)) return;
    seen.add(k);
    const chunk = manifest[k];
    if (!chunk) return;
    for (const imported of chunk.imports ?? []) walk(imported);
    for (const dynamic of chunk.dynamicImports ?? []) {
      for (const file of staticClosure(manifest, dynamic)) if (!first.has(file)) lazy.add(file);
      walk(dynamic);
    }
  };
  walk(pageKey);
  return [...lazy];
}

/** `<link rel="modulepreload">` tags for a page's own files. */
export function pagePreloadLinks(manifest: BuildManifest, pageKey: string): string {
  if (!manifest[pageKey]) return "";
  return pageFiles(manifest, pageKey)
    .filter((file) => file.endsWith(".js"))
    .map((file) => `<link rel="modulepreload" crossorigin href="/${file}">`)
    .join("");
}
