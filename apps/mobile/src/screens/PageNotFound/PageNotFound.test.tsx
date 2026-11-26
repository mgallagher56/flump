import { render, screen, userEvent } from "@testing-library/react-native";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { PageNotFound } from "./PageNotFound";

describe("PageNotFound", () => {
  it.each([
    ["more", "The link may be old. Go to More to find what you need.", "Go to More"],
    ["home", "The link may be old or mistyped.", "Go to Home"],
  ] as const)(
    "way %s: says the page was not found and offers one way back",
    async (way, body, label) => {
      jest.useRealTimers();
      const onGo = jest.fn();
      await render(
        <ThemeProvider scheme="light">
          <PageNotFound way={way} onGo={onGo} />
        </ThemeProvider>,
      );
      expect(screen.getByRole("header", { name: "We could not find that page" })).toBeOnTheScreen();
      expect(screen.getByText(body)).toBeOnTheScreen();
      expect(screen.getAllByRole("button")).toHaveLength(1);
      await userEvent.setup().press(screen.getByRole("button", { name: label }));
      expect(onGo).toHaveBeenCalledTimes(1);
    },
  );
});
