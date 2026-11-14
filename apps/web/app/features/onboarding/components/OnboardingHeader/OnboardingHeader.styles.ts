import { sva } from "@repo/ui/styled-system/css";

export const onboardingHeaderRecipe = sva({
  slots: ["root", "text", "lead", "exit"],
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
    text: { display: "flex", flexDirection: "column", gap: "0.5", minWidth: 0, flex: "1 1 auto" },
    // On a phone the lead line would wrap beside the button; the heading says enough there.
    lead: { display: { base: "none", sm: "block" } },
    exit: { flex: "none", alignSelf: "center" },
  },
});
