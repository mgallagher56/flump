import { sva } from "@repo/ui/styled-system/css";

export const housingStepRecipe = sva({
  slots: ["pair"],
  base: {
    pair: { display: "grid", gap: "4", gridTemplateColumns: { base: "1fr", sm: "1fr 1fr" } },
  },
});
