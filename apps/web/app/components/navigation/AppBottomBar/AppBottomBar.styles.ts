import { cva } from "@repo/ui/styled-system/css";

export const spacer = cva({
  base: {
    // Phones only: from the shared nav breakpoint (768px) the desktop navigation shows instead.
    display: { base: "block", _navInline: "none" },
    height: "calc(72px + env(safe-area-inset-bottom, 0px))",
  },
});
