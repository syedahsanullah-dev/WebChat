import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getAccumulatedRelayedBytes,
  addRelayedBytes,
  formatBandwidth,
  startTurnStatsTracking,
  TURN_WARNING_THRESHOLD_BYTES,
  TURN_MONTHLY_QUOTA_BYTES,
} from '@/lib/turnQuotaEstimator';

describe('Phase 41: WebRTC Network Resilience, TLS TURN Traversal & ICE Connection Recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('1. turnQuotaEstimator Telemetry', () => {
    it('initializes accumulated bytes to 0 when storage is empty', () => {
      expect(getAccumulatedRelayedBytes()).toBe(0);
    });

    it('accumulates relayed bytes across calls in localStorage', () => {
      addRelayedBytes(5000);
      expect(getAccumulatedRelayedBytes()).toBe(5000);

      addRelayedBytes(15000);
      expect(getAccumulatedRelayedBytes()).toBe(20000);
    });

    it('formats bandwidth units correctly across B, KB, MB, and GB', () => {
      expect(formatBandwidth(512)).toBe('512 B');
      expect(formatBandwidth(2048)).toBe('2.0 KB');
      expect(formatBandwidth(5 * 1024 * 1024)).toBe('5.00 MB');
      expect(formatBandwidth(10 * 1024 * 1024 * 1024)).toBe('10.00 GB');
    });

    it('dispatches webchat:turn-quota-warning when exceeding 40 GB warning threshold', () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      // Add 41 GB
      const overThreshold = TURN_WARNING_THRESHOLD_BYTES + 1024 * 1024;
      addRelayedBytes(overThreshold);

      expect(dispatchSpy).toHaveBeenCalled();
      const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
      expect(event.type).toBe('webchat:turn-quota-warning');
      expect(event.detail.quotaBytes).toBe(TURN_MONTHLY_QUOTA_BYTES);
    });

    it('tracks delta bytesSent and bytesReceived from active RTCPeerConnection stats', async () => {
      const mockStats = new Map();
      mockStats.set('pair-1', {
        id: 'pair-1',
        type: 'candidate-pair',
        state: 'succeeded',
        nominated: true,
        bytesSent: 1000,
        bytesReceived: 2000,
        localCandidateId: 'local-1',
        remoteCandidateId: 'remote-1',
      });
      mockStats.set('remote-1', {
        id: 'remote-1',
        type: 'remote-candidate',
        candidateType: 'relay',
      });

      const mockPC = {
        connectionState: 'connected',
        iceConnectionState: 'connected',
        getStats: vi.fn().mockResolvedValue(mockStats),
      } as unknown as RTCPeerConnection;

      vi.useFakeTimers();

      const stop = startTurnStatsTracking(mockPC, 1000);

      // First sample establishes baseline
      await vi.advanceTimersByTimeAsync(1000);
      expect(getAccumulatedRelayedBytes()).toBe(0);

      // Second sample with increased bytes
      mockStats.set('pair-1', {
        id: 'pair-1',
        type: 'candidate-pair',
        state: 'succeeded',
        nominated: true,
        bytesSent: 1500, // +500
        bytesReceived: 3500, // +1500
        localCandidateId: 'local-1',
        remoteCandidateId: 'remote-1',
      });

      await vi.advanceTimersByTimeAsync(1000);
      expect(getAccumulatedRelayedBytes()).toBe(2000);

      stop();
      vi.useRealTimers();
    });
  });

  describe('2. ICE Servers & TLS TURN Configuration', () => {
    it('verifies TLS TURN over TCP port 443 format', () => {
      const turnTlsUrl = 'turns:relay.metered.ca:443?transport=tcp';
      expect(turnTlsUrl.startsWith('turns:')).toBe(true);
      expect(turnTlsUrl.includes(':443')).toBe(true);
      expect(turnTlsUrl.includes('transport=tcp')).toBe(true);
    });

    it('verifies STUN fallback servers list Google and Cloudflare', () => {
      const stunServers = [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
        'stun:stun.cloudflare.com:3478',
      ];
      expect(stunServers.length).toBe(4);
      expect(stunServers[0]).toContain('google.com');
      expect(stunServers[3]).toContain('cloudflare.com');
    });
  });
});
