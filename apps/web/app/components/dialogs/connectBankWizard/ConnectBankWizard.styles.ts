import { cva } from "@repo/ui/styled-system/css";

export const stack = cva({
  base: { display: "flex", flexDirection: "column", gap: "12px", minWidth: 0 },
});

export const footerRow = cva({
  base: { display: "flex", justifyContent: "space-between", gap: "12px", width: "100%" },
});

export const bankList = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    maxHeight: "320px",
    overflowY: "auto",
    minWidth: 0,
  },
});

const choiceBase = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  width: "100%",
  minWidth: 0,
  padding: "12px 14px",
  borderRadius: "lg",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "border.subtle",
  backgroundColor: "surface.card",
  color: "text.primary",
  textAlign: "left",
  cursor: "pointer",
  _hover: { borderColor: "primary", backgroundColor: "primary.subtle" },
  _focusVisible: {
    outline: "2px solid",
    outlineColor: "border.focusRing",
    outlineOffset: "2px",
  },
} as const;

export const bankCard = cva({ base: choiceBase });

export const methodCard = cva({ base: { ...choiceBase, alignItems: "flex-start" } });

export const methodIcon = cva({
  base: { color: "primary", flexShrink: 0, marginTop: "2px" },
});

export const bankAvatar = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "36px",
    height: "36px",
    borderRadius: "full",
    backgroundColor: "surface.sunken",
    color: "text.secondary",
    textStyle: "label.md",
    flexShrink: 0,
  },
});

export const bankCardBody = cva({
  base: { display: "flex", flexDirection: "column", gap: "2px", flex: 1, minWidth: 0 },
});

export const methodCardBody = bankCardBody;

export const bankCardTitleRow = cva({
  base: { display: "flex", alignItems: "center", gap: "8px", minWidth: 0 },
});

export const cardTitle = cva({
  base: { textStyle: "label.md", color: "text.primary", overflowWrap: "anywhere" },
});

export const cardMeta = cva({
  base: { textStyle: "body.sm", color: "text.muted", overflowWrap: "anywhere" },
});

export const helperText = cva({
  base: { margin: 0, textStyle: "body.sm", color: "text.muted" },
});

export const tokenHint = cva({
  base: { margin: 0, textStyle: "body.sm", color: "text.secondary" },
});

export const consentHeader = cva({
  base: { display: "flex", alignItems: "center", gap: "12px" },
});

export const bulletList = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "16px",
    borderRadius: "lg",
    backgroundColor: "surface.sunken",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
  },
});

export const bulletItem = cva({
  base: { display: "flex", gap: "12px", alignItems: "flex-start", color: "primary" },
});

export const centred = cva({
  base: { display: "flex", justifyContent: "center", padding: "16px 0" },
});

export const spinner = cva({
  base: {
    color: "primary",
    display: "inline-flex",
    _motionSafe: { animation: "spin 1s linear infinite" },
  },
});

export const statusIconSuccess = cva({
  base: { color: "status.positive.text", display: "inline-flex" },
});

export const statusIconDanger = cva({
  base: { color: "status.danger.text", display: "inline-flex" },
});

export const stateIcon = cva({
  base: { color: "primary", display: "inline-flex" },
});

export const stateHeading = cva({
  base: { margin: 0, textStyle: "label.sm", color: "text.muted" },
});

export const importedList = cva({
  base: { display: "flex", flexDirection: "column", gap: "8px" },
});

export const importedItem = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px",
    borderRadius: "lg",
    backgroundColor: "surface.sunken",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
  },
});

export const errorBox = cva({
  base: {
    padding: "16px",
    borderRadius: "lg",
    backgroundColor: "status.danger.bg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "status.danger.border",
  },
});

export const errorLabel = cva({
  base: { margin: 0, textStyle: "label.sm", color: "status.danger.text" },
});

export const errorMessageText = cva({
  base: {
    margin: "4px 0 0",
    textStyle: "body.sm",
    color: "text.primary",
    overflowWrap: "anywhere",
  },
});

export const noticeBox = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "16px",
    borderRadius: "lg",
    backgroundColor: "surface.sunken",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
  },
});

export const noticeRow = cva({
  base: { display: "flex", alignItems: "flex-start", gap: "10px", color: "primary" },
});
