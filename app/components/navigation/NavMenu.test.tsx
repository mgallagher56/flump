import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import NavMenu from '~/components/navigation/NavMenu';

describe('<NavMenu />', () => {
  test('renders as expected', () => {
    const { baseElement } = render(<NavMenu />);
    expect(baseElement).toMatchSnapshot();
  });
});
