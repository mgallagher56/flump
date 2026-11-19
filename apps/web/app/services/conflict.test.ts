import { BackendError } from "@flump/api-client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CONFLICT_MESSAGE,
  CONFLICT_STATUS,
  CONFLICT_TOAST,
  ifMatchFromForm,
  isConflict,
  PROFILE_VERSION_FIELD,
  registerSavedDataReload,
  reloadAfterConflict,
  revalidateOnConflict,
  revalidateRootData,
  VERSION_FIELD,
  versionEtag,
  versionField,
} from "./conflict";

const UPDATED_AT = "2026-11-14T09:30:00.123Z";

describe("conditional writes on the web (BE-16)", () => {
  afterEach(() => registerSavedDataReload(null));

  it("turns a record's updatedAt into the If-Match value, and nothing else", () => {
    expect(versionEtag(UPDATED_AT)).toBe(`"${UPDATED_AT}"`);
    for (const missing of [undefined, null, "", "not a date", 42, {}]) {
      expect(versionEtag(missing)).toBeUndefined();
    }
  });

  it("carries a saved record's version as a form field", () => {
    expect(versionField({ id: "a", updatedAt: UPDATED_AT })).toEqual({
      [VERSION_FIELD]: UPDATED_AT,
    });
    expect(versionField({ updatedAt: UPDATED_AT }, PROFILE_VERSION_FIELD)).toEqual({
      [PROFILE_VERSION_FIELD]: UPDATED_AT,
    });
    // A record with no version (a new one, or an older page) sends no field.
    for (const record of [undefined, null, {}, { updatedAt: "" }, { updatedAt: 1 }]) {
      expect(versionField(record)).toEqual({});
    }
  });

  it("reads the If-Match value back from a posted form", () => {
    const form = new FormData();
    expect(ifMatchFromForm(form)).toBeUndefined();
    form.set(VERSION_FIELD, UPDATED_AT);
    form.set(PROFILE_VERSION_FIELD, "2026-11-15T10:00:00.000Z");
    expect(ifMatchFromForm(form)).toBe(`"${UPDATED_AT}"`);
    expect(ifMatchFromForm(form, PROFILE_VERSION_FIELD)).toBe('"2026-11-15T10:00:00.000Z"');
    form.set(VERSION_FIELD, "junk");
    expect(ifMatchFromForm(form)).toBeUndefined();
  });

  it("recognises only a 412 from the API as a conflict", () => {
    expect(isConflict(new BackendError("client", "/accounts/1", CONFLICT_STATUS))).toBe(true);
    expect(isConflict(new BackendError("client", "/accounts/1", 409))).toBe(false);
    expect(isConflict(new BackendError("unavailable", "/accounts/1"))).toBe(false);
    expect(isConflict(Object.assign(new Error("412"), { status: 412 }))).toBe(false);
    expect(isConflict(undefined)).toBe(false);
  });

  it("reloads a route's saved data after a 412, which React Router skips by default", () => {
    const args = (actionStatus: number | undefined, defaultShouldRevalidate: boolean) =>
      ({ actionStatus, defaultShouldRevalidate }) as never;
    expect(revalidateOnConflict(args(412, false))).toBe(true);
    expect(revalidateOnConflict(args(400, false))).toBe(false);
    expect(revalidateOnConflict(args(undefined, true))).toBe(true);
    expect(revalidateOnConflict(args(200, true))).toBe(true);
  });

  it("reloads the root's saved profile on every page change, so no page keeps an old one (slice 8)", () => {
    const nav = (from: string, to: string, defaultShouldRevalidate = false) =>
      ({
        currentUrl: new URL(`https://app.test${from}`),
        nextUrl: new URL(`https://app.test${to}`),
        defaultShouldRevalidate,
      }) as never;
    expect(revalidateRootData(nav("/app", "/app/pension"))).toBe(true);
    // The same page with a new query or hash is not a page change.
    expect(revalidateRootData(nav("/app/budget", "/app/budget?setup=common"))).toBe(false);
    expect(revalidateRootData(nav("/app/budget", "/app/budget", true))).toBe(true);
    expect(revalidateRootData({ actionStatus: 412, defaultShouldRevalidate: false } as never)).toBe(
      true,
    );
  });

  it("reloads saved data for a browser-side save only while the app shell has registered how", () => {
    const reload = vi.fn();
    reloadAfterConflict();
    registerSavedDataReload(reload);
    reloadAfterConflict();
    expect(reload).toHaveBeenCalledTimes(1);
    registerSavedDataReload(null);
    reloadAfterConflict();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("says what happened, where the data stands and what to do, without blame", () => {
    expect(CONFLICT_MESSAGE).toBe(
      "We did not save this because it was changed somewhere else. The latest version is now loaded. Check it and save again.",
    );
    expect(`${CONFLICT_TOAST.title}. ${CONFLICT_TOAST.description}`).toBe(CONFLICT_MESSAGE);
  });
});
