import type { ActionFunctionArgs } from "react-router";
import { handleCspReport } from "~/security/csp-report.server";

// Resource route for CSP violation reports (E20-N11); no component, no session. The root
// middleware still applies the security headers and the same-origin check to the POST.
export const action = ({ request }: ActionFunctionArgs) => handleCspReport(request);
