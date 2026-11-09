export const getAppUrl = (): string => {
  const env = typeof globalThis !== "undefined" ? (globalThis as any).process?.env : undefined;

  // 1. Explicit environment variable
  if (env?.VITE_APP_URL) {
    return env.VITE_APP_URL;
  }
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_URL) {
    return import.meta.env.VITE_APP_URL;
  }

  // 2. Client-side browser checks
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ) {
    return "http://localhost:5173";
  }

  // 3. Server-side development checks (Bun / Node / Vite SSR)
  if (env?.NODE_ENV !== "production") {
    return "http://localhost:5173";
  }
  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    return "http://localhost:5173";
  }

  return "https://app.flump.co.uk";
};
