// Catch-all splat route (E20-N1). Unmatched URLs would otherwise be answered by React Router
// outside the root middleware pipeline and miss the security headers. Matching this route makes
// them run the root middleware; the thrown 404 renders the root ErrorBoundary as before.
// More specific routes (api.$, healthz, robots.txt, ...) still win over the splat.
export const loader = () => {
  throw new Response("Not Found", { status: 404, statusText: "Not Found" });
};

export const action = () => {
  throw new Response("Not Found", { status: 404, statusText: "Not Found" });
};
