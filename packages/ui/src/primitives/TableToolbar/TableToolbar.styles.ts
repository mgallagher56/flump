import { cva } from "../../../styled-system/css";

/** The bar above a `<Table>`: a search field, then any filter controls, wrapping at 375. */
export const tableToolbar = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: "3",
    marginBlockEnd: "3",
  },
});

export const tableSearchField = cva({
  base: {
    flex: "1 1 200px",
    maxWidth: "320px",
    minWidth: "0",
  },
});
