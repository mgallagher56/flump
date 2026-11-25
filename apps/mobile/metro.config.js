// expo/metro-config configures Metro for the Bun workspace on its own (SDK 52 and later).
// Nothing custom: see docs/audit/plans/E12-spike-notes.md before adding anything here.
const { getDefaultConfig } = require("expo/metro-config");

module.exports = getDefaultConfig(__dirname);
