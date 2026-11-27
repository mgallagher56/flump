import { useCountUp, VisuallyHidden } from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import { type FC, useEffect, useRef, useState } from "react";
import { figure } from "./JourneyFigure.styles";

export interface JourneyFigureProps {
  /** The fixed sample value. Only a figure on a card tagged "Example" may count (MK13). */
  value: number;
  /** en-GB formatter for every frame and the final value. */
  format: (value: number) => string;
  /** Where the count starts. Default 0. */
  from?: number;
  className?: string;
  "data-testid"?: string;
}

/**
 * A sample figure tagged "Example" that counts up once, the first time it is in view
 * (`useCountUp`, MK13). The final value is in the server HTML and is all assistive technology
 * hears; the moving digits are hidden from it (MK10). Under reduced motion it never moves.
 */
export const JourneyFigure: FC<JourneyFigureProps> = ({
  value,
  format,
  from,
  className,
  "data-testid": testId,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { text, displayText } = useCountUp(value, { inView, from, format });
  return (
    <span className={cx(figure, className)} data-testid={testId} ref={ref}>
      <VisuallyHidden>{text}</VisuallyHidden>
      <span aria-hidden="true">{displayText}</span>
    </span>
  );
};
