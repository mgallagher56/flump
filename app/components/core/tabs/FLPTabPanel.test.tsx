import type { ReactElement, ReactNode } from 'react';

import { Tabs } from '@chakra-ui/react';
import { render } from '@testing-library/react';

import FLPTabPanel from './FLPTabPanel';

const tabWrapper = (children: ReactNode): ReactElement => <Tabs>{children}</Tabs>;

describe('FLPTabPanel', () => {
  test('renders correctly', () => {
    const { container } = render(
      tabWrapper(
        <>
          <FLPTabPanel>
            <div>Tab content 1</div>
          </FLPTabPanel>
          <FLPTabPanel>
            <div>Tab content 2</div>
          </FLPTabPanel>
          <FLPTabPanel>
            <div>Tab content 3</div>
          </FLPTabPanel>
        </>
      )
    );
    expect(container).toMatchSnapshot();
  });
});
