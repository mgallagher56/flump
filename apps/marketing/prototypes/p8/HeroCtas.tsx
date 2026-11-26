import { Button } from "@repo/ui";
import type { FC } from "react";
import { ctaRow } from "../../src/pages/HomePage/HomePage.styles";
import { signupCta } from "../../src/utils/site";

/** The hero's two calls to action (shared/sections.tsx's copy), with 1b's pointer light. */
export const HeroCtas: FC = () => {
  const cta = signupCta();
  return (
    <div className={ctaRow()}>
      <Button asChild size="lg" variant="primary">
        <a data-light="" data-proto="cta-primary" href={cta.href}>
          {cta.label}
        </a>
      </Button>
      <Button asChild size="lg" variant="outline">
        <a data-light="" data-proto="cta-secondary" href="/preview">
          Interactive preview
        </a>
      </Button>
    </div>
  );
};
