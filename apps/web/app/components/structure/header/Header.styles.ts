import { cva } from "@repo/ui/styled-system/css";

/** The theme switch swaps at the shared navWide condition (1024px), never a raw breakpoint. */
export const compactOnly = cva({ base: { _navWide: { display: "none" } } });
export const wideOnly = cva({ base: { display: "none", _navWide: { display: "flex" } } });
