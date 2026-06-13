import "./index.css";
import "@repo/ui/styles.css";
import { createClientEntry } from "@repo/app-shell/client";
import App from "./App";

createClientEntry({
  App,
  providers: [],
});
