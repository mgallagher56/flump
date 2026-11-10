import type React from "react";
import ReactDOMServer from "react-dom/server";
import { HelmetProvider } from "react-helmet-async";
import { StaticRouter } from "react-router-dom";

export interface ServerEntryConfig {
  App: React.ComponentType;
  providers?: React.ComponentType<{ children: React.ReactNode }>[];
}

export interface RenderResult {
  html: string;
  helmet: any;
}

export function createServerEntry(config: ServerEntryConfig) {
  const { App, providers = [] } = config;

  return function render(url: string): RenderResult {
    const helmetContext = {};

    let WrappedApp: React.ReactNode = <App />;
    for (const Provider of [...providers].reverse()) {
      WrappedApp = <Provider>{WrappedApp}</Provider>;
    }

    const html = ReactDOMServer.renderToString(
      <HelmetProvider context={helmetContext}>
        <StaticRouter location={url}>{WrappedApp}</StaticRouter>
      </HelmetProvider>,
    );

    return { html, helmet: (helmetContext as any).helmet };
  };
}
