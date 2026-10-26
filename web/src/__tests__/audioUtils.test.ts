import { describe, it, expect, vi } from 'vitest';
import { formatDuration, generateMockPeaks, extractWaveformPeaks } from '@/lib/audioUtils';

describe('Phase 13: Audio Utilities Unit Tests', () => {
  describe('formatDuration', () => {
    it('formats 0 seconds as 0:00', () => {
      expect(formatDuration(0)).toBe('0:00');
    });

    it('formats seconds under 10 with leading zero', () => {
      expect(formatDuration(5)).toBe('0:05');
      expect(formatDuration(9)).toBe('0:09');
    });

    it('formats seconds over 10 without extra zero', () => {
      expect(formatDuration(15)).toBe('0:15');
      expect(formatDuration(59)).toBe('0:59');
    });

    it('formats multi-minute durations accurately', () => {
      expect(formatDuration(60)).toBe('1:00');
      expect(formatDuration(65)).toBe('1:05');
      expect(formatDuration(125)).toBe('2:05');
      expect(formatDuration(600)).toBe('10:00');
    });

    it('handles negative or invalid values gracefully', () => {
      expect(formatDuration(-10)).toBe('0:00');
      expect(formatDuration(NaN)).toBe('0:00');
    });
  });

  describe('generateMockPeaks', () => {
    it('generates the default count of 35 peaks', () => {
      const peaks = generateMockPeaks();
      expect(peaks).toHaveLength(35);
    });

    it('generates custom number of peaks when specified', () => {
      const peaks = generateMockPeaks(20);
      expect(peaks).toHaveLength(20);
    });

    it('ensures all peaks are clamped between 0.15 and 1.0', () => {
      const peaks = generateMockPeaks(50);
      peaks.forEach((peak) => {
        expect(peak).toBeGreaterThanOrEqual(0.15);
        expect(peak).toBeLessThanOrEqual(1.0);
      });
    });
  });

  describe('extractWaveformPeaks', () => {
    it('falls back to mock peaks when Web Audio API is unavailable in test environment', async () => {
      const dummyBlob = new Blob(['fake audio content'], { type: 'audio/webm' });
      const peaks = await extractWaveformPeaks(dummyBlob, 25);
      expect(peaks).toHaveLength(25);
      peaks.forEach((p) => {
        expect(p).toBeGreaterThanOrEqual(0.15);
        expect(p).toBeLessThanOrEqual(1.0);
      });
    });

    it('decodes audio and normalizes peaks when AudioContext is mocked', async () => {
      // Mock AudioContext with sinusoidal channel data
      const mockChannelData = new Float32Array(1000);
      for (let i = 0; i < 1000; i++) {
        mockChannelData[i] = Math.sin(i / 10) * 0.8;
      }

      const mockAudioBuffer = {
        length: 1000,
        getChannelData: vi.fn().mockReturnValue(mockChannelData),
      };

      const mockAudioContext = {
        decodeAudioData: vi.fn().mockResolvedValue(mockAudioBuffer),
        close: vi.fn().mockResolvedValue(undefined),
      };

      (window as any).AudioContext = vi.fn().mockImplementation(() => mockAudioContext);

      const dummyBlob = new Blob(['dummy'], { type: 'audio/webm' });
      const peaks = await extractWaveformPeaks(dummyBlob, 10);

      expect(peaks).toHaveLength(10);
      expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
      expect(mockAudioContext.close).toHaveBeenCalled();

      // Peaks must be normalized
      peaks.forEach((p) => {
        expect(p).toBeGreaterThanOrEqual(0.15);
        expect(p).toBeLessThanOrEqual(1.0);
      });

      // Cleanup
      delete (window as any).AudioContext;
    });
  });
});
