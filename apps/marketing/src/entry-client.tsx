import "./index.css";
import { createClientEntry } from "@repo/app-shell/client";
import App from "./App";

createClientEntry({
  App,
  providers: [],
});
