import React from 'react';

import type { LinkProps } from '@remix-run/react';
import { render } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import FLPLinkButton from './FLPLinkButton';

vi.mock('@remix-run/react', () => ({
  Link: (props: LinkProps): React.ReactNode => <div>{props.children}</div>
}));

describe('FLPLinkButton', () => {
  test('renders as expected', () => {
    const { container, getByText } = render(<FLPLinkButton to="/test">Button</FLPLinkButton>);
    expect(container).toMatchSnapshot();
    expect(getByText('Button')).toBeDefined();
  });
  test('renders as expected with a custom class', () => {
    const { container, getByText } = render(
      <FLPLinkButton className="test-class" to="/test">
        Button
      </FLPLinkButton>
    );
    expect(container).toMatchSnapshot();
    expect(getByText('Button')).toBeDefined();
  });

  test('renders as expected with a variant', () => {
    const { container, getByText } = render(
      <FLPLinkButton variant="solid" to="/test">
        Button
      </FLPLinkButton>
    );
    expect(container).toMatchSnapshot();
    expect(getByText('Button')).toBeDefined();
  });
});
