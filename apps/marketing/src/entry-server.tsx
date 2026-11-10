import "./index.css";
import App from "./App";
import { createServerEntry } from "./app-shell/entry-server";

export const render = createServerEntry({
  App,
  providers: [],
});
