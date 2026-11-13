import { sva } from "@repo/ui/styled-system/css";

export const bankStepRecipe = sva({
  slots: ["badge"],
  base: { badge: { alignSelf: "flex-start" } },
});
