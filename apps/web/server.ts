import path from "node:path";
import { pathToFileURL } from "node:url";
import { createApp } from "./server/app";
import { installShutdown } from "./server/shutdown";

// react-router-serve defaulted to production when unset; keep that.
process.env.NODE_ENV = process.env.NODE_ENV ?? "production";

const mode = process.env.NODE_ENV;
const parsed = Number(process.env.PORT);
const port = Number.isInteger(parsed) && parsed > 0 ? parsed : 3000;
const host = process.env.HOST;

const buildPath = path.resolve("build/server/index.js");
const build = await import(pathToFileURL(buildPath).href);

const app = createApp({ build, mode });

const onListen = () => {
  console.log(`[web] http://localhost:${port}${host ? ` (host ${host})` : ""}`);
};
const server = host ? app.listen(port, host, onListen) : app.listen(port, onListen);

installShutdown(server);
