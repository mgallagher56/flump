import { missingNativeModules, SIGN_IN_NATIVE_MODULES } from "./nativeModules";

describe("missingNativeModules", () => {
  it("checks the three native modules sign-in needs", () => {
    expect(SIGN_IN_NATIVE_MODULES).toEqual(["ExpoCrypto", "ExpoSecureStore", "ExpoWebBrowser"]);
  });

  it("lists none when every module is there", () => {
    expect(missingNativeModules(() => ({}))).toEqual([]);
  });

  it("lists each module the app binary does not carry, as Expo Go may not", () => {
    const present = new Set(["ExpoSecureStore"]);
    expect(missingNativeModules((name) => (present.has(name) ? {} : null))).toEqual([
      "ExpoCrypto",
      "ExpoWebBrowser",
    ]);
  });
});
