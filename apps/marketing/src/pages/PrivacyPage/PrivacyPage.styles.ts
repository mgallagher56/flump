import { cva } from "@repo/ui/styled-system/css";

/** The page's version history: quieter than the text above it. */
export const versionHistory = cva({
  base: { "&&": { color: "text.muted", listStyleType: "none", pl: "0" } },
});
