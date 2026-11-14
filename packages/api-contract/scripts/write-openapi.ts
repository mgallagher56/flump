/**
 * Regenerates the committed openapi.json from the route manifest (BE-09). Run with
 * `bun run --cwd packages/api-contract openapi:write` after any contract change, then commit the
 * file. A breaking change also needs a new version path or the deprecation policy
 * (docs/api/versioning.md); scripts/backend-laws/check-openapi-breaking.ts enforces both.
 */
import { writeFileSync } from "node:fs";
import { serializeOpenApiDocument } from "../src/openapi.js";

writeFileSync(new URL("../openapi.json", import.meta.url), serializeOpenApiDocument());
