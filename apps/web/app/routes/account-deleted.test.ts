// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-router", async () => await vi.importActual("react-router"));
const getAuthSession = vi.fn();
vi.mock("~/utils/auth.server", () => ({
  getAuthSession: (...a: unknown[]) => getAuthSession(...a),
}));

import { loader } from "./account-deleted";

type DataResult = { data: { homeUrl: string; pending: boolean }; init: ResponseInit | null };

const run = (url: string) =>
  loader({
    request: new Request(url),
    params: {},
    context: {},
  } as never) as unknown as Promise<DataResult>;

describe("account-deleted loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthSession.mockResolvedValue({ accessToken: "tok", user: { id: "u1" } });
  });

  it("shows the normal notice without state=pending and never reads the session", async () => {
    const res = await run("http://localhost/account-deleted");
    expect(res.data.pending).toBe(false);
    expect(getAuthSession).not.toHaveBeenCalled();
  });

  it("shows the last step for state=pending with a live session", async () => {
    const res = await run("http://localhost/account-deleted?state=pending");
    expect(res.data.pending).toBe(true);
  });

  it("falls back to the normal notice for state=pending when signed out", async () => {
    getAuthSession.mockResolvedValue({ accessToken: null, user: null });
    const res = await run("http://localhost/account-deleted?state=pending");
    expect(res.data.pending).toBe(false);
  });
});
