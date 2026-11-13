// @vitest-environment node
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NonceProvider, useNonce } from "./nonce";

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

  it("defaults to an empty string (the client value; browsers hide the attribute value)", () => {
    expect(renderToString(<Probe />)).toContain('nonce=""');
  });
});
