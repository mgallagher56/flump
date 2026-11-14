/** Writes src/native.generated.ts from the authored tokens. Run: bun run generate:tokens */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderNativeTokens } from "./native-theme.js";

const target = fileURLToPath(new URL("../src/native.generated.ts", import.meta.url));
writeFileSync(target, renderNativeTokens());
console.log(`wrote ${target}`);
