import { css } from "@repo/ui/styled-system/css";

/**
 * The band: positioned, and its own stacking context, so it paints above the band before it and
 * below the band after it, never across them, and its bubble layer sits under its content.
 */
export const band = css({ position: "relative", isolation: "isolate" });

/** Under everything in the band, above the band's own fill (MK8: never over text). */
export const bubbleLayer = css({ position: "absolute", inset: 0, zIndex: -1 });
