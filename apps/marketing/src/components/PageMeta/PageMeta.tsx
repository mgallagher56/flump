import type { FC } from "react";
import { Helmet } from "react-helmet-async";

export const SOCIAL_SITE_NAME = "Flump";
export const SOCIAL_LOCALE = "en_GB";

export interface PageMetaProps {
  title: string;
  description: string;
}

/**
 * Title, description, Open Graph and Twitter card tags for a page, emitted through Helmet so SSR
 * output carries each exactly once. og:url is not emitted here: it needs SITE_URL and is added
 * server-side next to the canonical link (see server/headMeta.ts).
 */
export const PageMeta: FC<PageMetaProps> = ({ title, description }) => (
  <Helmet>
    <title>{title}</title>
    <meta name="description" content={description} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content={SOCIAL_SITE_NAME} />
    <meta property="og:locale" content={SOCIAL_LOCALE} />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />
  </Helmet>
);
