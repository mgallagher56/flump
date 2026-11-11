import { describe, expect, it } from "vitest";
import type { McpUserDataProvider } from "../types.js";
import { HttpMcpHandler } from "./http.js";

const handler = new HttpMcpHandler({ dataProvider: {} as McpUserDataProvider });
const PAT = "flump_pat_0123456789abcdef0123456789abcdef";
const unsignedJwt = `eyJhbGciOiJub25lIn0.${Buffer.from('{"sub":"x"}').toString("base64")}.sig`;

const headers: Array<[string, string | undefined]> = [
  ["missing Authorization", undefined],
  ["malformed Authorization", "Basic abc"],
  ["mock-session-token", "Bearer mock-session-token"],
  ["mock_mcp_x", "Bearer mock_mcp_x"],
  ["unsigned JWT", `Bearer ${unsignedJwt}`],
  ["PAT with no store", `Bearer ${PAT}`],
];

describe("HttpMcpHandler auth failures", () => {
  for (const [name, header] of headers) {
    it(`web request: ${name} is 401`, async () => {
      const req = new Request("http://localhost/mcp", {
        method: "POST",
        headers: header ? { authorization: header } : {},
      });
      const res = await handler.handleWebRequest(req);
      expect(res.status).toBe(401);
    });

    it(`express request: ${name} is 401`, async () => {
      let status = 0;
      const res: any = {
        status(code: number) {
          status = code;
          return this;
        },
        json() {
          return this;
        },
      };
      await handler.handleExpressRequest({ headers: header ? { authorization: header } : {} }, res);
      expect(status).toBe(401);
    });
  }
});
