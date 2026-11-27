import { fireEvent, render, screen } from "@testing-library/react-native";
import { Linking } from "react-native";
import { ACCOUNT_DELETED_CLOSE, WEB_ACCOUNT_DELETED } from "../../copy/accountData";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { AccountDeleted } from "./AccountDeleted";

describe("AccountDeleted", () => {
  it("says the account is gone in web's words, links home and closes to sign-in", async () => {
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    const onClose = jest.fn();
    await render(
      <ThemeProvider scheme="light">
        <AccountDeleted marketingOrigin="https://site.test.invalid" onClose={onClose} />
      </ThemeProvider>,
    );
    expect(screen.getByRole("header")).toHaveTextContent(WEB_ACCOUNT_DELETED.heading);
    expect(screen.getByText(WEB_ACCOUNT_DELETED.body)).toBeOnTheScreen();
    expect(screen.getByText(WEB_ACCOUNT_DELETED.thanks)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: WEB_ACCOUNT_DELETED.homeLink }));
    expect(open).toHaveBeenCalledWith("https://site.test.invalid");
    await fireEvent.press(screen.getByRole("button", { name: ACCOUNT_DELETED_CLOSE }));
    expect(onClose).toHaveBeenCalledTimes(1);
    open.mockRestore();
  });

  it("holds at 200% text", async () => {
    await expectHoldsAtDoubleText(
      <AccountDeleted marketingOrigin="https://site.test.invalid" onClose={() => {}} />,
    );
  });
});
