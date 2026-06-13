import { jsx as _jsx } from "react/jsx-runtime";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter } from "react-router-dom";
export function createClientEntry(config) {
    const { App, providers = [] } = config;
    const container = document.getElementById("root");
    let WrappedApp = _jsx(App, {});
    for (const Provider of [...providers].reverse()) {
        WrappedApp = _jsx(Provider, { children: WrappedApp });
    }
    const fullTree = (_jsx(HelmetProvider, { children: _jsx(BrowserRouter, { children: WrappedApp }) }));
    if (import.meta.env.PROD) {
        ReactDOM.hydrateRoot(container, fullTree);
    }
    else {
        ReactDOM.createRoot(container).render(fullTree);
    }
}
