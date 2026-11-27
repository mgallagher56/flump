import { act, render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StillMotionProvider } from "../context/StillMotionContext";
import type { GsapKit } from "./loadGsapKit";
import { useGsapMoment } from "./useGsapMoment";

const motion = vi.hoisted(() => ({ reduced: false }));
const gsapKit = vi.hoisted(() => ({ load: vi.fn() }));

vi.mock("@repo/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@repo/ui")>()),
  usePrefersReducedMotion: () => motion.reduced,
}));
vi.mock("./loadGsapKit", () => ({ loadGsapKit: gsapKit.load }));

/** An IntersectionObserver the test drives by hand. */
class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  observed: Element[] = [];
  disconnect = vi.fn();
  constructor(
    readonly callback: IntersectionObserverCallback,
    readonly options: IntersectionObserverInit,
  ) {
    FakeIntersectionObserver.instances.push(this);
  }
  observe(target: Element) {
    this.observed.push(target);
  }
  report(isIntersecting: boolean) {
    this.callback(
      this.observed.map((target) => ({ isIntersecting, target }) as IntersectionObserverEntry),
      this as unknown as IntersectionObserver,
    );
  }
}

/** A ResizeObserver the test drives by hand. */
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  observed: Element[] = [];
  disconnect = vi.fn();
  constructor(readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
  }
  observe(target: Element) {
    this.observed.push(target);
  }
  resize() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

const makeKit = () => {
  const revert = vi.fn();
  const context = vi.fn((fn: () => void, _scope: Element) => {
    fn();
    return { revert };
  });
  const refresh = vi.fn();
  const kit = { gsap: { context }, ScrollTrigger: { refresh } } as unknown as GsapKit;
  return { kit, context, revert, refresh };
};

type Setup = Parameters<typeof useGsapMoment>[1];

function Band({ setup, deps, label }: { setup: Setup; deps?: unknown[]; label: string }) {
  const ref = useRef<HTMLElement>(null);
  useGsapMoment(ref, setup, deps);
  return <section aria-label={label} ref={ref} />;
}

/** Lets the loaded kit's promise settle and every queued set-up and the refresh run. */
const flush = () => act(() => vi.runAllTimersAsync());

let main: HTMLElement;

beforeEach(() => {
  vi.useFakeTimers();
  motion.reduced = false;
  FakeIntersectionObserver.instances = [];
  FakeResizeObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  // A fresh main each time, as after a link to another page and back.
  main = document.createElement("main");
  main.id = "main";
  document.body.append(main);
});

afterEach(() => {
  main.remove();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  gsapKit.load.mockReset();
});

const renderBand = (setup: Setup, label = "Band") =>
  render(<Band label={label} setup={setup} />, { container: main });

