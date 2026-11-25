import { act, renderHook } from "@testing-library/react-native";
import { useDelayedLoading } from "./useDelayedLoading";

describe("useDelayedLoading (200 ms delay, 400 ms minimum)", () => {
  let clock = 0;
  const now = () => clock;
  beforeEach(() => {
    jest.useFakeTimers();
    clock = 0;
  });
  afterEach(() => jest.useRealTimers());

  const tick = async (ms: number) => {
    clock += ms;
    await act(async () => jest.advanceTimersByTime(ms));
  };

  it("shows nothing for a load that ends before 200 ms", async () => {
    const { result, rerender } = await renderHook(
      ({ loading }: { loading: boolean }) => useDelayedLoading(loading, { now }),
      {
        initialProps: { loading: true },
      },
    );
    await tick(199);
    expect(result.current).toBe(false);
    await rerender({ loading: false });
    await tick(500);
    expect(result.current).toBe(false);
  });

  it("shows at 200 ms and stays until 400 ms after it appeared", async () => {
    const { result, rerender } = await renderHook(
      ({ loading }: { loading: boolean }) => useDelayedLoading(loading, { now }),
      {
        initialProps: { loading: true },
      },
    );
    await tick(200);
    expect(result.current).toBe(true);
    // Load ends 50 ms after the skeleton appeared: it must stay another 350 ms (400 - 50).
    await tick(50);
    await rerender({ loading: false });
    await tick(349);
    expect(result.current).toBe(true);
    await tick(1);
    expect(result.current).toBe(false);
  });

  it("hides at once when it has already shown for 400 ms", async () => {
    const { result, rerender } = await renderHook(
      ({ loading }: { loading: boolean }) => useDelayedLoading(loading, { now }),
      {
        initialProps: { loading: true },
      },
    );
    await tick(200);
    await tick(400);
    await rerender({ loading: false });
    expect(result.current).toBe(false);
  });
});
