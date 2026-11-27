import type { FC } from "react";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { HomeClose } from "../../components/HomeClose";
import { HomeFAQ } from "../../components/HomeFAQ";
import { HomeFeatures } from "../../components/HomeFeatures";
import { HomeHero } from "../../components/HomeHero";
import { HomeJourney } from "../../components/HomeJourney";
import { HomeMoreDetail } from "../../components/HomeMoreDetail";
import { HomePayRise } from "../../components/HomePayRise";
import { HomeRoughFigures } from "../../components/HomeRoughFigures";
import { HomeSecurity } from "../../components/HomeSecurity";
import { PageMeta } from "../../components/PageMeta";
import { AmbientMotionProvider } from "../../context/AmbientMotionContext";
import { SITE_TAGLINE } from "../../utils/site";
import { mainContent, pageShell, pairBands } from "./HomePage.styles";

/**
 * Marketing home, the new design language (ROLLOUT-PLAN slice M1, from prototype 11): the
 * assembling hero; the features carousel with dots; the six-stop journey with the orb; the rough
 * figures steps with the calendar page; the pay rise tool; security as a card like its neighbours;
 * More detail beside the questions; the calm close. Bands alternate `card` and `canvas` with no
 * solid band (UX-GUIDELINES 12.2). The server render is the finished, still page (MK1): every
 * motion is an enhancement loaded after first paint, and none plays with reduced motion.
 * "Request an invite" appears twice in the page body (hero and close).
 */
export const HomePage: FC = () => (
  <AmbientMotionProvider>
    <div className={pageShell()}>
      <PageMeta
        title={SITE_TAGLINE}
        description={`${SITE_TAGLINE}. Accounts, budget, pay, savings, pension and debts in one place, under UK rules, from figures you type in.`}
      />

      <Header />

      <main className={mainContent()} id="main" tabIndex={-1}>
        <HomeHero />
        <HomeFeatures />
        <HomeJourney />
        <HomeRoughFigures />
        <HomePayRise />
        <HomeSecurity />
        {/* Side by side on wide screens: two short lists that deal in, in order. */}
        <div className={pairBands()}>
          <HomeMoreDetail />
          <HomeFAQ />
        </div>
        <HomeClose />
      </main>

      <Footer />
    </div>
  </AmbientMotionProvider>
);
