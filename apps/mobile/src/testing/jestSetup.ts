/**
 * Tests only, run before each app test file (jest.config.js `setupFiles`). jest-expo stubs
 * expo-crypto's native module, so `randomUUID` answered `undefined` and a request key built from it
 * read "undefined" in every test. Here it answers a real UUID from Node, as the phone's does, and
 * the rest of the module stays as jest-expo has it. A file that mocks expo-crypto itself still wins.
 */
jest.mock("expo-crypto", () => ({
  ...jest.requireActual("expo-crypto"),
  randomUUID: () => require("node:crypto").randomUUID(),
}));
