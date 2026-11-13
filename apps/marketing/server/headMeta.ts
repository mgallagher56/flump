import { canonicalLinkTag, ogUrlTag } from "./sitemap";

type HelmetPart = { toString(): string } | undefined;

const HOISTED_RUN = /^(?:<(?:title|meta|link)\b[^>]*?(?:\/>|>[^<]*<\/title>))+/;

/**
 * react-helmet-async 3 on React 19 leaves `helmet` empty and renders title/meta/link tags as a
 * leading run of the app HTML. Splits that run off so it can be emitted in <head>; React 19
 * hoistables hydrate against document.head.
 */
export function splitHoistables(appHtml: string): { hoisted: string; rest: string } {
  const match = HOISTED_RUN.exec(appHtml);
  if (!match) return { hoisted: "", rest: appHtml };
  return { hoisted: match[0], rest: appHtml.slice(match[0].length) };
}

export type HeadMetaInput = {
  /** Leading hoistable tags split off the app HTML (see splitHoistables). */
  hoisted?: string;
  helmet?: { title?: HelmetPart; meta?: HelmetPart; link?: HelmetPart } | null;
  appUrlScript: string;
  siteUrl: string | undefined;
  url: string;
  status: number;
};

/** Assembles the head markup injected at <!--head-meta-->. Canonicals are for 200 pages only. */
export function buildHeadMeta({
  hoisted,
  helmet,
  appUrlScript,
  siteUrl,
  url,
  status,
}: HeadMetaInput): string {
  const canonical = status === 200 ? canonicalLinkTag(siteUrl, url) : "";
  const ogUrl = status === 200 ? ogUrlTag(siteUrl, url) : "";
  return `
        ${hoisted || ""}
        ${helmet?.title?.toString() || ""}
        ${helmet?.meta?.toString() || ""}
        ${helmet?.link?.toString() || ""}
        ${canonical}
        ${ogUrl}
        ${appUrlScript}
      `;
}
