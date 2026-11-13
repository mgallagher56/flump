import "./server/env";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createApp } from "./server/app";
import { listen, resolvePort } from "./server/listen";
import { installShutdown } from "./server/shutdown";

const mode = process.env.NODE_ENV as string;
let port: number;
try {
  port = resolvePort(process.env.PORT);
} catch (error) {
  console.error(`[web] ${(error as Error).message}`);
  process.exit(1);
}

const buildPath = path.resolve("build/server/index.js");
const build = await import(pathToFileURL(buildPath).href);

const app = createApp({ build, mode });
const server = listen(app, { port, host: process.env.HOST });

installShutdown(server);
