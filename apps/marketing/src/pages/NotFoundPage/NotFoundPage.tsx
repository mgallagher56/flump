import type { FC } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import {
  bodyStyle,
  headingStyle,
  homeLinkStyle,
  mainContent,
  pageShell,
} from "./NotFoundPage.styles";

export const NotFoundPage: FC = () => (
  <div className={pageShell()}>
    <Helmet>
      <title>Page not found | Flump</title>
      <meta name="robots" content="noindex" />
      <meta
        name="description"
        content="This page could not be found. Go to the Flump home page or browse the UK calculators."
      />
    </Helmet>
    <Header />
    <main className={mainContent()} id="main" tabIndex={-1}>
      <h1 className={headingStyle()}>Page not found</h1>
      <p className={bodyStyle()}>
        We cannot find that page. It may have moved, or the address may be mistyped.
      </p>
      <Link to="/" className={homeLinkStyle()}>
        Go to the home page
      </Link>
    </main>
    <Footer />
  </div>
);
