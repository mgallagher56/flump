import { LEGAL_PAGES } from "@flump/business-details";
import { fireEvent, screen } from "@testing-library/react-native";
import { Linking } from "react-native";
import { DATA_PAGE, WEB_DELETE, WEB_EXPORT } from "../../copy/accountData";
import { fakeApp, renderWithSession } from "../../testing/fakeAppSession";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { DataSettings } from "./DataSettings";

const ORIGIN = "https://site.test.invalid";

describe("DataSettings", () => {
  it("lists the legal pages as LEGAL_PAGES does, in order, opening each in the browser", async () => {
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    await renderWithSession(
      <DataSettings marketingOrigin={ORIGIN} onOpenDelete={() => {}} />,
      fakeApp(),
    );
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.props.accessibilityLabel ?? "")).toEqual(
      LEGAL_PAGES.map((page) => page.title),
    );
    expect(LEGAL_PAGES.map((page) => page.path)).toEqual([
      "/privacy",
      "/terms",
      "/cookies",
      "/accessibility",
    ]);
    for (const page of LEGAL_PAGES) {
      await fireEvent.press(screen.getByRole("link", { name: page.title }));
    }
    expect(open.mock.calls.map((call) => call[0])).toEqual(
      LEGAL_PAGES.map((page) => `${ORIGIN}${page.path}`),
    );
    open.mockRestore();
  });

  it("online: both actions work and no offline line shows", async () => {
    const onOpenDelete = jest.fn();
    await renderWithSession(
      <DataSettings marketingOrigin={ORIGIN} onOpenDelete={onOpenDelete} />,
      fakeApp(),
    );
    expect(screen.queryByText(DATA_PAGE.offline)).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: WEB_DELETE.trigger }));
    expect(onOpenDelete).toHaveBeenCalledTimes(1);
  });

  it("offline: one line says why, the actions are disabled, the legal links still work", async () => {
    await renderWithSession(
      <DataSettings offline marketingOrigin={ORIGIN} onOpenDelete={() => {}} />,
      fakeApp({ status: "restoredOffline" }),
    );
    expect(screen.getByText(DATA_PAGE.offline)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: WEB_EXPORT.button })).toBeDisabled();
    expect(screen.getByRole("button", { name: WEB_DELETE.trigger })).toBeDisabled();
    expect(screen.getByRole("link", { name: LEGAL_PAGES[0]?.title ?? "" })).toBeEnabled();
  });

  it("holds at 200% text", async () => {
    await expectHoldsAtDoubleText(
      <DataSettings marketingOrigin={ORIGIN} onOpenDelete={() => {}} />,
    );
  });
});
