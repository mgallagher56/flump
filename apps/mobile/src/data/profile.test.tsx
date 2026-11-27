import { act, render, screen, waitFor } from "@testing-library/react-native";
import { useEffect } from "react";
import { Text } from "../components/Text";
import { fail, fakeApi, withApi } from "./fakeApi";
import {
  AppProfile,
  fetchUserEmail,
  patchProfile,
  type SaveProfile,
  useProfile,
  useSaveProfile,
  useUserEmail,
} from "./profile";
import { queryKeys } from "./queryKeys";

const UPDATED_AT = "2026-11-20T09:15:00.000Z";

describe("patchProfile", () => {
  it("sends a PATCH with the body as given and If-Match from updatedAt, as web does", async () => {
    const api = fakeApi({
      "PATCH /user-profile": () => ({ netWorthCountsProperty: false, updatedAt: UPDATED_AT }),
    });
    const saved = await patchProfile(
      api.client,
      { netWorthCountsProperty: false },
      "2026-11-19T08:00:00Z",
    );
    expect(api.calls).toEqual([
      {
        method: "PATCH",
        path: "/user-profile",
        body: { netWorthCountsProperty: false },
        // etagFor: the instant as an ISO string, in quotes.
        ifMatch: '"2026-11-19T08:00:00.000Z"',
      },
    ]);
    expect(saved).toEqual({ netWorthCountsProperty: false, updatedAt: UPDATED_AT });
  });

  it.each([
    ["absent", undefined],
    ["null", null],
    ["not a date", "yesterday"],
  ])("sends no If-Match when updatedAt is %s (an older backend)", async (_name, updatedAt) => {
    const api = fakeApi({ "PATCH /user-profile": () => ({}) });
    await patchProfile(api.client, { checkInDay: 12 }, updatedAt);
    expect(api.calls[0]).toEqual({
      method: "PATCH",
      path: "/user-profile",
      body: { checkInDay: 12 },
    });
    expect(api.calls[0]).not.toHaveProperty("ifMatch");
  });

  it("refuses a body the strict contract refuses, before any request", async () => {
    const api = fakeApi({ "PATCH /user-profile": () => ({}) });
    await expect(
      patchProfile(api.client, { checkInDay: 32 } as never, UPDATED_AT),
    ).rejects.toThrow();
    await expect(
      patchProfile(api.client, { notAField: true } as never, UPDATED_AT),
    ).rejects.toThrow();
    expect(api.request).not.toHaveBeenCalled();
  });
});

describe("the profile pick", () => {
  it("lets every field be absent (an older backend) and keeps unknown fields (a newer one)", () => {
    expect(AppProfile.parse({})).toEqual({});
    expect(AppProfile.parse({ firstName: "Sam", fieldFromALaterBackend: 1 })).toEqual({
      firstName: "Sam",
      fieldFromALaterBackend: 1,
    });
  });

  it("refuses a field of the wrong type, so a broken answer is out of step", () => {
    expect(AppProfile.safeParse({ enabledPages: "tax" }).success).toBe(false);
  });
});

/** The profile query switched off, as restored offline. */
function Off() {
  const profile = useProfile({ enabled: false });
  return <Text>{profile.status}</Text>;
}

/** Mounts the profile query and hands the save function out. */
function Harness({ onSave }: { onSave(save: SaveProfile): void }) {
  const profile = useProfile();
  const save = useSaveProfile();
  useEffect(() => onSave(save), [onSave, save]);
  return <Text testID="counts">{String(profile.data?.netWorthCountsProperty)}</Text>;
}

async function mounted(routes: Parameters<typeof fakeApi>[0]) {
  const api = fakeApi(routes);
  let save: SaveProfile | undefined;
  const { ui, queryClient } = withApi(<Harness onSave={(s) => (save = s)} />, api.client);
  await render(ui);
  await waitFor(() => expect(screen.getByTestId("counts")).toHaveTextContent("true"));
  if (!save) throw new Error("no save function");
  return { api, save, queryClient };
}

