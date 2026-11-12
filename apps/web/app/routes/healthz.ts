import { applyRobotsHeader } from "../utils/indexing.server";

// Resource route: no component, no backend call, so a backend outage never fails web deploys.
// Resource routes bypass entry.server, so the robots header is applied here.
export function loader() {
  return Response.json(
    { status: "ok" },
    { headers: applyRobotsHeader(new Headers({ "Cache-Control": "no-store" })) },
  );
}