describe("useGsapMoment", () => {
  it("waits until the band is within one and a half screens before loading GSAP", async () => {
    const { kit, context, refresh } = makeKit();
    gsapKit.load.mockResolvedValue(kit);
    const setup = vi.fn<Setup>(() => undefined);
    const { getByRole } = renderBand(setup);
    const band = getByRole("region", { name: "Band" });
    const observer = FakeIntersectionObserver.instances[0] as FakeIntersectionObserver;

    expect(observer.options).toEqual({ rootMargin: "150% 0px 150% 0px" });
    expect(observer.observed).toEqual([band]);
    observer.report(false);
    await flush();
    expect(gsapKit.load).not.toHaveBeenCalled();
    expect(observer.disconnect).not.toHaveBeenCalled();

    observer.report(true);
    expect(observer.disconnect).toHaveBeenCalledTimes(1);
    await flush();

    expect(gsapKit.load).toHaveBeenCalledTimes(1);
    expect(setup).toHaveBeenCalledTimes(1);
    expect(setup).toHaveBeenCalledWith(kit, band);
    expect(context.mock.calls[0]?.[1]).toBe(band);
    expect(band.dataset.enhanced).toBe("true");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("sets up queued bands one task apart, then refreshes ScrollTrigger once", async () => {
    const { kit, refresh } = makeKit();
    gsapKit.load.mockResolvedValue(kit);
    const first = vi.fn<Setup>(() => undefined);
    const second = vi.fn<Setup>(() => undefined);
    render(
      <>
        <Band label="First" setup={first} />
        <Band label="Second" setup={second} />
      </>,
      { container: main },
    );
    for (const observer of FakeIntersectionObserver.instances) observer.report(true);

    // Let the kit's promise settle without running any timer: nothing set up yet.
    await act(() => Promise.resolve());
    expect(first).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersToNextTimerAsync());
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersToNextTimerAsync());
    expect(second).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersToNextTimerAsync());
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("never observes, loads GSAP or sets up under reduced motion", async () => {
    motion.reduced = true;
    const setup = vi.fn<Setup>(() => undefined);
    const { getByRole } = renderBand(setup);
    await flush();
    expect(FakeIntersectionObserver.instances).toHaveLength(0);
    expect(gsapKit.load).not.toHaveBeenCalled();
    expect(setup).not.toHaveBeenCalled();
    expect(getByRole("region", { name: "Band" }).dataset.enhanced).toBeUndefined();
  });

  it("never sets up inside a still page, as a story showing the rest state is", async () => {
    const setup = vi.fn<Setup>(() => undefined);
    render(
      <StillMotionProvider>
        <Band label="Band" setup={setup} />
      </StillMotionProvider>,
      { container: main },
    );
    await flush();
    expect(FakeIntersectionObserver.instances).toHaveLength(0);
    expect(gsapKit.load).not.toHaveBeenCalled();
    expect(setup).not.toHaveBeenCalled();
  });

  it("does nothing where IntersectionObserver is missing", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const setup = vi.fn<Setup>(() => undefined);
    renderBand(setup);
    await flush();
    expect(gsapKit.load).not.toHaveBeenCalled();
    expect(setup).not.toHaveBeenCalled();
  });

  it("reverts the context and the set-up's own clean-up on unmount", async () => {
    const { kit, revert } = makeKit();
    gsapKit.load.mockResolvedValue(kit);
    const cleanUp = vi.fn();
    const { getByRole, unmount } = renderBand(() => cleanUp);
    const band = getByRole("region", { name: "Band" });
    const observer = FakeIntersectionObserver.instances[0] as FakeIntersectionObserver;
    observer.report(true);
    await flush();
    expect(band.dataset.enhanced).toBe("true");
    expect(revert).not.toHaveBeenCalled();

    unmount();

    expect(cleanUp).toHaveBeenCalledTimes(1);
    expect(revert).toHaveBeenCalledTimes(1);
    expect(band.dataset.enhanced).toBeUndefined();
    // Disconnected once on entering view and once more on unmount.
    expect(observer.disconnect).toHaveBeenCalledTimes(2);
  });

  it("never sets up a band unmounted while GSAP was loading", async () => {
    const { kit, context } = makeKit();
    let resolve: (value: GsapKit) => void = () => {};
    gsapKit.load.mockReturnValue(new Promise<GsapKit>((r) => (resolve = r)));
    const setup = vi.fn<Setup>(() => undefined);
    const { unmount } = renderBand(setup);
    (FakeIntersectionObserver.instances[0] as FakeIntersectionObserver).report(true);
    unmount();
    resolve(kit);
    await flush();
    expect(setup).not.toHaveBeenCalled();
    expect(context).not.toHaveBeenCalled();
  });

  it("never sets up a band unmounted while queued", async () => {
    const { kit, context } = makeKit();
    gsapKit.load.mockResolvedValue(kit);
    const setup = vi.fn<Setup>(() => undefined);
    const { unmount } = renderBand(setup);
    (FakeIntersectionObserver.instances[0] as FakeIntersectionObserver).report(true);
    await act(() => Promise.resolve());
    unmount();
    await flush();
    expect(setup).not.toHaveBeenCalled();
    expect(context).not.toHaveBeenCalled();
  });

  it("leaves no timer behind when its band unmounts while queued", async () => {
    const { kit } = makeKit();
    gsapKit.load.mockResolvedValue(kit);
    const { unmount } = renderBand(vi.fn<Setup>(() => undefined));
    (FakeIntersectionObserver.instances[0] as FakeIntersectionObserver).report(true);
    await act(() => Promise.resolve());
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps the other bands queued when one unmounts", async () => {
    const { kit, refresh } = makeKit();
    gsapKit.load.mockResolvedValue(kit);
    const first = vi.fn<Setup>(() => undefined);
    const second = vi.fn<Setup>(() => undefined);
    const holder = (): HTMLElement => main.appendChild(document.createElement("div"));
    const firstBand = render(<Band label="First" setup={first} />, { container: holder() });
    render(<Band label="Second" setup={second} />, { container: holder() });
    for (const observer of FakeIntersectionObserver.instances) observer.report(true);
    await act(() => Promise.resolve());
    firstBand.unmount();
    await flush();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("goes on to the next band when a set-up throws", async () => {
    const { kit } = makeKit();
    gsapKit.load.mockResolvedValue(kit);
    const second = vi.fn<Setup>(() => undefined);
    render(
      <>
        <Band
          label="First"
          setup={() => {
            throw new Error("broken band");
          }}
        />
        <Band label="Second" setup={second} />
      </>,
      { container: main },
    );
    for (const observer of FakeIntersectionObserver.instances) observer.report(true);
    await act(() => Promise.resolve());
    await expect(act(() => vi.advanceTimersToNextTimerAsync())).rejects.toThrow("broken band");
    await flush();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("stops without setting up once the window has gone", async () => {
    const { kit, context, refresh } = makeKit();
    gsapKit.load.mockResolvedValue(kit);
    renderBand(vi.fn<Setup>(() => undefined));
    (FakeIntersectionObserver.instances[0] as FakeIntersectionObserver).report(true);
    await act(() => Promise.resolve());
    // As when the test environment is torn down with a set-up still queued.
    vi.stubGlobal("window", undefined);
    await vi.runAllTimersAsync();
    vi.unstubAllGlobals();
    expect(context).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("re-runs the set-up when its deps change", async () => {
    const { kit, revert } = makeKit();
    gsapKit.load.mockResolvedValue(kit);
    const setup = vi.fn<Setup>(() => undefined);
    const { rerender } = render(<Band deps={["a"]} label="Band" setup={setup} />, {
      container: main,
    });
    (FakeIntersectionObserver.instances[0] as FakeIntersectionObserver).report(true);
    await flush();
    expect(setup).toHaveBeenCalledTimes(1);

    rerender(<Band deps={["b"]} label="Band" setup={setup} />);
    expect(revert).toHaveBeenCalledTimes(1);
    expect(FakeIntersectionObserver.instances).toHaveLength(2);
    (FakeIntersectionObserver.instances[1] as FakeIntersectionObserver).report(true);
    await flush();
    expect(setup).toHaveBeenCalledTimes(2);

    // The same deps again do not re-run it.
    rerender(<Band deps={["b"]} label="Band" setup={setup} />);
    expect(FakeIntersectionObserver.instances).toHaveLength(2);
  });

  it("refreshes every trigger 200ms after the page's height stops changing", async () => {
    const { kit, refresh } = makeKit();
    gsapKit.load.mockResolvedValue(kit);
    renderBand(() => undefined);
    (FakeIntersectionObserver.instances[0] as FakeIntersectionObserver).report(true);
    await flush();
    expect(refresh).toHaveBeenCalledTimes(1);
    const watcher = FakeResizeObserver.instances[0] as FakeResizeObserver;
    expect(watcher.observed).toEqual([main]);

    watcher.resize();
    vi.advanceTimersByTime(150);
    watcher.resize();
    vi.advanceTimersByTime(199);
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("watches one main at a time: a second band on it adds no watcher, a new main replaces it", async () => {
    const { kit } = makeKit();
    gsapKit.load.mockResolvedValue(kit);
    const { unmount } = render(
      <>
        <Band label="First" setup={() => undefined} />
        <Band label="Second" setup={() => undefined} />
      </>,
      { container: main },
    );
    for (const observer of FakeIntersectionObserver.instances) observer.report(true);
    await flush();
    expect(FakeResizeObserver.instances).toHaveLength(1);
    const oldWatcher = FakeResizeObserver.instances[0] as FakeResizeObserver;
    unmount();

    // A link to another page and back mounts a new main.
    main.remove();
    main = document.createElement("main");
    main.id = "main";
    document.body.append(main);
    renderBand(() => undefined);
    (FakeIntersectionObserver.instances.at(-1) as FakeIntersectionObserver).report(true);
    await flush();

    expect(oldWatcher.disconnect).toHaveBeenCalledTimes(1);
    expect(FakeResizeObserver.instances).toHaveLength(2);
    expect(FakeResizeObserver.instances[1]?.observed).toEqual([main]);
  });

  it("adds no height watcher where ResizeObserver is missing", async () => {
    vi.stubGlobal("ResizeObserver", undefined);
    const { kit, refresh } = makeKit();
    gsapKit.load.mockResolvedValue(kit);
    const setup = vi.fn<Setup>(() => undefined);
    renderBand(setup);
    (FakeIntersectionObserver.instances[0] as FakeIntersectionObserver).report(true);
    await flush();
    expect(setup).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
