import { jsx as _jsx } from "react/jsx-runtime";
import ReactDOMServer from "react-dom/server";
import { HelmetProvider } from "react-helmet-async";
import { StaticRouter } from "react-router-dom";
export function createServerEntry(config) {
    const { App, providers = [] } = config;
    return function render(url) {
        const helmetContext = {};
        let WrappedApp = _jsx(App, {});
        for (const Provider of [...providers].reverse()) {
            WrappedApp = _jsx(Provider, { children: WrappedApp });
        }
        const html = ReactDOMServer.renderToString(_jsx(HelmetProvider, { context: helmetContext, children: _jsx(StaticRouter, { location: url, children: WrappedApp }) }));
        return { html, helmet: helmetContext.helmet };
    };
}
