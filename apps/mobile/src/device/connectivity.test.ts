/**
 * The phone's own connection signal (expo-network), read as online, offline or not known yet. Only
 * a clear "no" counts as offline: an unknown reachability (null or absent, as while Android is
 * still checking a new network) never drops anyone to the offline state.
 */
import { createConnectivity, onlineFrom } from "./connectivity";

describe("onlineFrom", () => {
  it.each([
    [{ isConnected: false, isInternetReachable: false }, false],
    [{ isConnected: false }, false],
    [{ isConnected: true, isInternetReachable: false }, false],
    [{ isConnected: true, isInternetReachable: true }, true],
    [{ isConnected: true }, true],
    [{ isConnected: true, isInternetReachable: undefined }, true],
    [{}, null],
    [{ isInternetReachable: true }, null],
  ])("reads %j as %p", (state, expected) => {
    expect(onlineFrom(state)).toBe(expected);
  });
});

describe("createConnectivity", () => {
  function fakeNetwork(first: { isConnected?: boolean; isInternetReachable?: boolean }) {
    let push: (state: { isConnected?: boolean; isInternetReachable?: boolean }) => void = () => {};
    const remove = jest.fn();
    return {
      remove,
      push: (s: { isConnected?: boolean; isInternetReachable?: boolean }) => push(s),
      network: {
        getNetworkStateAsync: jest.fn(async () => first),
        addNetworkStateListener: jest.fn((listener: typeof push) => {
          push = listener;
          return { remove };
        }),
      },
    };
  }

  it("tells the listener the state on subscribe, then each change, once per change", async () => {
    const fake = fakeNetwork({ isConnected: true, isInternetReachable: true });
    const listener = jest.fn();
    createConnectivity(fake.network).subscribe(listener);
    await Promise.resolve();
    await Promise.resolve();
    expect(listener.mock.calls).toEqual([[true]]);
    fake.push({ isConnected: false });
    fake.push({ isConnected: false, isInternetReachable: false });
    fake.push({ isConnected: true });
    expect(listener.mock.calls).toEqual([[true], [false], [true]]);
  });

  it("says nothing while the state is not known", async () => {
    const fake = fakeNetwork({});
    const listener = jest.fn();
    createConnectivity(fake.network).subscribe(listener);
    await Promise.resolve();
    await Promise.resolve();
    fake.push({});
    expect(listener).not.toHaveBeenCalled();
  });

  it("stops listening, and drops a late first answer, once unsubscribed", async () => {
    const fake = fakeNetwork({ isConnected: false });
    const listener = jest.fn();
    const stop = createConnectivity(fake.network).subscribe(listener);
    stop();
    await Promise.resolve();
    await Promise.resolve();
    expect(fake.remove).toHaveBeenCalledTimes(1);
    expect(listener).not.toHaveBeenCalled();
  });

  it("carries on with the listener when the first read fails", async () => {
    const fake = fakeNetwork({});
    fake.network.getNetworkStateAsync.mockRejectedValueOnce(new Error("no module"));
    const listener = jest.fn();
    createConnectivity(fake.network).subscribe(listener);
    await Promise.resolve();
    await Promise.resolve();
    fake.push({ isConnected: false });
    expect(listener.mock.calls).toEqual([[false]]);
  });
});
