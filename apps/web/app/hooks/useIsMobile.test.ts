import { renderHook } from '@testing-library/react';

import useIsMobile from './useIsMobile';

describe('useIsMobile', () => {
  test('returns false when the screen is more than 768px wide', () => {
    const { result } = renderHook(() => useIsMobile(false));
    expect(result.current).toBe(false);
  });
});
