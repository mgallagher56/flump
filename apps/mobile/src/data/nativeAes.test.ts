/**
 * The offline cache's AES-256-GCM is expo-crypto's native module in the installed version (owner's
 * condition for the sealed file, 27 November 2026): CryptoKit on iOS and javax.crypto on Android,
 * not a JavaScript cipher and not a new dependency.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const root = dirname(require.resolve("expo-crypto/package.json"));
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("expo-crypto's AES", () => {
  it("is the version the app declares", () => {
    const declared = JSON.parse(readFileSync(join(__dirname, "../../package.json"), "utf8"))
      .dependencies["expo-crypto"];
    expect(JSON.parse(read("package.json")).version).toBe(declared);
    expect(declared).toBe("58.0.8");
  });

  it("calls the native ExpoCryptoAES module from JavaScript", () => {
    expect(read("build/aes/ExpoCryptoAES.js")).toContain("requireNativeModule('ExpoCryptoAES')");
  });

  it("is CryptoKit's AES.GCM on iOS, with a new random nonce when none is given", () => {
    const swift = read("ios/AES/AesCryptoModule.swift");
    expect(swift).toContain("import CryptoKit");
    expect(swift).toContain("AES.GCM.seal(");
    expect(swift).toContain("iv = AES.GCM.Nonce()");
  });

  it("is javax.crypto GCM on Android, with a SecureRandom nonce", () => {
    const kotlin = read("android/src/main/java/expo/modules/crypto/aes/AesCryptoModule.kt");
    expect(kotlin).toContain("GCMParameterSpec");
    expect(kotlin).toContain("SecureRandom");
  });
});
