import type { FC, HTMLAttributes } from "react";
import { cx } from "../../../styled-system/css";
import { VisuallyHidden } from "../VisuallyHidden";
import { skeletonLastLine, skeletonLines, skeletonRecipe } from "./Skeleton.styles";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  shape?: "text" | "line" | "block" | "circle";
  /** Height for `block`, diameter for `circle`. Ignored by `text` and `line`. */
  size?: "sm" | "md" | "lg";
  /** For `text`: renders this many lines, the last one shorter. */
  lines?: number;
  /** Optional screen reader text, for example "Loading your debts". Omit when a parent announces loading. */
  label?: string;
}

/** A decorative placeholder (aria-hidden). Pass `label` to add a visually hidden loading message. */
export const Skeleton: FC<SkeletonProps> = ({
  shape = "text",
  size = "md",
  lines = 1,
  label,
  className,
  ...props
}) => {
  const placeholder =
    shape === "text" && lines > 1 ? (
      <div aria-hidden="true" className={cx(skeletonLines(), className)} {...props}>
        {Array.from({ length: lines }, (_, i) => (
          <span
            // Lines are identical and never reorder, so the index is a stable key.
            key={i}
            className={cx(
              skeletonRecipe({ shape: "text" }),
              i === lines - 1 ? skeletonLastLine() : undefined,
            )}
          />
        ))}
      </div>
    ) : (
      <div
        aria-hidden="true"
        className={cx(skeletonRecipe({ shape, size }), className)}
        {...props}
      />
    );

  if (!label) return placeholder;
  return (
    <>
      {placeholder}
      <VisuallyHidden>{label}</VisuallyHidden>
    </>
  );
};

export default Skeleton;
