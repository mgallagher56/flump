import { writeFileSync } from "node:fs";
import { buildOpenApiDocument } from "../src/openapi.js";

writeFileSync(
  new URL("../openapi.json", import.meta.url),
  `${JSON.stringify(buildOpenApiDocument(), null, 2)}\n`,
);
