import type { FC } from "react";
import { Helmet } from "react-helmet-async";
import { TermsPage } from "../../../src/pages/TermsPage";
import { HeaderBandPage } from "../legalBand";
import { OTHER_NAMES, OtherShell } from "../OtherShell";
import { legalLayout } from "../scene/layouts";

/*
 * One legal page for round two (family G): production's terms of use, unchanged and rendered whole.
 * The rule for legal text is tokens and material only: still glass orbs in the header band, in the
 * margins beside the reading column on wide screens and small above the title on phones, nothing
 * beside or behind the text below, and no script (neither GSAP nor three.js is reachable from this
 * page). The switch offers only Nothing and S0.
 */
export const TermsProto: FC = () => (
  <OtherShell defaultLevel="s0" id="terms" levels={["none", "s0"]}>
    <HeaderBandPage layout={legalLayout(["violet", "sky", "teal", "rose"])}>
      <TermsPage />
    </HeaderBandPage>
    {/* After the page's own title, so the tab says it is the prototype. */}
    <Helmet>
      <title>{`${OTHER_NAMES.terms} | Flump motion prototype`}</title>
    </Helmet>
  </OtherShell>
);
