import { cva } from "@repo/ui/styled-system/css";

// The cookies page's item list is styled by the shared legal page recipes.
export { item, itemList } from "../../components/LegalPage/LegalPage.styles";

/** The page's version history: quieter than the text above it. */
export const versionHistory = cva({
  base: { "&&": { color: "text.muted", listStyleType: "none", pl: "0" } },
});
