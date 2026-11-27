import { css } from "@repo/ui/styled-system/css";

export const mainContent = css({ flex: "1", _focus: { outline: "none" } });

/** More air before the index than between the other bands (the approved prototype: 2rem more). */
export const indexBand = css({ pt: { base: "20", md: "24" } });
