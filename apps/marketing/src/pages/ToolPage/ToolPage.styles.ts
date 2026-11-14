import { css } from "@repo/ui/styled-system/css";

export const pageStyle = css({ minHeight: "100vh", display: "flex", flexDirection: "column" });

export const mainStyle = css({ flex: "1" });

/** Same width and top spacing as the web tool page (`SignedOutPage`), so h1s line up. */
export const containerStyle = css({
  maxWidth: "5xl",
  mx: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "4",
  pt: { base: "page.top.sm", lg: "page.top.lg" },
  pb: "12",
  px: { base: "page.gutter.sm", md: "page.gutter.md" },
});

export const guideStyle = css({ marginTop: "4" });
