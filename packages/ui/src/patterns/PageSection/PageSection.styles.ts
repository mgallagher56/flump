import { sva } from "../../../styled-system/css";

/** E17 5A: a section is its header, then its content 12px below. Sections sit 36px apart. */
export const pageSection = sva({
  slots: ["root", "content"],
  base: {
    root: {
      display: "flex",
      flexDirection: "column",
      gap: "3",
      minWidth: "0",
    },
    content: {
      display: "flex",
      flexDirection: "column",
      gap: "4",
      minWidth: "0",
    },
  },
});
