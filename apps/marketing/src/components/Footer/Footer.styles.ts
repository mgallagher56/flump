import { cva } from "@repo/ui/styled-system/css";

/**
 * No extra space above the footer: each page already ends in its own padded section. The inner
 * column widens to the header's 1536px and, from the nav breakpoint, adds 16px to the footer's
 * own 24px so its left edge lines up with the header's 40px gutter.
 */
export const footerSpacing = cva({
  base: {
    mt: "0",
    "& > div": { maxWidth: "1536px", px: { base: "0", _navInline: "4" } },
    // The column heading sits as far from its first link as the links sit from each other.
    "& nav h3": { mb: "3" },
  },
});

export const footerBottomRow = cva({
  base: { display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "4" },
});

/**
 * The company line. While its details are placeholders (known #13) it reads as ordinary quiet
 * footer text: the launch guard, not styling, stops a placeholder reaching production.
 */
export const footerCompanyLine = cva({
  base: { color: "text.secondary" },
});

export const footerExternalIcon = cva({ base: { display: "inline", marginLeft: "1" } });
