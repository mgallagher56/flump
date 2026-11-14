import { cva } from "../../../styled-system/css";

export const appShellRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    backgroundColor: "surface.canvas",
    color: "text.primary",
  },
});

export const appShellBody = cva({
  base: {
    display: "flex",
    flex: "1",
    width: "100%",
    maxWidth: "1536px",
    marginX: "auto",
  },
});

export const appShellSide = cva({
  base: {
    display: { base: "none", lg: "block" },
    flexShrink: 0,
    width: "260px",
    padding: "4",
    borderRightWidth: "1px",
    borderRightStyle: "solid",
    borderRightColor: "border.subtle",
  },
});

export const appShellMain = cva({
  base: {
    flex: "1",
    minWidth: 0,
    px: { base: "4", md: "6", lg: "10" },
    pt: { base: "5", lg: "8" },
    // Room for the phone bottom bar, which shows below the shared nav breakpoint only.
    pb: { base: "calc(88px + env(safe-area-inset-bottom))", _navInline: "14" },
    _focusVisible: { outline: "none" },
  },
});
