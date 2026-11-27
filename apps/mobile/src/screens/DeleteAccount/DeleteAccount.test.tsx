import { fireEvent, screen } from "@testing-library/react-native";
import type { ReauthResult } from "../../auth/session";
import {
  DELETE,
  REAUTH,
  reauthConfirmed,
  typePhraseLabel,
  WEB_DELETE,
} from "../../copy/accountData";
import type { DeleteOutcome } from "../../data/deleteAccount";
import { fakeApp, renderWithSession } from "../../testing/fakeAppSession";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { DeleteAccount } from "./DeleteAccount";

const field = () => screen.getByLabelText(typePhraseLabel("DELETE"));
const confirmButton = () => screen.getByRole("button", { name: WEB_DELETE.confirm });

async function typedAndPressed(app: ReturnType<typeof fakeApp>) {
  await renderWithSession(<DeleteAccount />, app);
  await fireEvent.changeText(field(), "DELETE");
  await fireEvent.press(confirmButton());
}

describe("DeleteAccount", () => {
  it("lists what goes, as web does, and sends nothing until the phrase is typed", async () => {
    const app = fakeApp();
    await renderWithSession(<DeleteAccount />, app);
    expect(screen.getByRole("header")).toHaveTextContent(WEB_DELETE.confirmTitle);
    for (const line of [
      WEB_DELETE.listIntro,
      ...WEB_DELETE.list,
      WEB_DELETE.retention,
      WEB_DELETE.final,
    ]) {
      expect(screen.getByText(line)).toBeOnTheScreen();
    }
    expect(confirmButton()).toBeDisabled();
    await fireEvent.press(confirmButton());
    expect(app.accountData.deleteAccount).not.toHaveBeenCalled();
  });

  it("deleted: the session wipes the device and shows the confirmation", async () => {
    const app = fakeApp();
    await typedAndPressed(app);
    expect(app.accountData.deleteAccount).toHaveBeenCalledTimes(1);
    expect(app.session.accountDeleted).toHaveBeenCalledTimes(1);
    expect(app.session.getState()).toEqual({ status: "accountDeleted" });
  });

  it.each<DeleteOutcome>(["identityPending", "accountDeleted"])(
    "%s moves to the last step, wiping nothing",
    async (outcome) => {
      const app = fakeApp();
      app.accountData.deleteAccount.mockResolvedValueOnce(outcome);
      await typedAndPressed(app);
      expect(app.session.deletionPending).toHaveBeenCalledTimes(1);
      expect(app.session.accountDeleted).not.toHaveBeenCalled();
    },
  );

  it.each<[DeleteOutcome, string]>([
    ["unavailable", DELETE.unavailable],
    ["rateLimited", WEB_DELETE.rateLimited],
    ["noAnswer", DELETE.noAnswer],
    ["failed", WEB_DELETE.failed],
  ])("%s keeps the person signed in and says so", async (outcome, text) => {
    const app = fakeApp();
    app.accountData.deleteAccount.mockResolvedValueOnce(outcome);
    await typedAndPressed(app);
    expect(screen.getByRole("alert")).toHaveTextContent(text);
    expect(app.session.accountDeleted).not.toHaveBeenCalled();
    expect(app.session.deletionPending).not.toHaveBeenCalled();
    expect(app.session.getState()).toEqual({ status: "signedIn" });
    expect(screen.queryByRole("button", { name: WEB_DELETE.signInAgain })).toBeNull();
  });

  it("a recent sign-in needed: web's sentence and Sign in again, which deletes nothing", async () => {
    const app = fakeApp();
    app.accountData.deleteAccount.mockResolvedValueOnce("recentLoginRequired");
    await typedAndPressed(app);
    expect(screen.getByRole("alert")).toHaveTextContent(WEB_DELETE.recentLogin);

    await fireEvent.press(screen.getByRole("button", { name: WEB_DELETE.signInAgain }));
    expect(app.session.reauthenticate).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert")).toHaveTextContent(reauthConfirmed(WEB_DELETE.confirm));
    // Nothing is deleted without another press.
    expect(app.accountData.deleteAccount).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: WEB_DELETE.signInAgain })).toBeNull();

    await fireEvent.press(confirmButton());
    expect(app.accountData.deleteAccount).toHaveBeenCalledTimes(2);
  });

  it.each<[ReauthResult, string]>([
    ["differentAccount", REAUTH.differentAccount],
    ["failed", REAUTH.failed],
    ["unavailable", REAUTH.unavailable],
  ])("a %s sign-in says so and keeps Sign in again", async (result, text) => {
    const app = fakeApp();
    app.accountData.deleteAccount.mockResolvedValueOnce("recentLoginRequired");
    app.session.reauthenticate.mockResolvedValueOnce(result);
    await typedAndPressed(app);
    await fireEvent.press(screen.getByRole("button", { name: WEB_DELETE.signInAgain }));
    expect(screen.getByRole("alert")).toHaveTextContent(text);
    expect(screen.getByRole("button", { name: WEB_DELETE.signInAgain })).toBeOnTheScreen();
    expect(app.accountData.deleteAccount).toHaveBeenCalledTimes(1);
  });

  it("a cancelled browser changes nothing on screen", async () => {
    const app = fakeApp();
    app.accountData.deleteAccount.mockResolvedValueOnce("recentLoginRequired");
    app.session.reauthenticate.mockResolvedValueOnce("cancelled");
    await typedAndPressed(app);
    await fireEvent.press(screen.getByRole("button", { name: WEB_DELETE.signInAgain }));
    expect(screen.getByRole("alert")).toHaveTextContent(WEB_DELETE.recentLogin);
    expect(screen.getByRole("button", { name: WEB_DELETE.signInAgain })).toBeOnTheScreen();
  });

  it("offline: says why and sends nothing", async () => {
    const app = fakeApp({ status: "restoredOffline" });
    await renderWithSession(<DeleteAccount offline />, app);
    await fireEvent.changeText(field(), "DELETE");
    expect(confirmButton()).toBeDisabled();
    await fireEvent.press(confirmButton());
    expect(app.accountData.deleteAccount).not.toHaveBeenCalled();
  });

  it("offers Cancel only where it is shown in place (Not invited, Terms)", async () => {
    const onCancel = jest.fn();
    await renderWithSession(<DeleteAccount onCancel={onCancel} />, fakeApp());
    await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("holds at 200% text", async () => {
    await expectHoldsAtDoubleText(<DeleteAccount />);
  });
});
