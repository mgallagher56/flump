import "./index.css";
import App from "./App";
import { createServerEntry } from "./app-shell/entry-server";
import { resolveStatus } from "./routes";

export const render = createServerEntry({
  App,
  providers: [],
  resolveStatus,
});
