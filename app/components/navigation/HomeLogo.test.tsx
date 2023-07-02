import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import HomeLogo from '~/components/navigation/HomeLogo';

describe('<HomeLogo />', () => {
  test('renders as expected', () => {
    const { baseElement } = render(<HomeLogo />);
    expect(baseElement).toMatchSnapshot();
  });
});
