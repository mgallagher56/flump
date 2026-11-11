import type { ComponentProps } from "react";
import { cx, type RecipeVariantProps } from "../../../styled-system/css";
import { __name__Recipe } from "./__Name__.styles";

export type __Name__Props = ComponentProps<"div"> & RecipeVariantProps<typeof __name__Recipe>;

export const __Name__ = ({ className, tone, ...props }: __Name__Props) => (
  <div
    id="__name__"
    data-testid="__name__"
    className={cx(__name__Recipe({ tone }), className)}
    {...props}
  />
);

export default __Name__;
