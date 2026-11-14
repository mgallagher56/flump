import { Button, Illustration } from "@repo/ui";
import type { FC } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import {
  mainContent,
  notFoundActions,
  notFoundBody,
  notFoundCard,
  notFoundHeading,
  notFoundIllustration,
  pageShell,
} from "./NotFoundPage.styles";

/** Same words as the web app's not-found state, so both sites read as one product (R2-10). */
export const NOT_FOUND_COPY = {
  heading: "We cannot find that page",
  body: "The page may have moved, or the link may be out of date.",
  action: "Go to the home page",
} as const;

/**
 * The marketing 404 (R2-10): the web app's not-found card (illustration, heading, one sentence,
 * one way back) without its badge or status line, so "not found" is said once.
 */
export const NotFoundPage: FC = () => (
  <div className={pageShell()}>
    <Helmet>
      <title>{`${NOT_FOUND_COPY.heading} | Flump`}</title>
      <meta name="robots" content="noindex" />
      <meta
        name="description"
        content="This page could not be found. Go to the Flump home page or browse the UK calculators."
      />
    </Helmet>
    <Header />
    <main className={mainContent()} id="main" tabIndex={-1}>
      <section aria-labelledby="not-found-title" className={notFoundCard()}>
        <div className={notFoundIllustration()}>
          <Illustration scene="not-found" size="sm" />
        </div>
        <h1 className={notFoundHeading()} id="not-found-title">
          {NOT_FOUND_COPY.heading}
        </h1>
        <p className={notFoundBody()}>{NOT_FOUND_COPY.body}</p>
        <div className={notFoundActions()}>
          <Button asChild variant="outline">
            <Link to="/">{NOT_FOUND_COPY.action}</Link>
          </Button>
        </div>
      </section>
    </main>
    <Footer />
  </div>
);
