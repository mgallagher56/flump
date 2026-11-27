/** Jest with jest-expo (SDK 58 needs Jest 30). Runs on Node in CI; Hermes is proved on device. */

// The shared packages resolve to their TypeScript source here, which imports siblings as "./x.js".
const moduleNameMapper = {
  "^(\\.{1,2}/.*)\\.js$": "$1",
  // The document pictures' shape lists, read by path (tsconfig.json "paths" says why).
  "^@repo/ui/illustration-data$":
    "<rootDir>/../../packages/ui/src/primitives/Illustration/Illustration.documents.ts",
};
// Babel helpers in the shared packages' source resolve from the app, which depends on @babel/runtime.
const modulePaths = ["<rootDir>/node_modules"];
const testPathIgnorePatterns = ["/node_modules/", "/dist/"];
// jest-expo's own source transform (babel-jest with Expo's Babel preset), reused without its setup
// files: those install Expo's runtime globals, which replace Node's fetch with a native shim.
const expoSourceTransform = require("jest-expo/jest-preset").transform["\\.[jt]sx?$"];

module.exports = {
  projects: [
    {
      displayName: "app",
      preset: "jest-expo",
      // Bun's isolated installs put packages under node_modules/.bun/<name>@<version>/node_modules.
      // React Native and Expo packages ship untranspiled source, so they are transformed wherever they sit.
      // standard-navigation is Expo Router's ES module navigator core, reached by its route tests (S4).
      transformIgnorePatterns: [
        "node_modules/(?!(\\.bun/[^/]+/node_modules/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|expo-.*|react-navigation|@react-navigation/.*|standard-navigation))",
      ],
      moduleNameMapper,
      modulePaths,
      testPathIgnorePatterns: [...testPathIgnorePatterns, "<rootDir>/e2e/"],
    },
    {
      // The e2e fixture server and its scripts (S2c) run on Node, not in the app.
      displayName: "e2e-tooling",
      testEnvironment: "node",
      roots: ["<rootDir>/e2e"],
      transform: { "\\.[jt]sx?$": expoSourceTransform },
      moduleNameMapper,
      modulePaths,
      testPathIgnorePatterns,
    },
  ],
};
