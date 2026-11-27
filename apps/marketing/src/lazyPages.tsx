import { type ComponentType, use } from "react";
import type { PageName, PageSet } from "./pageSet";
import type { MoneyArea } from "./utils/featureAreas";

interface PageChunk<P> {
  /** The page component once its chunk has loaded. */
  loaded?: ComponentType<P>;
  /** Starts loading the chunk (once) and resolves with the component. */
  preload: () => Promise<ComponentType<P>>;
}

/** One page as its own chunk: loaded once, then kept. */
function pageChunk<P>(load: () => Promise<ComponentType<P>>): PageChunk<P> {
  let pending: Promise<ComponentType<P>> | undefined;
  const chunk: PageChunk<P> = {
    preload: () => {
      pending ??= load().then((component) => {
        chunk.loaded = component;
        return component;
      });
      return pending;
    },
  };
  return chunk;
}

/**
 * Renders a page from its chunk. Unlike `React.lazy`, a page whose chunk has already loaded renders
 * at once, so the client entry can load the current page and then hydrate with no suspense and no
 * mismatch. A page reached by a link suspends once while its chunk loads; the router's transition
 * keeps the old page on screen meanwhile.
 */
function ChunkPage<P extends object>({ chunk, props }: { chunk: PageChunk<P>; props: P }) {
  const Component = chunk.loaded ?? use(chunk.preload());
  return <Component {...props} />;
}

const chunks = {
  HomePage: pageChunk(() => import("./pages/HomePage").then((m) => m.HomePage)),
  FeaturesIndexPage: pageChunk(() =>
    import("./pages/FeaturesIndexPage").then((m) => m.FeaturesIndexPage),
  ),
  AreaPage: pageChunk<{ feature: MoneyArea }>(() =>
    import("./pages/AreaPage").then((m) => m.AreaPage),
  ),
  AiConnectionPage: pageChunk(() =>
    import("./pages/AiConnectionPage").then((m) => m.AiConnectionPage),
  ),
  PreviewPage: pageChunk(() => import("./pages/PreviewPage").then((m) => m.PreviewPage)),
  PricingPage: pageChunk(() => import("./pages/PricingPage").then((m) => m.PricingPage)),
  SecurityPage: pageChunk(() => import("./pages/SecurityPage").then((m) => m.SecurityPage)),
  ContactPage: pageChunk(() => import("./pages/ContactPage").then((m) => m.ContactPage)),
  PrivacyPage: pageChunk(() => import("./pages/PrivacyPage").then((m) => m.PrivacyPage)),
  TermsPage: pageChunk(() => import("./pages/TermsPage").then((m) => m.TermsPage)),
  CookiesPage: pageChunk(() => import("./pages/CookiesPage").then((m) => m.CookiesPage)),
  AccessibilityPage: pageChunk(() =>
    import("./pages/AccessibilityPage").then((m) => m.AccessibilityPage),
  ),
  NotFoundPage: pageChunk(() => import("./pages/NotFoundPage").then((m) => m.NotFoundPage)),
};

/** Every page as its own chunk, for the browser. */
export const lazyPages: PageSet = {
  HomePage: () => <ChunkPage chunk={chunks.HomePage} props={{}} />,
  FeaturesIndexPage: () => <ChunkPage chunk={chunks.FeaturesIndexPage} props={{}} />,
  AreaPage: (props) => <ChunkPage chunk={chunks.AreaPage} props={props} />,
  AiConnectionPage: () => <ChunkPage chunk={chunks.AiConnectionPage} props={{}} />,
  PreviewPage: () => <ChunkPage chunk={chunks.PreviewPage} props={{}} />,
  PricingPage: () => <ChunkPage chunk={chunks.PricingPage} props={{}} />,
  SecurityPage: () => <ChunkPage chunk={chunks.SecurityPage} props={{}} />,
  ContactPage: () => <ChunkPage chunk={chunks.ContactPage} props={{}} />,
  PrivacyPage: () => <ChunkPage chunk={chunks.PrivacyPage} props={{}} />,
  TermsPage: () => <ChunkPage chunk={chunks.TermsPage} props={{}} />,
  CookiesPage: () => <ChunkPage chunk={chunks.CookiesPage} props={{}} />,
  AccessibilityPage: () => <ChunkPage chunk={chunks.AccessibilityPage} props={{}} />,
  NotFoundPage: () => <ChunkPage chunk={chunks.NotFoundPage} props={{}} />,
};

/** Loads one page's chunk, so the first render after it can hydrate without suspending. */
export const preloadPage = (name: PageName): Promise<unknown> =>
  (chunks satisfies Record<PageName, { preload: () => Promise<unknown> }>)[name].preload();
