import "@repo/ui/fonts.css";
import "./index.css";
import App from "./App";
import { createClientEntry } from "./app-shell/entry-client";

createClientEntry({
  App,
  providers: [],
});
