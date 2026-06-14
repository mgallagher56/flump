const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadTokens() {
  try {
    const tokenFilePath = path.resolve(__dirname, "../../packages/ui/src/tokens/index.ts");
    const content = fs.readFileSync(tokenFilePath, "utf8");
    const jsContent = content
      .replace(/export\s+/g, "")
      .replace(/as\s+const/g, "")
      .replace(/:\s+Record<[^>]+>/g, "")
      .replace(/:\s+any/g, "");

    const sandbox = {};
    vm.createContext(sandbox);
    vm.runInContext(jsContent, sandbox);
    return sandbox;
  } catch (error) {
    console.error("Failed to load tokens in tailwind.config.js:", error);
    return { colors: {}, spacing: {}, radii: {}, semanticTokens: { colors: {} } };
  }
}

function extractValues(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if ("value" in obj) {
    const val = obj.value;
    if (typeof val === "object" && val !== null) {
      return val.base || val.DEFAULT || val;
    }
    return val;
  }

  const result = {};
  for (const key in obj) {
    result[key] = extractValues(obj[key]);
  }
  return result;
}

function resolveReferences(obj, root) {
  if (typeof obj === "string") {
    const match = obj.match(/^\{([^}]+)\}$/);
    if (match) {
      const pathParts = match[1].split(".");
      let current = root;
      for (const part of pathParts) {
        if (current && part in current) {
          current = current[part];
        } else {
          return obj;
        }
      }
      return current;
    }
    return obj;
  }
  if (obj && typeof obj === "object") {
    for (const key in obj) {
      obj[key] = resolveReferences(obj[key], root);
    }
  }
  return obj;
}

const rawTokens = loadTokens();
const extracted = extractValues(rawTokens);
const resolved = resolveReferences(extracted, extracted);

const resolvedColors = resolved.colors || {};
const resolvedSpacing = resolved.spacing || {};
const resolvedRadii = resolved.radii || {};
const resolvedSemanticColors = resolved.semanticTokens?.colors || {};

const extendedColors = {
  ...resolvedColors,
  ...resolvedSemanticColors,
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: extendedColors,
      spacing: resolvedSpacing,
      borderRadius: resolvedRadii,
    },
  },
  plugins: [],
};
