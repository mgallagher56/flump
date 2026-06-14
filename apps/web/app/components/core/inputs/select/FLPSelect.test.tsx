import { vi } from "vitest";
import customRender from "~/testUtils/customRender";

import FLPSelect from "./FLPSelect";

const mockSelectioOptions = {
  items: ["1", "2", "3"].map((item) => ({ id: item, name: item })),
};

describe("<FLPSelect />", () => {
  test("should render as expected", () => {
    const { baseElement } = customRender(
      <FLPSelect
        collection={mockSelectioOptions}
        label="label"
        value={["1"]}
        onValueChange={vi.fn()}
      />,
    );
    expect(baseElement).toMatchSnapshot();
  });
  test("should render as expected as row", () => {
    const { baseElement } = customRender(
      <FLPSelect
        collection={mockSelectioOptions}
        flexDirection="row"
        label="label"
        value={["1"]}
        onValueChange={vi.fn()}
      />,
    );
    expect(baseElement).toMatchSnapshot();
  });
});
