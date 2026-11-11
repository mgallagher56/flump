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
});
