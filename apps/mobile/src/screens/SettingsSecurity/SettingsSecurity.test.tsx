import { act, render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { Linking } from "react-native";
import { fail, fakeApi, withApi } from "../../data/fakeApi";
import { SettingsSecurity } from "./SettingsSecurity";

const LINK = { url: "https://app.test.invalid/app/profile?tab=security", exact: true };

describe("SettingsSecurity", () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    (Linking.openURL as jest.Mock).mockClear();
  });
  afterEach(() => jest.restoreAllMocks());

  it("shows the account email from GET /user-profile/email when profile.email is null, and Change password opens the website", async () => {
    const sampleEmail = ["sam.taylor", "example.com"].join("@");
    const api = fakeApi({
      "GET /user-profile": () => ({ email: null }),
      "GET /user-profile/email": () => ({ email: sampleEmail }),
    });
    const { ui } = withApi(<SettingsSecurity offline={false} changePassword={LINK} />, api.client);
    await render(ui);
    await waitFor(() =>
      expect(screen.getByTestId("settings-email")).toHaveTextContent(sampleEmail),
    );
    // Nothing to type into: the app never takes a password.
    expect(JSON.stringify(screen.toJSON())).not.toContain("TextInput");
    await userEvent.setup().press(screen.getByRole("link", { name: "Change password" }));
    expect(Linking.openURL).toHaveBeenCalledWith(LINK.url);
    expect(api.calls.filter((c) => c.method !== "GET")).toEqual([]);
  });

  it("shows a quiet loading state while the email loads without flashing the fallback", async () => {
    const sampleEmail = ["sam.taylor", "example.com"].join("@");
    let resolveEmail!: (value: { email: string }) => void;
    const api = fakeApi({
      "GET /user-profile": () => ({ email: null }),
      "GET /user-profile/email": () =>
        new Promise<{ email: string }>((resolve) => {
          resolveEmail = resolve;
        }),
    });
    const { ui } = withApi(<SettingsSecurity offline={false} changePassword={LINK} />, api.client);
    await render(ui);
    await act(async () => {});
    expect(screen.getByTestId("settings-email")).toHaveTextContent("Loading your email…");
    expect(screen.queryByText("Your email cannot be shown here right now.")).toBeNull();

    await act(async () => {
      resolveEmail({ email: sampleEmail });
    });
    await waitFor(() =>
      expect(screen.getByTestId("settings-email")).toHaveTextContent(sampleEmail),
    );
  });

  it("falls back to profile.email when /user-profile/email answers 404 (older backend)", async () => {
    const sampleEmail = ["older.backend", "example.com"].join("@");
    const api = fakeApi({
      "GET /user-profile": () => ({ email: sampleEmail }),
      "GET /user-profile/email": () => fail("not-found", 404),
    });
    const { ui } = withApi(<SettingsSecurity offline={false} changePassword={LINK} />, api.client);
    await render(ui);
    await waitFor(() =>
      expect(screen.getByTestId("settings-email")).toHaveTextContent(sampleEmail),
    );
  });

  it("shows the fallback sentence when both /user-profile/email (null or 404) and profile have no email", async () => {
    const api = fakeApi({
      "GET /user-profile": () => ({ email: null }),
      "GET /user-profile/email": () => ({ email: null }),
    });
    const { ui } = withApi(<SettingsSecurity offline={false} changePassword={LINK} />, api.client);
    await render(ui);
    await waitFor(() =>
      expect(screen.getByTestId("settings-email")).toHaveTextContent(
        "Your email cannot be shown here right now.",
      ),
    );
  });

  it("without the web app's address, the button says where it really goes", async () => {
    const api = fakeApi({
      "GET /user-profile": () => ({}),
      "GET /user-profile/email": () => fail("not-found", 404),
    });
    const { ui } = withApi(
      <SettingsSecurity
        offline={false}
        changePassword={{ url: "https://m.test.invalid", exact: false }}
      />,
      api.client,
    );
    await render(ui);
    await waitFor(() =>
      expect(screen.getByTestId("settings-email")).toHaveTextContent(
        "Your email cannot be shown here right now.",
      ),
    );
    expect(screen.getByRole("link", { name: /^Open the Flump website\. ./ })).toBeOnTheScreen();
    // The line says where a password is changed whatever the link can say.
    expect(
      screen.getByText("You change your password on the Flump website, which emails you a link."),
    ).toBeOnTheScreen();
  });

  it("restored offline: no request, the button disabled with one line saying why", async () => {
    const api = fakeApi({
      "GET /user-profile": () => ({ email: "sam.taylor@example.com" }),
      "GET /user-profile/email": () => ({ email: "sam.taylor@example.com" }),
    });
    const { ui } = withApi(<SettingsSecurity offline changePassword={LINK} />, api.client);
    await render(ui);
    await act(async () => {});
    expect(screen.getByText("Changing your password needs a connection.")).toBeOnTheScreen();
    expect(screen.queryByTestId("settings-email")).toBeNull();
    const button = screen.getByRole("link", { name: "Change password" });
    expect(button.props.accessibilityState.disabled).toBe(true);
    await userEvent.setup().press(button);
    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(api.request).not.toHaveBeenCalled();
  });
});
