import { cva } from "../../../styled-system/css";

export const storagePreference = cva({
  base: { display: "flex", flexDirection: "column", gap: "2", maxWidth: "xl" },
});

export const storagePreferenceStatus = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0 },
});
