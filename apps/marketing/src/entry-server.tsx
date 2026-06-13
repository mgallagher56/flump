import "./index.css";
import "@repo/ui/styles.css";
import { createServerEntry } from "@repo/app-shell/server";
import App from "./App";

export const render = createServerEntry({
  App,
  providers: [],
});
