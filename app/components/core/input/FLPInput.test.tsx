import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import FLPInput from './FLPInput';

describe('<FLPInput />', () => {
  it('should render as expected', () => {
    const { container } = render(<FLPInput label="Test" />);
    expect(container).toMatchSnapshot();
  });
  it('should render as expected with error', () => {
    const { container } = render(<FLPInput label="Test" error="Error" />);
    expect(container).toMatchSnapshot();
  });
  it('should render as expected with value', () => {
    const { container } = render(<FLPInput label="Test" value="Value" />);
    expect(container).toMatchSnapshot();
  });
  it('should render as expected with value and error', () => {
    const { container } = render(<FLPInput label="Test" value="Value" error="Error" />);
    expect(container).toMatchSnapshot();
  });
  it('should render as expected without a label', () => {
    const { container } = render(<FLPInput label="Test" isLabelHidden />);
    expect(container).toMatchSnapshot();
  });

  it('should render elements as a row', () => {
    const { container } = render(<FLPInput label="Test" flexDirection="row" />);
    expect(container).toMatchSnapshot();
  });

  it('should change the value when typing', () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(<FLPInput onChange={onChange} label="Test" />);
    const input = getByLabelText('Test') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Test' } });
    expect(onChange).toHaveBeenCalled();
    expect(input.value).toBe('Test');
  });
});