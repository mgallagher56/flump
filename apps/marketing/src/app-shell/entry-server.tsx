import type React from "react";
import ReactDOMServer from "react-dom/server";
import { HelmetProvider } from "react-helmet-async";
import { StaticRouter } from "react-router-dom";

export interface ServerEntryConfig {
  App: React.ComponentType;
  providers?: React.ComponentType<{ children: React.ReactNode }>[];
  /** Maps a request URL to the HTTP status of the response. Defaults to 200. */
  resolveStatus?: (url: string) => number;
}

export interface RenderResult {
  html: string;
  helmet: any;
  status: number;
}

export function createServerEntry(config: ServerEntryConfig) {
  const { App, providers = [], resolveStatus } = config;

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

    return {
      html,
      helmet: (helmetContext as any).helmet,
      status: resolveStatus ? resolveStatus(url) : 200,
    };
  };
}
