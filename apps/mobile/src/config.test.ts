import { MobileConfigError, readConfig } from "./config";

const dev = { releaseBuild: false };
const release = { releaseBuild: true };

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(MobileConfigError);
    expect((error as Error).name).toBe("MobileConfigError");
    return (error as MobileConfigError).code;
  }
  return undefined;
}

describe("readConfig", () => {
  it.each([undefined, "", "   "])("rejects a missing address (%p)", (value) => {
    expect(codeOf(() => readConfig({ EXPO_PUBLIC_API_URL: value }, dev))).toBe("missing-api-url");
  });

  it("rejects a value that is not an address", () => {
    expect(codeOf(() => readConfig({ EXPO_PUBLIC_API_URL: "api.flump" }, dev))).toBe(
      "invalid-api-url",
    );
  });

  it("rejects a scheme other than HTTP or HTTPS", () => {
    expect(codeOf(() => readConfig({ EXPO_PUBLIC_API_URL: "ftp://api.example.com" }, dev))).toBe(
      "invalid-api-url",
    );
  });

  it("accepts HTTPS in a release build and keeps only the origin", () => {
    expect(readConfig({ EXPO_PUBLIC_API_URL: "https://api.example.com/v1/" }, release)).toEqual({
      apiBaseUrl: "https://api.example.com",
    });
  });

  it("rejects plain HTTP in a release build, even to localhost", () => {
    expect(
      codeOf(() => readConfig({ EXPO_PUBLIC_API_URL: "http://localhost:3000" }, release)),
    ).toBe("insecure-api-url");
  });

  it.each([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://[::1]:3000",
    "http://10.0.2.2:3000",
    "http://my-mac.local:3000",
  ])("accepts plain HTTP to a local host in a development build (%s)", (address) => {
    expect(readConfig({ EXPO_PUBLIC_API_URL: address }, dev).apiBaseUrl).toBe(address);
  });

  it.each([
    "http://api.example.com",
    "http://192.168.1.20:3000",
    "http://localhost.example.com",
    "http://my.mac.local",
  ])("rejects plain HTTP to any other host in a development build (%s)", (address) => {
    expect(codeOf(() => readConfig({ EXPO_PUBLIC_API_URL: address }, dev))).toBe("http-not-local");
  });
});
