import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import UserLogin from '~/components/navigation/UserLogin';

describe('<UserLogin />', () => {
  test('renders as expected', () => {
    const { baseElement } = render(<UserLogin />);
    expect(baseElement).toMatchSnapshot();
  });
});
