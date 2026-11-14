import { cva } from "@repo/ui/styled-system/css";

export const pageRoot = cva({
  base: { minHeight: "100vh", display: "flex", flexDirection: "column" },
});

/**
 * The public `/tools` shell. Width, top spacing and gutters match the marketing `ToolPage` and
 * `ToolsIndexPage` containers, so the same page lines up on both sites (RESCORE B, shared item 5).
 */
export const pageContent = cva({
  base: {
    flex: 1,
    width: "100%",
    margin: "0 auto",
    // The web app shell's <main> already pads 16px (24px from md) on top and 12px (24px from md)
    // at the sides; these add only the difference, so the totals equal the marketing pages'
    // page.top (20px, 32px from lg) and page.gutter (16px, 24px from md).
    pt: { base: "1", md: "0", lg: "2" },
    pb: "12",
    px: { base: "1", md: "0" },
    display: "flex",
    flexDirection: "column",
    // PageHeader brings its own bottom margin, so the gap stays small; the same values as the
    // marketing ToolPage and ToolsIndexPage containers. The guide gets extra room above it.
    gap: "4",
    "& > [data-tool-guide]": { marginTop: "4" },
  },
  variants: {
    width: {
      /** A single tool page. */
      // Less the marketing container's own side padding (page.gutter.md on each side), which the
      // web shell puts outside this box, so the content column is the same width on both sites.
      default: { maxWidth: "calc({sizes.5xl} - 2 * {spacing.page.gutter.md})" },
      /** The tools index grid. */
      wide: { maxWidth: "calc({sizes.6xl} - 2 * {spacing.page.gutter.md})" },
    },
  },
  defaultVariants: { width: "default" },
});
