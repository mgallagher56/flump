import { fireEvent, screen } from "@testing-library/react-native";
import { EXPORT, WEB_DELETE, WEB_EXPORT } from "../../copy/accountData";
import type { ExportOutcome } from "../../data/exportData";
import { fakeApp, renderWithSession } from "../../testing/fakeAppSession";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { AccountDataActions } from "./AccountDataActions";

async function show(app = fakeApp(), offline = false) {
  const onOpenDelete = jest.fn();
  await renderWithSession(
    <AccountDataActions offline={offline} onOpenDelete={onOpenDelete} />,
    app,
  );
  return { app, onOpenDelete };
}

describe("AccountDataActions", () => {
  it("downloads through the data door, once per press, and says the copy is gone", async () => {
    const { app } = await show();
    await fireEvent.press(screen.getByRole("button", { name: WEB_EXPORT.button }));
    expect(app.accountData.exportData).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert")).toHaveTextContent(EXPORT.shared);
  });

  it.each<[ExportOutcome, string]>([
    ["rateLimited", WEB_EXPORT.rateLimited],
    ["failed", WEB_EXPORT.failed],
  ])("%s says so", async (outcome, text) => {
    const app = fakeApp();
    app.accountData.exportData.mockResolvedValueOnce(outcome);
    await show(app);
    await fireEvent.press(screen.getByRole("button", { name: WEB_EXPORT.button }));
    expect(screen.getByRole("alert")).toHaveTextContent(text);
  });

  it("an erased account moves to the last step of the deletion", async () => {
    const app = fakeApp();
    app.accountData.exportData.mockResolvedValueOnce("accountDeleted");
    await show(app);
    await fireEvent.press(screen.getByRole("button", { name: WEB_EXPORT.button }));
    expect(app.session.deletionPending).toHaveBeenCalledTimes(1);
  });

  it("a session ended mid-download shows nothing here: its own screen takes over", async () => {
    const app = fakeApp();
    app.accountData.exportData.mockResolvedValueOnce("ended");
    await show(app);
    await fireEvent.press(screen.getByRole("button", { name: WEB_EXPORT.button }));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("Delete account opens the delete page, in web's quiet danger style", async () => {
    const { onOpenDelete } = await show();
    expect(screen.getByText(WEB_DELETE.description)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: WEB_DELETE.trigger }));
    expect(onOpenDelete).toHaveBeenCalledTimes(1);
  });

  it("offline: both actions are disabled and send nothing", async () => {
    const { app, onOpenDelete } = await show(fakeApp({ status: "restoredOffline" }), true);
    const download = screen.getByRole("button", { name: WEB_EXPORT.button });
    const remove = screen.getByRole("button", { name: WEB_DELETE.trigger });
    expect(download).toBeDisabled();
    expect(remove).toBeDisabled();
    await fireEvent.press(download);
    await fireEvent.press(remove);
    expect(app.accountData.exportData).not.toHaveBeenCalled();
    expect(onOpenDelete).not.toHaveBeenCalled();
  });

  it("with no data door (a misconfigured build) the actions are disabled", async () => {
    await show(fakeApp(undefined, { accountData: false }));
    expect(screen.getByRole("button", { name: WEB_EXPORT.button })).toBeDisabled();
  });

  it("holds at 200% text", async () => {
    await expectHoldsAtDoubleText(<AccountDataActions onOpenDelete={() => {}} />);
  });
});
