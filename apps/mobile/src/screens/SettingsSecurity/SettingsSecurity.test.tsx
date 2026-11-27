import { act, render, screen, userEvent } from "@testing-library/react-native";
import { Linking } from "react-native";
import { fakeApi, withApi } from "../../data/fakeApi";
import { SettingsSecurity } from "./SettingsSecurity";

const LINK = { url: "https://app.test.invalid/app/profile?tab=security", exact: true };

describe("SettingsSecurity", () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    (Linking.openURL as jest.Mock).mockClear();
  });
  afterEach(() => jest.restoreAllMocks());

  it("shows the account email, read only, and Change password opens the website", async () => {
    const api = fakeApi({ "GET /user-profile": () => ({ email: "sam.taylor@example.com" }) });
    const { ui } = withApi(<SettingsSecurity offline={false} changePassword={LINK} />, api.client);
    await render(ui);
    expect(await screen.findByTestId("settings-email")).toHaveTextContent("sam.taylor@example.com");
    // Nothing to type into: the app never takes a password.
    expect(JSON.stringify(screen.toJSON())).not.toContain("TextInput");
    await userEvent.setup().press(screen.getByRole("link", { name: "Change password" }));
    expect(Linking.openURL).toHaveBeenCalledWith(LINK.url);
    expect(api.calls.filter((c) => c.method !== "GET")).toEqual([]);
  });

  it("without the web app's address, the button says where it really goes", async () => {
    const api = fakeApi({ "GET /user-profile": () => ({}) });
    const { ui } = withApi(
      <SettingsSecurity
        offline={false}
        changePassword={{ url: "https://m.test.invalid", exact: false }}
      />,
      api.client,
    );
    await render(ui);
    expect(await screen.findByTestId("settings-email")).toHaveTextContent(
      // An account always has an email; the sign-in token may carry no email claim.
      "Your email cannot be shown here right now.",
    );
    expect(screen.getByRole("link", { name: "Open the Flump website" })).toBeOnTheScreen();
    // The line says where a password is changed whatever the link can say.
    expect(
      screen.getByText("You change your password on the Flump website, which emails you a link."),
    ).toBeOnTheScreen();
  });

  it("restored offline: no request, the button disabled with one line saying why", async () => {
    const api = fakeApi({ "GET /user-profile": () => ({ email: "sam.taylor@example.com" }) });
    const { ui } = withApi(<SettingsSecurity offline changePassword={LINK} />, api.client);
    await render(ui);
    await act(async () => {});
    expect(screen.getByText("Changing your password needs a connection.")).toBeOnTheScreen();
    const button = screen.getByRole("link", { name: "Change password" });
    expect(button.props.accessibilityState.disabled).toBe(true);
    await userEvent.setup().press(button);
    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(api.request).not.toHaveBeenCalled();
  });
});
