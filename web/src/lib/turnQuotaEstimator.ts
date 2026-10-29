/**
 * Client-Side TURN Bandwidth Estimator (Phase 41)
 * Periodically inspects active RTCPeerConnection stats via WebRTC getStats()
 * to track relayed data against Metered.ca's free 50 GB/month limit.
 */

const STORAGE_KEY_BYTES = 'webchat_turn_relayed_bytes';
const STORAGE_KEY_MONTH = 'webchat_turn_relayed_month';

// Metered.ca Free Tier Quota: 50 GB, Alert threshold at 40 GB (80%)
export const TURN_MONTHLY_QUOTA_BYTES = 50 * 1024 * 1024 * 1024; // 53,687,091,200 bytes
export const TURN_WARNING_THRESHOLD_BYTES = 40 * 1024 * 1024 * 1024; // 42,949,672,960 bytes

function getCurrentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}`;
}

export function getAccumulatedRelayedBytes(): number {
  if (typeof window === 'undefined' || !window.localStorage) return 0;
  try {
    const currentMonth = getCurrentMonthKey();
    const storedMonth = localStorage.getItem(STORAGE_KEY_MONTH);
    if (storedMonth !== currentMonth) {
      localStorage.setItem(STORAGE_KEY_MONTH, currentMonth);
      localStorage.setItem(STORAGE_KEY_BYTES, '0');
      return 0;
    }
    const val = localStorage.getItem(STORAGE_KEY_BYTES);
    return val ? parseInt(val, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export function addRelayedBytes(bytes: number): number {
  if (typeof window === 'undefined' || !window.localStorage || bytes <= 0) return 0;
  try {
    const total = getAccumulatedRelayedBytes() + bytes;
    localStorage.setItem(STORAGE_KEY_BYTES, total.toString());
    localStorage.setItem(STORAGE_KEY_MONTH, getCurrentMonthKey());

    if (total >= TURN_WARNING_THRESHOLD_BYTES) {
      console.warn(
        `[TURN Quota] High relayed bandwidth detected: ${(total / (1024 * 1024 * 1024)).toFixed(2)} GB used of 50 GB quota`
      );
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('webchat:turn-quota-warning', {
            detail: { totalRelayedBytes: total, quotaBytes: TURN_MONTHLY_QUOTA_BYTES },
          })
        );
      }
    }
    return total;
  } catch {
    return 0;
  }
}

export function formatBandwidth(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Periodically inspects an active RTCPeerConnection for TURN candidate pairs
 * and tracks delta relayed bytes into local storage.
 */
export function startTurnStatsTracking(
  pc: RTCPeerConnection,
  intervalMs = 5000
): () => void {
  if (typeof window === 'undefined' || !pc) return () => {};

  let lastBytesSent = 0;
  let lastBytesReceived = 0;
  let isFirstSample = true;

  const timer = setInterval(async () => {
    try {
      if (pc.connectionState !== 'connected' && pc.iceConnectionState !== 'connected') {
        return;
      }

      const stats = await pc.getStats();
      let activeCandidatePair: any = null;
      const candidates = new Map<string, any>();

      stats.forEach((report) => {
        if (report.type === 'candidate-pair' && (report.state === 'succeeded' || report.nominated)) {
          activeCandidatePair = report;
        } else if (report.type === 'remote-candidate' || report.type === 'local-candidate') {
          candidates.set(report.id, report);
        }
      });

      if (!activeCandidatePair) return;

      const remoteCand = candidates.get(activeCandidatePair.remoteCandidateId);
      const localCand = candidates.get(activeCandidatePair.localCandidateId);

      const isRelayed =
        (remoteCand && remoteCand.candidateType === 'relay') ||
        (localCand && localCand.candidateType === 'relay') ||
        activeCandidatePair.bytesSent > 0; // fallback inspection

      if (isRelayed) {
        const currentSent = activeCandidatePair.bytesSent || 0;
        const currentReceived = activeCandidatePair.bytesReceived || 0;

        if (!isFirstSample) {
          const deltaSent = Math.max(0, currentSent - lastBytesSent);
          const deltaReceived = Math.max(0, currentReceived - lastBytesReceived);
          const totalDelta = deltaSent + deltaReceived;

          if (totalDelta > 0) {
            addRelayedBytes(totalDelta);
          }
        } else {
          isFirstSample = false;
        }

        lastBytesSent = currentSent;
        lastBytesReceived = currentReceived;
      }
    } catch (err) {
      console.debug('[turnQuotaEstimator] Stats collection error:', err);
    }
  }, intervalMs);

  return () => {
    clearInterval(timer);
  };
}
