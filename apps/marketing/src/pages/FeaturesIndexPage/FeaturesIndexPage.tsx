import { Button, Card } from "@repo/ui";
import type { FC } from "react";
import { Link } from "react-router-dom";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { PageMeta } from "../../components/PageMeta";
import {
  AI_CONNECTION,
  AI_CONNECTION_ACCESS,
  FEATURES,
  FEATURES_INDEX,
} from "../../utils/featureAreas";
import { signupCta } from "../../utils/site";
import {
  container,
  ctaRow,
  featureCard,
  featureGrid,
  featureLead,
  featureLink,
  featureName,
  featureNote,
  headerBlock,
  heading,
  introText,
  lead,
  mainContent,
  pageShell,
} from "./FeaturesIndexPage.styles";

/**
 * "Flump features" (E42 S3, D1): the map of the app. The five areas in the app's order, then the AI
 * connection, one card each with its lead and a link named for where it goes.
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

          <ul aria-label="Flump features" className={featureGrid()}>
            {FEATURES.map((feature) => (
              <Card as="li" key={feature.key} padding="lg">
                <div className={featureCard()}>
                  <h2 className={featureName()}>
                    <Link className={featureLink()} to={feature.path}>
                      {feature.name}
                    </Link>
                  </h2>
                  <p className={featureLead()}>{feature.lead}</p>
                  {feature.key === AI_CONNECTION.key && (
                    <p className={featureNote()}>{AI_CONNECTION_ACCESS}</p>
                  )}
                </div>
              </Card>
            ))}
          </ul>
        </div>
      </main>

      <Footer />
    </div>
  );
};
