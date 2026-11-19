import { cva } from "@repo/ui/styled-system/css";

/** Ownership and share sit in the parent form's own stack, with its gap. */
export const jointFields = cva({
  base: { display: "contents" },
});
