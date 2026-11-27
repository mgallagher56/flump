import "./index.css";
import App from "./App";
import { createServerEntry } from "./app-shell/entry-server";
import { eagerPages } from "./eagerPages";
import { resolveStatus } from "./routes";

const ServerApp = () => <App pages={eagerPages} />;

export const render = createServerEntry({
  App: ServerApp,
  providers: [],
  resolveStatus,
});
