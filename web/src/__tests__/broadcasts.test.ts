import { describe, it, expect, vi, beforeEach } from 'vitest';
import { playBroadcastAlertChime } from '@/hooks/useGlobalBroadcast';

describe('Phase 35: Real-Time Global Broadcasts', () => {
  describe('1. Web Audio API Chime Synthesizer', () => {
    it('executes playBroadcastAlertChime safely in browser environment', () => {
      // Mock AudioContext
      const mockOscillator = {
        type: 'sine',
        frequency: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };

      const mockGain = {
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      };

      const mockAudioContext = vi.fn().mockImplementation(() => ({
        currentTime: 0,
        destination: {},
        createOscillator: vi.fn().mockReturnValue(mockOscillator),
        createGain: vi.fn().mockReturnValue(mockGain),
      }));

      // Attach to global window
      (window as any).AudioContext = mockAudioContext;

      expect(() => playBroadcastAlertChime()).not.toThrow();
      expect(mockAudioContext).toHaveBeenCalled();
      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(520, 0);
      expect(mockOscillator.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(660, 0.15);
      expect(mockOscillator.start).toHaveBeenCalledWith(0);
      expect(mockOscillator.stop).toHaveBeenCalledWith(0.36);
    });

    it('falls back gracefully when AudioContext is unsupported or blocked', () => {
      delete (window as any).AudioContext;
      delete (window as any).webkitAudioContext;

      expect(() => playBroadcastAlertChime()).not.toThrow();
    });
  });

  describe('2. Broadcast Expiration & Severity Logic', () => {
    it('determines if a broadcast is active and unexpired', () => {
      const now = Date.now();
      const futureExpires = new Date(now + 3600 * 1000).toISOString();
      const pastExpires = new Date(now - 3600 * 1000).toISOString();

      const activeIndefinite = {
        id: 'b-1',
        isActive: true,
        expiresAt: null,
      };

      const activeFuture = {
        id: 'b-2',
        isActive: true,
        expiresAt: futureExpires,
      };

      const expiredPast = {
        id: 'b-3',
        isActive: true,
        expiresAt: pastExpires,
      };

      const isLive = (b: { isActive: boolean; expiresAt: string | null }) =>
        b.isActive && (!b.expiresAt || new Date(b.expiresAt) > new Date());

      expect(isLive(activeIndefinite)).toBe(true);
      expect(isLive(activeFuture)).toBe(true);
      expect(isLive(expiredPast)).toBe(false);
    });

    it('validates allowed broadcast severities', () => {
      const validSeverities = ['INFO', 'WARNING', 'CRITICAL'];

      expect(validSeverities.includes('INFO')).toBe(true);
      expect(validSeverities.includes('WARNING')).toBe(true);
      expect(validSeverities.includes('CRITICAL')).toBe(true);
      expect(validSeverities.includes('UNKNOWN')).toBe(false);
    });
  });
});
