import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerSavedDataReload } from "~/services/conflict";
import { profileFixture } from "~/test/fixtures/contractResponses";
import { profileBackend } from "~/test/profileBackend";
import { withRootLoader } from "~/test/rootLoaderRouter";

// The real router: the profile is the root loader's, and a save reloads it (audit slice 8).
vi.mock("react-router", async () => await vi.importActual("react-router"));

const toast = vi.fn();
vi.mock("@repo/ui", () => ({ useOptionalToast: () => ({ toast }) }));

const { forgetWrittenProfileVersion, useUserProfile } = await import("./useUserProfile");

const V1 = "2026-11-14T09:30:00.123Z";
const V2 = "2026-11-15T10:00:00.000Z";
const V3 = "2026-11-15T10:05:00.000Z";

const savedBody = (updatedAt: string, extra: Record<string, unknown> = {}) => ({
  ...profileFixture,
  ...extra,
  updatedAt,
});
const refused = () => new Response(JSON.stringify({ kind: "client" }), { status: 412 });

function backend(updatedAt: string) {
  const api = profileBackend({ updatedAt });
  const answerSaved = (v: string, extra: Record<string, unknown> = {}) =>
    api.answer(savedBody(v, extra));
  return { ...api, answerSaved };
}

/** Profile saves send the version they read and never overwrite a change made elsewhere (BE-16). */
describe("useUserProfile conditional saves", () => {
  const reload = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("ENV", { VITE_API_URL: "https://api.example.test" });
    forgetWrittenProfileVersion();
    toast.mockReset();
    reload.mockReset();
    registerSavedDataReload(reload);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    registerSavedDataReload(null);
  });

  const withProfile = (updatedAt: string) => {
    const api = backend(updatedAt);
    vi.stubGlobal("fetch", api.fetchMock);
    const hook = renderHook(() => useUserProfile(), {
      wrapper: withRootLoader(() => ({ userProfile: api.state.saved })),
    });
    return { ...hook, api };
  };

  it("sends the version it read, then the version each save returned", async () => {
    const { result, api } = withProfile(V1);
    api.answerSaved(V2);
    api.answerSaved(V3);
    await act(async () => {
      await result.current.updateProfile({ displayName: "One" });
      await result.current.updateProfile({ displayName: "Two" });
    });
    expect(api.sentIfMatch(0)).toBe(`"${V1}"`);
    expect(api.sentIfMatch(1)).toBe(`"${V2}"`);
    // Slice 8: the hook reloads saved data rather than storing the response.
    await waitFor(() => expect(result.current.profile.updatedAt).toBe(V3));
  });

  it("runs saves started together one after the other, so this tab never conflicts with itself", async () => {
    const { result, api } = withProfile(V1);
    api.answerSaved(V2);
    api.answerSaved(V3);
    await act(async () => {
      await Promise.all([
        result.current.updateProfile({ displayName: "One" }),
        result.current.updateProfile({ monthlySavingsTarget: 200 }),
      ]);
    });
    expect(api.sentIfMatch(0)).toBe(`"${V1}"`);
    expect(api.sentIfMatch(1)).toBe(`"${V2}"`);
  });

  it("a checklist tick moves the version the next save sends, and sends none itself", async () => {
    const { result, api } = withProfile(V1);
    api.answerSaved(V2, { setupChecklistCompletedSteps: ["profile", "budget"] });
    api.answerSaved(V3);
    await act(async () => {
      await result.current.markChecklistStep("budget", true);
      await result.current.updateProfile({ displayName: "One" });
    });
    expect(api.sentIfMatch(0)).toBeUndefined();
    expect(api.sentIfMatch(1)).toBe(`"${V2}"`);
  });

  it("a 412 says so, reloads the saved profile and rejects, so the form keeps what was typed", async () => {
    const { result, api } = withProfile(V1);
    api.answerWith(refused);
    let error: unknown;
    await act(async () => {
      error = await result.current.updateProfile({ displayName: "Lost update" }).catch((e) => e);
    });
    expect((error as { status?: number }).status).toBe(412);
    expect(toast).toHaveBeenCalledWith({
      title: "We did not save this because it was changed somewhere else",
      description: "The latest version is now loaded. Check it and save again.",
      tone: "warning",
    });
    expect(reload).toHaveBeenCalledTimes(1);
    // Nothing was stored: the profile on screen is still the one that was read.
    expect(result.current.profile.updatedAt).toBe(V1);
    expect(result.current.profile.displayName).toBe(profileFixture.displayName);

    // A later save is not blocked by the failed one.
    api.answerSaved(V3);
    await act(async () => {
      await result.current.updateProfile({ displayName: "Again" });
    });
    await waitFor(() => expect(result.current.profile.updatedAt).toBe(V3));
  });

  it("any other failure raises no conflict message and reloads nothing", async () => {
    const { result, api } = withProfile(V1);
    api.answerWith(() => new Response(null, { status: 503 }));
    await act(async () => {
      await result.current.updateProfile({ displayName: "x" }).catch(() => undefined);
    });
    expect(toast).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it("sends no If-Match before a profile has been read", async () => {
    const { result, api } = withProfile("");
    api.answerSaved(V2);
    await act(async () => {
      await result.current.updateProfile({ displayName: "First" });
    });
    expect(api.sentIfMatch(0)).toBeUndefined();
  });
});
