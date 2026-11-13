// @vitest-environment node
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NonceProvider, readNonceFromDom, useNonce } from "./nonce";

function Probe() {
  return <script nonce={useNonce()} dangerouslySetInnerHTML={{ __html: "1" }} />;
}

describe("NonceProvider", () => {
  it("provides the nonce to descendants", () => {
    const html = renderToString(
      <NonceProvider nonce="abc">
        <Probe />
      </NonceProvider>,
    );
    expect(html).toContain('nonce="abc"');
  });

  it("defaults to an empty string when no provider is present", () => {
    expect(renderToString(<Probe />)).toContain('nonce=""');
  });
});

describe("readNonceFromDom", () => {
  const docWith = (script: { nonce: string } | null) =>
    ({ querySelector: () => script }) as unknown as Document;

  it("reads the real nonce through the .nonce property (the attribute may be hidden)", () => {
    expect(readNonceFromDom(docWith({ nonce: "real-nonce_1" }))).toBe("real-nonce_1");
  });

  it("is an empty string when no nonce-bearing script exists or there is no document", () => {
    expect(readNonceFromDom(docWith(null))).toBe("");
    expect(readNonceFromDom(undefined)).toBe("");
  });
});
