/**
 * The live connection feeds the one offline state (E12 S7 follow-up): a drop moves a signed-in
 * session to `restoredOffline` at once, and a return tries the quiet reconnect at once rather than
 * waiting for the next timed try.
 */
import type { Connectivity } from "../device/connectivity";
import { watchConnection } from "./watchConnection";

function fakeConnectivity() {
  let listener: ((online: boolean) => void) | null = null;
  const unsubscribe = jest.fn(() => {
    listener = null;
  });
  const connectivity: Connectivity = {
    subscribe: (next) => {
      listener = next;
      return unsubscribe;
    },
  };
  return { connectivity, unsubscribe, emit: (online: boolean) => listener?.(online) };
}

function fakeSession() {
  return { connectionLost: jest.fn(), reconnect: jest.fn(async () => undefined) };
}

describe("watchConnection", () => {
  it("tells the session the connection was lost when the phone goes offline", () => {
    const net = fakeConnectivity();
    const session = fakeSession();
    watchConnection(session, net.connectivity);
    net.emit(false);
    expect(session.connectionLost).toHaveBeenCalledTimes(1);
    expect(session.reconnect).not.toHaveBeenCalled();
  });

  it("tries the quiet reconnect at once when the phone is back online", () => {
    const net = fakeConnectivity();
    const session = fakeSession();
    watchConnection(session, net.connectivity);
    net.emit(true);
    expect(session.reconnect).toHaveBeenCalledTimes(1);
    expect(session.connectionLost).not.toHaveBeenCalled();
  });

  it("tries once more after a reconnect already running, which began before the network came back", async () => {
    const net = fakeConnectivity();
    const session = fakeSession();
    let finishTimed: () => void = () => {};
    // The timed reconnect is running; the online event joins it, then must try afresh.
    session.reconnect.mockImplementationOnce(
      () =>
        new Promise<undefined>((resolve) => {
          finishTimed = () => resolve(undefined);
        }),
    );
    watchConnection(session, net.connectivity);
    net.emit(true);
    expect(session.reconnect).toHaveBeenCalledTimes(1);
    finishTimed();
    await Promise.resolve();
    await Promise.resolve();
    expect(session.reconnect).toHaveBeenCalledTimes(2);
  });

  it("stops listening when stopped", () => {
    const net = fakeConnectivity();
    const session = fakeSession();
    const stop = watchConnection(session, net.connectivity);
    stop();
    expect(net.unsubscribe).toHaveBeenCalledTimes(1);
    net.emit(false);
    expect(session.connectionLost).not.toHaveBeenCalled();
  });
});
