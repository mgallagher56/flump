import "./index.css";
import { createServerEntry } from "@repo/app-shell/server";
import App from "./App";

export const render = createServerEntry({
  App,
  providers: [],
});
