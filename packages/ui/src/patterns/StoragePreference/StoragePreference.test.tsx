import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { OPTIONAL_STORAGE_KEY, setOptionalStorageOff } from "../../hooks/optionalStorage";
import {
  STORAGE_PREFERENCE_LABEL,
  STORAGE_PREFERENCE_OFF,
  STORAGE_PREFERENCE_ON,
  StoragePreference,
} from "./StoragePreference";

const control = () => screen.getByRole("switch", { name: STORAGE_PREFERENCE_LABEL });

describe("StoragePreference", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("is on by default and stores nothing about a person who never objected", () => {
    render(<StoragePreference />);
    expect((control() as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText(STORAGE_PREFERENCE_ON)).toBeDefined();
    expect(window.localStorage.getItem(OPTIONAL_STORAGE_KEY)).toBeNull();
  });

  it("switching off records the objection and removes the optional keys only", () => {
    window.sessionStorage.setItem("flump.scene-settled.hero", "1");
    window.sessionStorage.setItem("flump.setup-step-count", "2");
    window.sessionStorage.setItem("flump-marketing-scroll", "{}");
    window.sessionStorage.setItem("unrelated", "kept");
    render(<StoragePreference />);

    fireEvent.click(control());

    expect((control() as HTMLInputElement).checked).toBe(false);
    expect(screen.getByText(STORAGE_PREFERENCE_OFF)).toBeDefined();
    expect(window.localStorage.getItem(OPTIONAL_STORAGE_KEY)).toBe("off");
    expect(window.sessionStorage.getItem("flump.scene-settled.hero")).toBeNull();
    expect(window.sessionStorage.getItem("flump.setup-step-count")).toBeNull();
    expect(window.sessionStorage.getItem("flump-marketing-scroll")).toBeNull();
    expect(window.sessionStorage.getItem("unrelated")).toBe("kept");
  });

  it("switching back on removes the objection", () => {
    setOptionalStorageOff(true);
    render(<StoragePreference />);
    expect((control() as HTMLInputElement).checked).toBe(false);

    fireEvent.click(control());

    expect((control() as HTMLInputElement).checked).toBe(true);
    expect(window.localStorage.getItem(OPTIONAL_STORAGE_KEY)).toBeNull();
  });

  it("follows a change made elsewhere on the page", () => {
    render(<StoragePreference />);
    act(() => setOptionalStorageOff(true));
    expect((control() as HTMLInputElement).checked).toBe(false);
  });
});
