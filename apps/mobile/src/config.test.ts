import { MobileConfigError, readAuthConfig, readConfig, readSiteConfig } from "./config";

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

describe("readAuthConfig", () => {
  // Built at runtime: a made-up id in WorkOS's shape, not a real one.
  const clientId = `client_01${"TESTONLY".repeat(3)}`;

  it("defaults the WorkOS address to api.workos.com and fixes the redirect", () => {
    expect(readAuthConfig({ EXPO_PUBLIC_WORKOS_CLIENT_ID: clientId }, release)).toEqual({
      clientId,
      authBaseUrl: "https://api.workos.com",
      redirectUri: "flump://auth/callback",
    });
  });

  it("takes a WorkOS address override, keeping only its origin", () => {
    expect(
      readAuthConfig(
        {
          EXPO_PUBLIC_WORKOS_CLIENT_ID: clientId,
          EXPO_PUBLIC_WORKOS_API_URL: "http://10.0.2.2:8787/anything",
        },
        dev,
      ).authBaseUrl,
    ).toBe("http://10.0.2.2:8787");
  });

  it.each([undefined, "", "  "])("rejects a missing client id (%p)", (value) => {
    expect(codeOf(() => readAuthConfig({ EXPO_PUBLIC_WORKOS_CLIENT_ID: value }, dev))).toBe(
      "missing-client-id",
    );
  });

  it.each(["sk_test_abc", "client_", "client_has space", "client_a/b"])(
    "rejects a value that is not a client id (%s)",
    (value) => {
      expect(codeOf(() => readAuthConfig({ EXPO_PUBLIC_WORKOS_CLIENT_ID: value }, dev))).toBe(
        "invalid-client-id",
      );
    },
  );

  it.each(["http://10.0.2.2:8787", "https://elsewhere.example.com"])(
    "refuses any WorkOS address override in a release build (%s)",
    (address) => {
      expect(
        codeOf(() =>
          readAuthConfig(
            { EXPO_PUBLIC_WORKOS_CLIENT_ID: clientId, EXPO_PUBLIC_WORKOS_API_URL: address },
            release,
          ),
        ),
      ).toBe("workos-override-in-release");
    },
  );

  it("rejects plain HTTP to a non-local WorkOS address in a development build", () => {
    expect(
      codeOf(() =>
        readAuthConfig(
          {
            EXPO_PUBLIC_WORKOS_CLIENT_ID: clientId,
            EXPO_PUBLIC_WORKOS_API_URL: "http://api.workos.com",
          },
          dev,
        ),
      ),
    ).toBe("http-not-local");
  });
});

describe("readSiteConfig", () => {
  it("keeps the marketing site's origin", () => {
    expect(
      readSiteConfig({ EXPO_PUBLIC_MARKETING_URL: "https://site.example.com/path" }, release),
    ).toEqual({ marketingOrigin: "https://site.example.com", webAppOrigin: null });
  });

  it("keeps the web app's origin when set, checked as the marketing site's is", () => {
    const site = "https://site.example.com";
    expect(
      readSiteConfig(
        { EXPO_PUBLIC_MARKETING_URL: site, EXPO_PUBLIC_WEB_APP_URL: " https://app.example.com/x " },
        release,
      ).webAppOrigin,
    ).toBe("https://app.example.com");
    expect(
      readSiteConfig({ EXPO_PUBLIC_MARKETING_URL: site, EXPO_PUBLIC_WEB_APP_URL: "  " }, release)
        .webAppOrigin,
    ).toBeNull();
    expect(
      codeOf(() =>
        readSiteConfig(
          { EXPO_PUBLIC_MARKETING_URL: site, EXPO_PUBLIC_WEB_APP_URL: "http://localhost:5173" },
          release,
        ),
      ),
    ).toBe("insecure-api-url");
    expect(
      codeOf(() =>
        readSiteConfig(
          { EXPO_PUBLIC_MARKETING_URL: site, EXPO_PUBLIC_WEB_APP_URL: "nope" },
          release,
        ),
      ),
    ).toBe("invalid-api-url");
  });

  it("is required, and HTTPS in a release build", () => {
    expect(codeOf(() => readSiteConfig({}, release))).toBe("missing-api-url");
    expect(
      codeOf(() => readSiteConfig({ EXPO_PUBLIC_MARKETING_URL: "http://localhost:4321" }, release)),
    ).toBe("insecure-api-url");
  });
});
