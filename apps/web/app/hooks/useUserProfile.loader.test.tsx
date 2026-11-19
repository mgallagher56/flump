import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { profileFixture } from "~/test/fixtures/contractResponses";
import { withRootLoader } from "~/test/rootLoaderRouter";

// The real router: the shared setup stubs revalidation, and these tests are about it.
vi.mock("react-router", async () => await vi.importActual("react-router"));

vi.mock("@repo/ui", () => ({ useOptionalToast: () => ({ toast: vi.fn() }) }));

const { forgetWrittenProfileVersion, useUserProfile } = await import("./useUserProfile");

// Audit slice 8 (L63, CS-5, CS-6, decision 13): the profile is the root loader's, never a browser
// copy. A save reloads saved data, so this page and the next show it with no manual reload.

const V1 = "2026-11-19T09:00:00.000Z";
const V2 = "2026-11-19T09:05:00.000Z";
const V3 = "2026-11-19T09:10:00.000Z";

/** A stand-in backend: the root loader reads `saved`; each PATCH replaces it. */
function backend(initial: Record<string, unknown>) {
  const state = { saved: { ...profileFixture, ...initial } as Record<string, unknown> };
  const bodies: unknown[] = [];
  const ifMatch: (string | undefined)[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    bodies.push(body);
    ifMatch.push((init?.headers as Record<string, string> | undefined)?.["If-Match"]);
    const versions = [V1, V2, V3];
    const next = versions[Math.min(versions.indexOf(String(state.saved.updatedAt)) + 1, 2)];
    if (String(url).endsWith("/user-profile/checklist")) {
      const steps = state.saved.setupChecklistCompletedSteps as string[];
      state.saved = {
        ...state.saved,
        ...(body.dismissed !== undefined
          ? { setupChecklistDismissed: body.dismissed }
          : {
              setupChecklistCompletedSteps: body.completed
                ? [...steps, body.step]
                : steps.filter((s) => s !== body.step),
            }),
        updatedAt: next,
      };
    } else {
      state.saved = { ...state.saved, ...body, updatedAt: next };
    }
    return new Response(JSON.stringify(state.saved), { status: 200 });
  });
  return { state, bodies, ifMatch, fetchMock };
}

describe("useUserProfile reads the root loader's saved profile (slice 8)", () => {
  beforeEach(() => {
    vi.stubGlobal("ENV", { VITE_API_URL: "https://api.example.test" });
    forgetWrittenProfileVersion();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("has the saved profile on the first render, with nothing seeded", () => {
    const api = backend({ updatedAt: V1, enabledPages: ["accounts", "tax"] });
    const { result } = renderHook(() => useUserProfile(), {
      wrapper: withRootLoader(() => ({ userProfile: api.state.saved })),
    });
    expect(result.current.profile.enabledPages).toEqual(["accounts", "tax"]);
    expect(result.current.profile.updatedAt).toBe(V1);
  });

  it("reloads saved data after a save, so the page shows it (L63)", async () => {
    const api = backend({ updatedAt: V1, displayName: "Before" });
    vi.stubGlobal("fetch", api.fetchMock);
    const { result } = renderHook(() => useUserProfile(), {
      wrapper: withRootLoader(() => ({ userProfile: api.state.saved })),
    });
    await act(async () => {
      await result.current.updateProfile({ displayName: "After" });
    });
    await waitFor(() => expect(result.current.profile.displayName).toBe("After"));
    expect(result.current.profile.updatedAt).toBe(V2);
  });

  it("two saves in a row send the version each one returned, never a conflict with itself", async () => {
    const api = backend({ updatedAt: V1 });
    vi.stubGlobal("fetch", api.fetchMock);
    const { result } = renderHook(() => useUserProfile(), {
      wrapper: withRootLoader(() => ({ userProfile: api.state.saved })),
    });
    await act(async () => {
      await Promise.all([
        result.current.updateProfile({ displayName: "One" }),
        result.current.updateProfile({ displayName: "Two" }),
      ]);
    });
    expect(api.ifMatch).toEqual([`"${V1}"`, `"${V2}"`]);
  });

  it("does not write a checklist step that is already done (CS-6)", async () => {
    const api = backend({ updatedAt: V1, setupChecklistCompletedSteps: ["runway"] });
    vi.stubGlobal("fetch", api.fetchMock);
    const { result } = renderHook(() => useUserProfile(), {
      wrapper: withRootLoader(() => ({ userProfile: api.state.saved })),
    });
    await act(async () => {
      await result.current.markChecklistStep("runway", true);
    });
    expect(api.fetchMock).not.toHaveBeenCalled();
  });

  it("a step undone and redone before the reload lands sends both changes", async () => {
    const api = backend({ updatedAt: V1, setupChecklistCompletedSteps: ["budget"] });
    vi.stubGlobal("fetch", api.fetchMock);
    const { result } = renderHook(() => useUserProfile(), {
      wrapper: withRootLoader(() => ({ userProfile: api.state.saved })),
    });
    await act(async () => {
      await Promise.all([
        result.current.markChecklistStep("budget", false),
        result.current.markChecklistStep("budget", true),
      ]);
    });
    expect(api.bodies).toEqual([
      { step: "budget", completed: false },
      { step: "budget", completed: true },
    ]);
  });

  it("a save made just before leaving the page can skip its own reload", async () => {
    const api = backend({ updatedAt: V1, displayName: "Before" });
    vi.stubGlobal("fetch", api.fetchMock);
    let loads = 0;
    const { result } = renderHook(() => useUserProfile(), {
      wrapper: withRootLoader(() => {
        loads += 1;
        return { userProfile: api.state.saved };
      }),
    });
    const before = loads;
    await act(async () => {
      await result.current.updateProfile({ displayName: "After" }, { reload: false });
    });
    expect(api.bodies).toEqual([{ displayName: "After" }]);
    expect(loads).toBe(before);
  });

  it("stores the dismissed checklist on the profile and reloads it (decision 13)", async () => {
    const api = backend({ updatedAt: V1, setupChecklistDismissed: false });
    vi.stubGlobal("fetch", api.fetchMock);
    const { result } = renderHook(() => useUserProfile(), {
      wrapper: withRootLoader(() => ({ userProfile: api.state.saved })),
    });
    expect(result.current.profile.setupChecklistDismissed).toBe(false);
    await act(async () => {
      await result.current.dismissChecklist();
    });
    expect(api.bodies).toEqual([{ dismissed: true }]);
    await waitFor(() => expect(result.current.profile.setupChecklistDismissed).toBe(true));
  });

  it("reads as the empty default profile when signed out", () => {
    const { result } = renderHook(() => useUserProfile(), {
      wrapper: withRootLoader({ user: null, userProfile: null }),
    });
    expect(result.current.profile.id).toBe("");
  });
});
