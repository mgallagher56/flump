import { sva } from "@repo/ui/styled-system/css";

export const onboardingHeaderRecipe = sva({
  slots: ["root", "text"],
  base: {
    root: {
      display: "flex",
      alignItems: "center",
      gap: "3",
      pb: "3",
      borderBottomWidth: "1px",
      borderBottomStyle: "solid",
      borderBottomColor: "border.subtle",
    },
    text: { display: "flex", flexDirection: "column", gap: "0.5", minWidth: 0 },
  },
});