describe("useSaveProfile", () => {
  it("writes the answer into the one profile query, keeping fields the answer leaves out", async () => {
    const { save, queryClient } = await mounted({
      "GET /user-profile": () => ({
        netWorthCountsProperty: true,
        checkInDay: 3,
        updatedAt: UPDATED_AT,
      }),
      "PATCH /user-profile": () => ({
        netWorthCountsProperty: false,
        updatedAt: "2026-11-21T10:00:00.000Z",
      }),
    });
    let result: string | undefined;
    await act(async () => {
      result = await save({ netWorthCountsProperty: false });
    });
    expect(result).toBe("saved");
    expect(queryClient.getQueryData(queryKeys.userProfile())).toEqual({
      netWorthCountsProperty: false,
      checkInDay: 3,
      updatedAt: "2026-11-21T10:00:00.000Z",
    });
    await waitFor(() => expect(screen.getByTestId("counts")).toHaveTextContent("false"));
  });

  it("a second save sends the version the first one returned", async () => {
    let n = 0;
    const { api, save } = await mounted({
      "GET /user-profile": () => ({ netWorthCountsProperty: true, updatedAt: UPDATED_AT }),
      "PATCH /user-profile": () => {
        n += 1;
        return { updatedAt: `2026-11-2${n}T10:00:00.000Z` };
      },
    });
    await act(async () => {
      await Promise.all([save({ checkInDay: 4 }), save({ checkInDay: 5 })]);
    });
    const patches = api.calls.filter((c) => c.method === "PATCH") as { ifMatch?: string }[];
    expect(patches.map((c) => c.ifMatch)).toEqual([
      '"2026-11-20T09:15:00.000Z"',
      '"2026-11-21T10:00:00.000Z"',
    ]);
  });

  it("a 412 reads the profile again, saves nothing and says conflict", async () => {
    let reads = 0;
    const { api, save, queryClient } = await mounted({
      "GET /user-profile": () => {
        reads += 1;
        // Changed on the website in the meantime: the second read has the other value.
        return { netWorthCountsProperty: reads === 1, updatedAt: UPDATED_AT };
      },
      "PATCH /user-profile": () => fail("client", 412, "precondition_failed"),
    });
    let result: string | undefined;
    await act(async () => {
      result = await save({ netWorthCountsProperty: true });
    });
    expect(result).toBe("conflict");
    expect(reads).toBe(2);
    expect(queryClient.getQueryData(queryKeys.userProfile())).toEqual({
      netWorthCountsProperty: false,
      updatedAt: UPDATED_AT,
    });
    expect(api.calls.filter((c) => c.method === "PATCH")).toHaveLength(1);
  });

  it("a failed save leaves the cache as it was and says failed", async () => {
    const { save, queryClient } = await mounted({
      "GET /user-profile": () => ({ netWorthCountsProperty: true, updatedAt: UPDATED_AT }),
      "PATCH /user-profile": () => fail("server", 500),
    });
    let result: string | undefined;
    await act(async () => {
      result = await save({ netWorthCountsProperty: false });
    });
    expect(result).toBe("failed");
    expect(queryClient.getQueryData(queryKeys.userProfile())).toEqual({
      netWorthCountsProperty: true,
      updatedAt: UPDATED_AT,
    });
  });
});

/** The email query switched off, as restored offline. */
function OffEmail() {
  const email = useUserEmail({ enabled: false });
  return <Text>{email.status}</Text>;
}

describe("useProfile", () => {
  it("sends no request while switched off (restored offline)", async () => {
    const api = fakeApi({ "GET /user-profile": () => ({}) });
    const { ui } = withApi(<Off />, api.client);
    await render(ui);
    expect(screen.getByText("pending")).toBeOnTheScreen();
    expect(api.request).not.toHaveBeenCalled();
  });
});

describe("fetchUserEmail and useUserEmail", () => {
  it("returns the email or null, and defaults a body lacking email to null (older backend)", async () => {
    const sampleEmail = ["person", "example.com"].join("@");
    const api = fakeApi({ "GET /user-profile/email": () => ({ email: sampleEmail }) });
    await expect(fetchUserEmail(api.client)).resolves.toBe(sampleEmail);

    const nullApi = fakeApi({ "GET /user-profile/email": () => ({ email: null }) });
    await expect(fetchUserEmail(nullApi.client)).resolves.toBeNull();

    const olderApi = fakeApi({ "GET /user-profile/email": () => ({}) });
    await expect(fetchUserEmail(olderApi.client)).resolves.toBeNull();
  });

  it("sends no request while switched off (restored offline)", async () => {
    const api = fakeApi({ "GET /user-profile/email": () => ({ email: null }) });
    const { ui } = withApi(<OffEmail />, api.client);
    await render(ui);
    expect(screen.getByText("pending")).toBeOnTheScreen();
    expect(api.request).not.toHaveBeenCalled();
  });
});
