import { Button } from "@repo/ui";
import type { FC } from "react";
import { FeatureIndex } from "../../components/FeatureIndex";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { PageMeta } from "../../components/PageMeta";
import { StartHere } from "../../components/StartHere";
import { AI_CONNECTION, FEATURES_INDEX, MONEY_AREAS } from "../../utils/featureAreas";
import type { FeatureGroup } from "../../utils/featureIndex";
import { signupCta } from "../../utils/site";
import {
  container,
  ctaRow,
  headerBlock,
  heading,
  introText,
  lead,
  mainContent,
  pageShell,
} from "./FeaturesIndexPage.styles";

/** Each area's group heading links to its own page. */
const GROUP_HREFS: Partial<Record<FeatureGroup["key"], string>> = Object.fromEntries(
  [...MONEY_AREAS, AI_CONNECTION].map((feature) => [feature.key, feature.path]),
);

/**
 * "Flump features" (D1): every feature as one line, grouped by area like a documentation home
 * (owner, 26 November 2026, option A). A short "Start here" strip, then the index; nothing is
 * explained until a line is opened.
 */
export const FeaturesIndexPage: FC = () => {
  const cta = signupCta();

  return (
    <div className={pageShell()} data-testid="features-index-page">
      <PageMeta description={FEATURES_INDEX.meta.description} title={FEATURES_INDEX.meta.title} />

      <Header />

      <main className={mainContent()} id="main" tabIndex={-1}>
        <div className={container()}>
          <section aria-labelledby="features-title" className={headerBlock()}>
            <h1 className={heading()} id="features-title">
              {FEATURES_INDEX.title}
            </h1>
            <p className={lead()}>{FEATURES_INDEX.lead}</p>
            {FEATURES_INDEX.intro.map((paragraph) => (
              <p className={introText()} key={paragraph}>
                {paragraph}
              </p>
            ))}
            <div className={ctaRow()}>
              <Button asChild size="lg" variant="primary">
                <a href={cta.href}>{cta.label}</a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="/preview">Interactive preview</a>
              </Button>
            </div>
          </section>

          <StartHere />

          <FeatureIndex groupHrefs={GROUP_HREFS} />
        </div>
      </main>

      <Footer />
    </div>
  );
};
