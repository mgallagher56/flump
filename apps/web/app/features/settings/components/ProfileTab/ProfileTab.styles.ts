import { cva } from "@repo/ui/styled-system/css";

export const avatarRow = cva({
  base: {
    display: "flex",
    alignItems: "center",
    flexWrap: { base: "wrap", sm: "nowrap" },
    gap: "5",
    padding: "4",
    borderRadius: "lg",
    backgroundColor: "surface.sunken",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
  },
});

export const avatarText = cva({
  base: { display: "flex", flexDirection: "column", gap: "1", flex: 1, minWidth: 0 },
});

export const avatarTitle = cva({
  base: { textStyle: "label.md", color: "text.primary", margin: 0 },
});

export const avatarHelp = cva({
  base: { textStyle: "body.sm", color: "text.muted", margin: 0 },
});

export const avatarActions = cva({
  base: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "2", paddingTop: "2" },
});

export const checkRow = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    gap: "3",
    cursor: "pointer",
    "& input": { marginTop: "1", accentColor: "primary" },
  },
});

export const checkText = cva({
  base: { display: "flex", flexDirection: "column", gap: "1" },
});

export const checkTitle = cva({
  base: { textStyle: "label.md", color: "text.primary" },
});

export const checkHelp = cva({
  base: { textStyle: "body.sm", color: "text.muted" },
});

export const linkRow = cva({
  base: { display: "flex", flexWrap: "wrap", gap: "3" },
});
