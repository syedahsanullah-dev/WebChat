import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '@/hooks/useDebounce';

describe('useDebounce hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('updates value only after specified delay', () => {
    const { result, rerender } = renderHook(
      ({ val, delay }) => useDebounce(val, delay),
      {
        initialProps: { val: 'first', delay: 300 },
      }
    );

    expect(result.current).toBe('first');

    // Change input
    rerender({ val: 'second', delay: 300 });

    // Not yet updated before delay
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('first');

    // Advance past remaining delay
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('second');
  });

  it('cancels previous timer on rapid sequential keystrokes', () => {
    const { result, rerender } = renderHook(
      ({ val, delay }) => useDebounce(val, delay),
      {
        initialProps: { val: 'a', delay: 300 },
      }
    );

    rerender({ val: 'ab', delay: 300 });
    act(() => {
      vi.advanceTimersByTime(150);
    });

    rerender({ val: 'abc', delay: 300 });
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // 300ms has elapsed since first change, but only 150ms since 'abc'
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current).toBe('abc');
  });
});
