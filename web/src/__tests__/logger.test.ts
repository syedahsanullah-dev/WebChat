import { describe, it, expect } from 'vitest';
import { logger } from '@/lib/logger';

describe('Phase 14: Zero-Cost Winston File & Console Logger', () => {
  it('exports an active winston logger instance with standard logging methods', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('can log messages without throwing exceptions', () => {
    expect(() => {
      logger.info('Test info message', { module: 'logger.test.ts' });
      logger.warn('Test warning message');
      logger.error('Test error message', new Error('Synthetic test error'));
    }).not.toThrow();
  });
});
