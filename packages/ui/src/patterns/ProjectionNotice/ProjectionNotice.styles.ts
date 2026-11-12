import { cva } from "../../../styled-system/css";

export const projectionNotice = cva({
  base: {
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "status.info.border",
    backgroundColor: "status.info.bg",
    color: "status.info.text",
    fontSize: "xs",
    lineHeight: "1.5",
    p: "10px 14px",
    margin: "0",
  },
});
