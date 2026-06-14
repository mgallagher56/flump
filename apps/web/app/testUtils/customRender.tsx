import { type RenderOptions, type RenderResult, render as rtlRender } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import type { ReactNode } from "react";

const user = userEvent.setup();

const customRender = (
  ui: ReactNode,
  options?: RenderOptions,
): RenderResult & { user: UserEvent } => {
  return {
    ...rtlRender(ui, options),
    user,
  };
};

export default customRender;
