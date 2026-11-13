import { canonicalLinkTag } from "./sitemap";

type HelmetPart = { toString(): string } | undefined;

export type HeadMetaInput = {
  helmet?: { title?: HelmetPart; meta?: HelmetPart; link?: HelmetPart } | null;
  appUrlScript: string;
  siteUrl: string | undefined;
  url: string;
  status: number;
};

/** Assembles the head markup injected at <!--head-meta-->. Canonicals are for 200 pages only. */
export function buildHeadMeta({
  helmet,
  appUrlScript,
  siteUrl,
  url,
  status,
}: HeadMetaInput): string {
  const canonical = status === 200 ? canonicalLinkTag(siteUrl, url) : "";
  return `
        ${helmet?.title?.toString() || ""}
        ${helmet?.meta?.toString() || ""}
        ${helmet?.link?.toString() || ""}
        ${canonical}
        ${appUrlScript}
      `;
}
