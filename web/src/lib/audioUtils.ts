/**
 * Audio Utility Functions for WhatsApp Voice Notes
 * Handles AudioContext peak decoding, amplitude normalization, and duration formatting
 */

/**
 * Formats a duration in seconds to "m:ss" (e.g. 0:15, 1:04)
 */
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Generates fallback peaks when audio decoding is not supported or for mock environments
 */
export function generateMockPeaks(numBars = 35): number[] {
  const peaks: number[] = [];
  for (let i = 0; i < numBars; i++) {
    // Generate organic pseudo-random voice-like wave
    const wave = Math.sin((i / numBars) * Math.PI) * 0.7 + 0.3;
    const noise = Math.random() * 0.4;
    const value = Math.min(1.0, Math.max(0.15, Number((wave * (0.6 + noise)).toFixed(2))));
    peaks.push(value);
  }
  return peaks;
}

/**
 * Extracts normalized amplitude peaks (0.1 to 1.0) from an audio Blob using the Web Audio API
 * @param audioBlob The recorded audio Blob (e.g. audio/webm or audio/ogg)
 * @param numBars Number of amplitude bars to extract (default: 35)
 */
export async function extractWaveformPeaks(
  audioBlob: Blob,
  numBars = 35
): Promise<number[]> {
  if (typeof window === 'undefined') {
    return generateMockPeaks(numBars);
  }

  const AudioContextClass =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) {
    return generateMockPeaks(numBars);
  }

  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioContext = new AudioContextClass();

    // Decode PCM channel data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    const totalSamples = channelData.length;

    if (totalSamples === 0) {
      await audioContext.close();
      return generateMockPeaks(numBars);
    }

    const bucketSize = Math.floor(totalSamples / numBars);
    const rawPeaks: number[] = [];

    for (let i = 0; i < numBars; i++) {
      const start = i * bucketSize;
      const end = Math.min(start + bucketSize, totalSamples);
      let max = 0;

      for (let j = start; j < end; j++) {
        const abs = Math.abs(channelData[j]);
        if (abs > max) {
          max = abs;
        }
      }
      rawPeaks.push(max);
    }

    await audioContext.close();

    // Find the highest peak to normalize
    const highestPeak = Math.max(...rawPeaks, 0.01);

    // Normalize between 0.15 and 1.0 so low amplitude bars remain visually distinct
    const normalizedPeaks = rawPeaks.map((peak) => {
      const normalized = peak / highestPeak;
      // Floor of 0.15 for visibility, max 1.0
      return Number(Math.max(0.15, Math.min(1.0, normalized)).toFixed(2));
    });

    return normalizedPeaks;
  } catch (err) {
    console.warn('[audioUtils] Web Audio API decode failed, falling back to synthetic peaks:', err);
    return generateMockPeaks(numBars);
  }
}
