export const getAppUrl = (): string => {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_URL) {
    return import.meta.env.VITE_APP_URL;
  }
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ) {
    return "http://localhost:5173";
  }
  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    return "http://localhost:5173";
  }
  return "https://app.flump.co.uk";
};
