import React from 'react';

import { Tabs } from '@chakra-ui/react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import FLPTab from './FLPTab';

const tabWrapper = (children: React.ReactNode): React.ReactElement => <Tabs>{children}</Tabs>;

describe('FLPTab', () => {
  test('renders correctly', () => {
    const { container } = render(
      tabWrapper(
        <>
          <FLPTab aria-selected>Tab 1</FLPTab>
          <FLPTab>Tab 2</FLPTab>
          <FLPTab>Tab 3</FLPTab>
        </>
      )
    );
    expect(container).toMatchSnapshot();
  });
});
