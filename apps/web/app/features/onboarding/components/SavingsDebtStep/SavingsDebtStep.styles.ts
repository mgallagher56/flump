import { sva } from "@repo/ui/styled-system/css";

export const savingsDebtStepRecipe = sva({
  slots: ["pair"],
  base: {
    pair: { display: "grid", gap: "4", gridTemplateColumns: { base: "1fr", sm: "3fr 2fr" } },
  },
});
