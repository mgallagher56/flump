import type React from "react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter } from "react-router-dom";

export interface ClientEntryConfig {
  App: React.ComponentType;
  providers?: React.ComponentType<{ children: React.ReactNode }>[];
}

export function createClientEntry(config: ClientEntryConfig): void {
  const { App, providers = [] } = config;

  const container = document.getElementById("root") as HTMLElement;

  let WrappedApp: React.ReactNode = <App />;
  for (const Provider of [...providers].reverse()) {
    WrappedApp = <Provider>{WrappedApp}</Provider>;
  }

  const fullTree = (
    <HelmetProvider>
      <BrowserRouter>{WrappedApp}</BrowserRouter>
    </HelmetProvider>
  );

  if (import.meta.env.PROD) {
    ReactDOM.hydrateRoot(container, fullTree);
  } else {
    ReactDOM.createRoot(container).render(fullTree);
  }
}
