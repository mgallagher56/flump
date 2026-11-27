import "@repo/ui/fonts.css";
import "./index.css";
import App from "./App";
import { createClientEntry } from "./app-shell/entry-client";
import { lazyPages, preloadPage } from "./lazyPages";
import { pageForPath } from "./pageSet";

const ClientApp = () => <App pages={lazyPages} />;

// Load this page's chunk first, so hydration finds it ready and never suspends. The server has
// already asked the browser to fetch it (a modulepreload link), so this rarely waits.
preloadPage(pageForPath(window.location.pathname)).then(() =>
  createClientEntry({ App: ClientApp, providers: [] }),
);
