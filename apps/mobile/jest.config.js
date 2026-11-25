/** Jest with jest-expo (SDK 58 needs Jest 30). Runs on Node in CI; Hermes is proved on device. */
module.exports = {
  preset: "jest-expo",
  // Bun's isolated installs put packages under node_modules/.bun/<name>@<version>/node_modules.
  // React Native and Expo packages ship untranspiled source, so they are transformed wherever they sit.
  transformIgnorePatterns: [
    "node_modules/(?!(\\.bun/[^/]+/node_modules/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|expo-.*|react-navigation|@react-navigation/.*))",
  ],
  // The shared packages resolve to their TypeScript source here, which imports siblings as "./x.js".
  moduleNameMapper: { "^(\\.{1,2}/.*)\\.js$": "$1" },
  // Babel helpers in the shared packages' source resolve from the app, which depends on @babel/runtime.
  modulePaths: ["<rootDir>/node_modules"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
};
