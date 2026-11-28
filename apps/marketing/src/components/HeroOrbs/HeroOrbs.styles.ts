import { css } from "@repo/ui/styled-system/css";

/** The band's colour, read back by the live scene for its backdrop. Never seen. */
export const canvasSwatch = css({
  position: "absolute",
  width: "0",
  height: "0",
  color: "surface.canvas",
});
