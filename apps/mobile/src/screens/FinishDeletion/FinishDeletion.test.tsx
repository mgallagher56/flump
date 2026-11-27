import { fireEvent, screen } from "@testing-library/react-native";
import { typePhraseLabel, WEB_DELETE, WEB_FINISH_DELETION } from "../../copy/accountData";
import { SIGN_OUT } from "../../copy/auth";
import { fakeApp, renderWithSession } from "../../testing/fakeAppSession";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { FinishDeletion } from "./FinishDeletion";

async function show(app = fakeApp({ status: "deletionPending" })) {
  const onSignOut = jest.fn();
  await renderWithSession(<FinishDeletion onSignOut={onSignOut} />, app);
  return { app, onSignOut };
}

async function typeAndPress(label: string) {
  await fireEvent.changeText(screen.getByLabelText(typePhraseLabel("DELETE")), "DELETE");
  await fireEvent.press(screen.getByRole("button", { name: label }));
}

describe("FinishDeletion", () => {
  it("says the data is gone and one step remains, in web's words", async () => {
    await show();
    expect(screen.getByRole("header")).toHaveTextContent(WEB_FINISH_DELETION.heading);
    expect(screen.getByText(WEB_FINISH_DELETION.deleted)).toBeOnTheScreen();
    expect(screen.getByText(WEB_FINISH_DELETION.lastStep)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: WEB_FINISH_DELETION.confirm })).toBeDisabled();
  });

  it("repeats the same request; deleted wipes the device", async () => {
    const { app } = await show();
    await typeAndPress(WEB_FINISH_DELETION.confirm);
    expect(app.accountData.deleteAccount).toHaveBeenCalledTimes(1);
    expect(app.session.accountDeleted).toHaveBeenCalledTimes(1);
  });

  it("still pending: says so, the button becomes Try again, and pressing repeats", async () => {
    const app = fakeApp({ status: "deletionPending" });
    app.accountData.deleteAccount.mockResolvedValueOnce("identityPending");
    await show(app);
    await typeAndPress(WEB_FINISH_DELETION.confirm);
    expect(screen.getByRole("alert")).toHaveTextContent(WEB_FINISH_DELETION.identityPending);
    expect(app.session.deletionPending).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole("button", { name: WEB_FINISH_DELETION.retry }));
    expect(app.accountData.deleteAccount).toHaveBeenCalledTimes(2);
    expect(app.session.accountDeleted).toHaveBeenCalledTimes(1);
  });

  it("a 410 on the repeat also stays here", async () => {
    const app = fakeApp({ status: "deletionPending" });
    app.accountData.deleteAccount.mockResolvedValueOnce("accountDeleted");
    await show(app);
    await typeAndPress(WEB_FINISH_DELETION.confirm);
    expect(screen.getByRole("alert")).toHaveTextContent(WEB_FINISH_DELETION.identityPending);
  });

  it("its own failure and rate limit words", async () => {
    const app = fakeApp({ status: "deletionPending" });
    app.accountData.deleteAccount.mockResolvedValueOnce("failed");
    await show(app);
    await typeAndPress(WEB_FINISH_DELETION.confirm);
    expect(screen.getByRole("alert")).toHaveTextContent(WEB_FINISH_DELETION.failed);
    app.accountData.deleteAccount.mockResolvedValueOnce("rateLimited");
    await fireEvent.press(screen.getByRole("button", { name: WEB_FINISH_DELETION.confirm }));
    expect(screen.getByRole("alert")).toHaveTextContent(WEB_FINISH_DELETION.rateLimited);
  });

  it("a recent sign-in needed offers Sign in again", async () => {
    const app = fakeApp({ status: "deletionPending" });
    app.accountData.deleteAccount.mockResolvedValueOnce("recentLoginRequired");
    await show(app);
    await typeAndPress(WEB_FINISH_DELETION.confirm);
    await fireEvent.press(screen.getByRole("button", { name: WEB_DELETE.signInAgain }));
    expect(app.session.reauthenticate).toHaveBeenCalledTimes(1);
  });

  it("offers Sign out", async () => {
    const { onSignOut } = await show();
    await fireEvent.press(screen.getByRole("button", { name: SIGN_OUT }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it("holds at 200% text", async () => {
    await expectHoldsAtDoubleText(<FinishDeletion onSignOut={() => {}} />);
  });
});
