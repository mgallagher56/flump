/**
 * Origin of the public marketing site. Signed-out visitors to the app root and signed-out users
 * are sent here. VITE_MARKETING_URL wins; otherwise localhost maps to the local marketing dev
 * server and everything else to production.
 */
export const getMarketingUrl = (requestUrl: string): string => {
  const url = new URL(requestUrl);
  return (
    process.env.VITE_MARKETING_URL ||
    (url.hostname === "localhost" || url.hostname === "127.0.0.1"
      ? "http://localhost:3001"
      : "https://flump.co.uk")
  );
};
