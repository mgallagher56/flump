// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BackendError } from "~/services/backend-error";

vi.mock("react-router", async () => await vi.importActual("react-router"));

const getAuthSession = vi.fn();
vi.mock("~/utils/auth.server", () => ({
  getAuthSession: (...a: unknown[]) => getAuthSession(...a),
  requireAccessToken: ({ accessToken }: { accessToken?: string }) => accessToken,
}));
const backendFetchBytes = vi.fn();
vi.mock("~/services/backend-client.server", () => ({
  backendFetchBytes: (...a: unknown[]) => backendFetchBytes(...a),
}));

import { loader } from "./app.tax.receipts.$id";

const run = (id: string) =>
  loader({
    request: new Request(`http://localhost/app/tax/receipts/${id}`),
    params: { id },
    context: {},
  } as never);

const bytes = (...b: number[]) => new Uint8Array(b).buffer;

describe("app.tax.receipts.$id loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthSession.mockResolvedValue({ accessToken: "tok" });
  });

  it("serves a raster image inline with the hardening headers", async () => {
    backendFetchBytes.mockResolvedValue({
      body: bytes(1, 2, 3),
      contentType: "image/png",
      filename: "rent receipt.png",
    });
    const res = (await run("r1")) as Response;
    expect(backendFetchBytes).toHaveBeenCalledWith(
      "/tax-records/r1/receipt",
      expect.objectContaining({ accessToken: "tok" }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Content-Disposition")).toBe(
      "inline; filename*=UTF-8''rent%20receipt.png",
    );
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("Content-Security-Policy")).toBe("sandbox; default-src 'none'");
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("serves a PDF as an attachment", async () => {
    backendFetchBytes.mockResolvedValue({
      body: bytes(0x25),
      contentType: "application/pdf",
      filename: "inv.pdf",
    });
    const res = (await run("r1")) as Response;
    expect(res.headers.get("Content-Disposition")).toBe("attachment; filename*=UTF-8''inv.pdf");
  });

  it("falls back to an octet-stream attachment with an escaped name for unknown types", async () => {
    backendFetchBytes.mockResolvedValue({
      body: bytes(1),
      contentType: "text/html",
      filename: "../x'\"\r\n.html",
    });
    const res = (await run("r1")) as Response;
    expect(res.headers.get("Content-Type")).toBe("application/octet-stream");
    const disposition = res.headers.get("Content-Disposition") ?? "";
    expect(disposition.startsWith("attachment; filename*=UTF-8''")).toBe(true);
    expect(disposition).not.toMatch(/[\r\n"]/);
    expect(disposition.slice("attachment; filename*=UTF-8''".length)).not.toContain("'");
  });

  it("returns 404 when the backend says not found", async () => {
    backendFetchBytes.mockRejectedValue(new BackendError("not-found", "/x", 404));
    const res = (await run("r1")) as Response;
    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("rethrows other failures", async () => {
    backendFetchBytes.mockRejectedValue(new BackendError("server", "/x", 500));
    await expect(run("r1")).rejects.toBeInstanceOf(BackendError);
  });
});
