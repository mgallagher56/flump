import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import Header from '~/components/structure/header/Header';

describe('<Header />', () => {
  test('renders as expected', () => {
    const { baseElement } = render(<Header />);
    expect(baseElement).toMatchSnapshot();
  });
});
