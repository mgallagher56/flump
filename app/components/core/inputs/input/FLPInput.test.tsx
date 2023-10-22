import { fireEvent, render } from '@testing-library/react';
import { vi } from 'vitest';

import FLPInput from './FLPInput';

const onChangeMock = vi.fn();

describe('<FLPInput />', () => {
  test('should render as expected', () => {
    const { container } = render(<FLPInput label="Test" onChange={onChangeMock} />);
    expect(container).toMatchSnapshot();
  });
  test('should render as expected with error', () => {
    const { container } = render(<FLPInput label="Test" error="Error" onChange={onChangeMock} />);
    expect(container).toMatchSnapshot();
  });
  test('should render as expected with value', () => {
    const { container } = render(<FLPInput label="Test" value="Value" onChange={onChangeMock} />);
    expect(container).toMatchSnapshot();
  });
  test('should render as expected with value and error', () => {
    const { container } = render(<FLPInput label="Test" value="Value" error="Error" onChange={onChangeMock} />);
    expect(container).toMatchSnapshot();
  });
  test('should render as expected without a label', () => {
    const { container } = render(<FLPInput label="Test" isLabelHidden onChange={onChangeMock} />);
    expect(container).toMatchSnapshot();
  });

  test('should render elements as a row', () => {
    const { container } = render(<FLPInput label="Test" flexDirection="row" onChange={onChangeMock} />);
    expect(container).toMatchSnapshot();
  });

  test('should change the value when typing', () => {
    const { getByLabelText } = render(<FLPInput label="Test" onChange={onChangeMock} />);
    const input = getByLabelText('Test') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Test' } });
    expect(onChangeMock).toHaveBeenCalled();
    expect(input.value).toBe('Test');
  });
});
