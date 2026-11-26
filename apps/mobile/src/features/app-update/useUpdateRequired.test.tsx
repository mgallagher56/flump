import { act, renderHook } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";
import { useUpdateRequired } from "./useUpdateRequired";

let appStateListener: ((state: AppStateStatus) => void) | undefined;
const remove = jest.fn();

beforeEach(() => {
  appStateListener = undefined;
  remove.mockClear();
  jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
    appStateListener = listener as (state: AppStateStatus) => void;
    return { remove } as unknown as ReturnType<typeof AppState.addEventListener>;
  });
});

afterEach(() => jest.restoreAllMocks());

const settle = () => act(async () => {});

describe("useUpdateRequired", () => {
  it("checks on launch and blocks when the check says so", async () => {
    const check = jest.fn(async () => true);
    const { result } = await renderHook(() => useUpdateRequired(check));
    await settle();
    expect(check).toHaveBeenCalledTimes(1);
    expect(result.current.required).toBe(true);
  });

  it("checks again on return to the foreground, and only then", async () => {
    let answer = false;
    const check = jest.fn(async () => answer);
    const { result } = await renderHook(() => useUpdateRequired(check));
    await settle();
    expect(result.current.required).toBe(false);
    answer = true;
    await act(async () => appStateListener?.("background"));
    expect(check).toHaveBeenCalledTimes(1);
    await act(async () => appStateListener?.("active"));
    expect(check).toHaveBeenCalledTimes(2);
    expect(result.current.required).toBe(true);
  });

  it("recheck lifts the block once the server allows this version", async () => {
    let answer = true;
    const check = jest.fn(async () => answer);
    const { result } = await renderHook(() => useUpdateRequired(check));
    await settle();
    expect(result.current.required).toBe(true);
    answer = false;
    await act(async () => result.current.recheck());
    expect(result.current.required).toBe(false);
  });

  it("a late answer from an earlier check never overwrites a newer one", async () => {
    const answers: ((value: boolean) => void)[] = [];
    const check = jest.fn(() => new Promise<boolean>((resolve) => answers.push(resolve)));
    const { result } = await renderHook(() => useUpdateRequired(check));
    await act(async () => result.current.recheck());
    await act(async () => answers[1]?.(false));
    await act(async () => answers[0]?.(true));
    expect(result.current.required).toBe(false);
  });

  it("with no check never blocks and calls nothing", async () => {
    const { result } = await renderHook(() => useUpdateRequired(undefined));
    await settle();
    expect(result.current.required).toBe(false);
  });

  it("stops listening when it goes away", async () => {
    const { unmount } = await renderHook(() => useUpdateRequired(async () => false));
    await act(async () => unmount());
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
