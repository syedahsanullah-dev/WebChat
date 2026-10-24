import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Mp3Encoder } from '@breezystack/lamejs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const soundsDir = path.join(__dirname, '..', 'public', 'sounds');
if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true });
}

function encodeToMp3(samples, sampleRate = 44100, kbps = 128) {
  const mp3encoder = new Mp3Encoder(1, sampleRate, kbps);
  const mp3Data = [];
  const sampleBlockSize = 1152;
  
  for (let i = 0; i < samples.length; i += sampleBlockSize) {
    const sampleChunk = samples.subarray(i, i + sampleBlockSize);
    const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
    if (mp3buf.length > 0) {
      mp3Data.push(Buffer.from(mp3buf));
    }
  }
  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(Buffer.from(mp3buf));
  }
  return Buffer.concat(mp3Data);
}

// 1. Sent sound: Crisp pop sound (~0.12s)
function generateSentSound() {
  const sampleRate = 44100;
  const duration = 0.15;
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Int16Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Frequency sweeps down quickly from 1200Hz to 350Hz
    const freq = 1200 - (850 * (t / duration));
    const envelope = Math.exp(-22 * t);
    const val = Math.sin(2 * Math.PI * freq * t) * envelope;
    samples[i] = Math.floor(val * 24000);
  }

  const mp3Buffer = encodeToMp3(samples, sampleRate, 128);
  fs.writeFileSync(path.join(soundsDir, 'sent.mp3'), mp3Buffer);
  console.log(`Generated sent.mp3: ${mp3Buffer.length} bytes`);
}

// 2. Receive sound: Two-tone chime (~0.4s)
function generateReceiveSound() {
  const sampleRate = 44100;
  const duration = 0.4;
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Int16Array(numSamples);

  const t1 = 0.16; // duration of first tone (587 Hz - D5)
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let val = 0;
    if (t < t1) {
      const env = Math.sin((t / t1) * Math.PI * 0.5) * Math.exp(-5 * t);
      val = Math.sin(2 * Math.PI * 587.33 * t) * env;
    } else {
      const tRel = t - t1;
      const env = Math.exp(-7 * tRel);
      val = (0.8 * Math.sin(2 * Math.PI * 880 * tRel) + 0.2 * Math.sin(2 * Math.PI * 1760 * tRel)) * env;
    }
    samples[i] = Math.floor(val * 24000);
  }

  const mp3Buffer = encodeToMp3(samples, sampleRate, 128);
  fs.writeFileSync(path.join(soundsDir, 'receive.mp3'), mp3Buffer);
  console.log(`Generated receive.mp3: ${mp3Buffer.length} bytes`);
}

// 3. Ringtone: Audio call ringing tone loop (~2.0s)
function generateRingtone() {
  const sampleRate = 44100;
  const duration = 2.0;
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Int16Array(numSamples);

  // WhatsApp style ring: two melodic bursts followed by silence
  // Burst 1: 0.05s to 0.45s
  // Burst 2: 0.55s to 0.95s
  // Silence: 0.95s to 2.0s
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let val = 0;

    const inBurst1 = t >= 0.05 && t < 0.45;
    const inBurst2 = t >= 0.55 && t < 0.95;

    if (inBurst1) {
      const tb = t - 0.05;
      const env = Math.sin((tb / 0.4) * Math.PI);
      val = (0.5 * Math.sin(2 * Math.PI * 440 * tb) + 0.5 * Math.sin(2 * Math.PI * 480 * tb)) * env;
    } else if (inBurst2) {
      const tb = t - 0.55;
      const env = Math.sin((tb / 0.4) * Math.PI);
      val = (0.5 * Math.sin(2 * Math.PI * 440 * tb) + 0.5 * Math.sin(2 * Math.PI * 480 * tb)) * env;
    }

    samples[i] = Math.floor(val * 22000);
  }

  const mp3Buffer = encodeToMp3(samples, sampleRate, 128);
  fs.writeFileSync(path.join(soundsDir, 'ringtone.mp3'), mp3Buffer);
  console.log(`Generated ringtone.mp3: ${mp3Buffer.length} bytes`);
}

generateSentSound();
generateReceiveSound();
generateRingtone();
console.log('All audio notification files generated successfully!');
