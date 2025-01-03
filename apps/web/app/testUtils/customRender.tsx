// create a custom render function with ChakraProvider
import { type ReactNode } from 'react';

import { type RenderOptions, type RenderResult, render as rtlRender } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { Provider } from '~/components/ui/provider';

const user = userEvent.setup();

const customRender = (ui: ReactNode, options?: RenderOptions): RenderResult & { user: UserEvent } => {
  const wrappedUi = <Provider>{ui}</Provider>;

  return {
    ...rtlRender(wrappedUi, options),
    user
  };
};

export default customRender;
