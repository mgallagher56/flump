export const getAppUrl = (): string => {
  // 1. Injected global override (e.g. from SSR HTML template)
  if (typeof window !== "undefined" && (window as any).__FLUMP_APP_URL__) {
    return (window as any).__FLUMP_APP_URL__;
  }

  // 2. Explicit environment variable
  const env = typeof globalThis !== "undefined" ? (globalThis as any).process?.env : undefined;
  if (env?.VITE_APP_URL) {
    return env.VITE_APP_URL;
  }
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_URL) {
    return import.meta.env.VITE_APP_URL;
  }

  // 3. Client-side browser checks
  if (typeof window !== "undefined" && window.location) {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:5173";
    }
    if (hostname.endsWith("railway.app")) {
      return "https://web-production-845e6c.up.railway.app";
    }
    if (hostname.endsWith("flump.co.uk")) {
      return "https://app.flump.co.uk";
    }
    return "https://app.flump.co.uk";
  }

  // 4. Server-side development & environment checks (Bun / Node / Vite SSR)
  if (env?.RAILWAY_SERVICE_WEB_URL) {
    return env.RAILWAY_SERVICE_WEB_URL.startsWith("http")
      ? env.RAILWAY_SERVICE_WEB_URL
      : `https://${env.RAILWAY_SERVICE_WEB_URL}`;
  }
  if (env?.RAILWAY_PUBLIC_DOMAIN) {
    return "https://web-production-845e6c.up.railway.app";
  }
  if (
    env?.NODE_ENV === "production" ||
    (typeof import.meta !== "undefined" && import.meta.env?.PROD)
  ) {
    return "https://app.flump.co.uk";
  }

  return "http://localhost:5173";
};
