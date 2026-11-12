import { applyRobotsHeader } from "../utils/indexing.server";

// Resource route: served at /robots.txt (`[.]` escapes the dot in remix-flat-routes).
// Resource routes bypass entry.server, so the robots header is applied here.
export function loader() {
  return new Response("User-agent: *\nDisallow: /\n", {
    headers: applyRobotsHeader(
      new Headers({ "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }),
    ),
  });
}
