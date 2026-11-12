import FLPText from "~/components/core/typography/FLPText";
import customRender from "~/testUtils/customRender";

import FLPSpinner from "./FLPSpinner";

describe("FLPSpinner", () => {
  test("renders as expected", () => {
    const { container } = customRender(<FLPSpinner />);
    expect(container).toMatchSnapshot();
  });
  test("renders as expected with a size", () => {
    const { container } = customRender(<FLPSpinner size="xl" />);
    expect(container).toMatchSnapshot();
  });
  test("renders as expected with a label", () => {
    const { container } = customRender(
      <FLPSpinner>
        <FLPText>Processing...</FLPText>
      </FLPSpinner>,
    );
    expect(container).toMatchSnapshot();
  });
  test("is announced as a loading status and opts in to the reduced-motion pulse", () => {
    const { getByRole } = customRender(<FLPSpinner />);
    const spinner = getByRole("status", { name: "Loading" });
    expect(spinner.hasAttribute("data-spinner")).toBe(true);
  });
  test("a custom label names the status", () => {
    const { getByRole } = customRender(<FLPSpinner label="Saving" />);
    expect(getByRole("status", { name: "Saving" })).toBeDefined();
  });
  test("is hidden from assistive tech when a visible label is present", () => {
    const { queryByRole, container } = customRender(
      <FLPSpinner>
        <FLPText>Processing...</FLPText>
      </FLPSpinner>,
    );
    expect(queryByRole("status")).toBeNull();
    expect(container.querySelector("[data-spinner]")?.getAttribute("aria-hidden")).toBe("true");
  });
  test("decorative hides it, and decorative={false} keeps it with a label present", () => {
    const hidden = customRender(<FLPSpinner decorative />);
    expect(hidden.queryByRole("status")).toBeNull();
    hidden.unmount();
    const shown = customRender(
      <FLPSpinner decorative={false}>
        <FLPText>Processing...</FLPText>
      </FLPSpinner>,
    );
    expect(shown.getByRole("status", { name: "Loading" })).toBeDefined();
  });
});
