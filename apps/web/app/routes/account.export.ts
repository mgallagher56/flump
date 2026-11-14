import type { LoaderFunctionArgs } from "react-router";
import { exportAccountData } from "~/features/settings/account.server";

// Resource route (no default export) for `/account/export`: streams the signed-in person's data
// export (BE-04) through the web session. The logic lives in features/settings/account.server.ts.
export const loader = (args: LoaderFunctionArgs) => exportAccountData(args);
