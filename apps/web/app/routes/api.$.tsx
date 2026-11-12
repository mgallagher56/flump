import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { handleApiProxy } from "~/services/api-proxy.server";

// Resource route for `/api/*` (no default export). The allow-list, CSRF checks, session lookup
// and rate limit all live in services/api-proxy.server.ts.
export const loader = (args: LoaderFunctionArgs) => handleApiProxy(args);
export const action = (args: ActionFunctionArgs) => handleApiProxy(args);
