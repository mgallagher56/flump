import { render, screen, userEvent } from "@testing-library/react-native";
import { fail, fakeApi, withApi } from "../../data/fakeApi";
import { household, MONTH, NOW, routes } from "../../features/check-in/checkInTestData";
import { Home } from "./Home";

jest.mock("expo-router", () => {
  const { Fragment } = require("react");
  return { Link: ({ children }: { children: unknown }) => <Fragment>{children}</Fragment> };
});

async function home(api: ReturnType<typeof fakeApi>) {
  const onSignOut = jest.fn();
  const onOpenCheckIn = jest.fn();
  const { ui } = withApi(
    <Home onSignOut={onSignOut} onOpenCheckIn={onOpenCheckIn} now={NOW} />,
    api.client,
  );
  await render(ui);
  return { onSignOut, onOpenCheckIn };
}

describe("Home", () => {
  it("says the person is signed in and offers Sign out", async () => {
    const { onSignOut } = await home(fakeApi(routes(household())));
    expect(screen.getByRole("header", { name: "You are signed in" })).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole("button", { name: "Sign out" }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it("shows the check-in row when the month is due, and opens the check-in", async () => {
    const { onOpenCheckIn } = await home(fakeApi(routes(household())));
    expect(await screen.findByText("Last check-in: October 2026")).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole("button", { name: "Start monthly check-in" }));
    expect(onOpenCheckIn).toHaveBeenCalledTimes(1);
  });

  it("no row once this month is checked in", async () => {
    const h = household(undefined, { latestCompletedMonth: MONTH, latestStartedMonth: MONTH });
    await home(fakeApi(routes(h)));
    await screen.findByRole("header", { name: "You are signed in" });
    // Let the reads answer.
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByTestId("check-in-row")).toBeNull();
  });

  it("when the reads fail, the row still offers the check-in", async () => {
    const api = fakeApi({
      ...routes(household()),
      "GET /snapshots/check-ins": () => fail("forbidden", 403),
    });
    await home(api);
    expect(await screen.findByText("Record your November balances")).toBeOnTheScreen();
  });
});
