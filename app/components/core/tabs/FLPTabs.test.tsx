import React from 'react';

import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import FLPTabs from './FLPTabs';

describe('FLPTabs', () => {
  test('renders correctly', () => {
    const { container } = render(
      <FLPTabs>
        <div>Tab 1</div>
        <div>Tab 2</div>
        <div>Tab 3</div>
      </FLPTabs>
    );
    expect(container).toMatchSnapshot();
  });
});
