import { Button } from "@repo/ui";
import type { FC } from "react";
import { ctaRow } from "../../../src/pages/HomePage/HomePage.styles";
import { signupCta } from "../../../src/utils/site";

/** The hero's two calls to action, with 1b's pointer light (`data-light`). */
export const LitCtas: FC<{ secondary?: boolean }> = ({ secondary = true }) => {
  const cta = signupCta();
  return (
    <div className={ctaRow()}>
      <Button asChild size="lg" variant="primary">
        <a data-light="" data-proto="cta-primary" href={cta.href}>
          {cta.label}
        </a>
      </Button>
      {secondary && (
        <Button asChild size="lg" variant="outline">
          <a data-light="" data-proto="cta-secondary" href="/preview">
            Interactive preview
          </a>
        </Button>
      )}
    </div>
  );
};
