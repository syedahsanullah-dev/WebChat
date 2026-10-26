import { describe, it, expect } from 'vitest';
import {
  generateECDHKeyPair,
  exportPublicKeySPKI,
  importPublicKeySPKI,
  deriveSharedAESKey,
  bufferToBase64,
  base64ToBuffer,
} from '../lib/crypto/keyExchange';
import { encryptMessage, decryptMessage } from '../lib/crypto/e2eeCipher';
import { computeSafetyNumber } from '../lib/crypto/safetyNumber';

describe('Phase 16: Client-Side End-to-End Encryption (E2EE) Cryptography', () => {
  it('encodes and decodes buffers to/from Base64 cleanly', () => {
    const originalText = 'Hello WebChat E2EE World!';
    const buffer = new TextEncoder().encode(originalText);
    const base64 = bufferToBase64(buffer);
    const recoveredBuffer = base64ToBuffer(base64);
    const recoveredText = new TextDecoder().decode(recoveredBuffer);

    expect(recoveredText).toBe(originalText);
  });

  it('generates ECDH P-256 keypair, exports public key, and re-imports it', async () => {
    const keyPair = await generateECDHKeyPair();
    expect(keyPair.privateKey).toBeDefined();
    expect(keyPair.publicKey).toBeDefined();

    const spkiBase64 = await exportPublicKeySPKI(keyPair.publicKey);
    expect(typeof spkiBase64).toBe('string');
    expect(spkiBase64.length).toBeGreaterThan(50);

    const importedPubKey = await importPublicKeySPKI(spkiBase64);
    expect(importedPubKey.algorithm.name).toBe('ECDH');
  });

  it('performs Diffie-Hellman key agreement: Alice and Bob derive matching AES-256 keys', async () => {
    // 1. Alice generates keypair
    const aliceKeys = await generateECDHKeyPair();
    const alicePubSPKI = await exportPublicKeySPKI(aliceKeys.publicKey);

    // 2. Bob generates keypair
    const bobKeys = await generateECDHKeyPair();
    const bobPubSPKI = await exportPublicKeySPKI(bobKeys.publicKey);

    // 3. Exchange: Alice imports Bob's public key; Bob imports Alice's public key
    const aliceImportedBobPub = await importPublicKeySPKI(bobPubSPKI);
    const bobImportedAlicePub = await importPublicKeySPKI(alicePubSPKI);

    // 4. Key agreement: Both derive shared AES-GCM keys
    const aliceSharedKey = await deriveSharedAESKey(aliceKeys.privateKey, aliceImportedBobPub);
    const bobSharedKey = await deriveSharedAESKey(bobKeys.privateKey, bobImportedAlicePub);

    // 5. Test encryption with Alice's shared key and decryption with Bob's shared key
    const secretMessage = 'Secret message from Alice to Bob with emoji 🚀🔒';
    const encrypted = await encryptMessage(secretMessage, aliceSharedKey);

    expect(encrypted.ciphertext).not.toBe(secretMessage);
    expect(encrypted.iv).toBeDefined();

    const decryptedByBob = await decryptMessage(encrypted.ciphertext, encrypted.iv, bobSharedKey);
    expect(decryptedByBob).toBe(secretMessage);

    // 6. Test reverse: Bob encrypts, Alice decrypts
    const replyMessage = 'Bob received loud and clear!';
    const replyEncrypted = await encryptMessage(replyMessage, bobSharedKey);
    const decryptedByAlice = await decryptMessage(replyEncrypted.ciphertext, replyEncrypted.iv, aliceSharedKey);
    expect(decryptedByAlice).toBe(replyMessage);
  });

  it('generates unique 96-bit IV per encryption and fails with wrong key', async () => {
    const aliceKeys = await generateECDHKeyPair();
    const bobKeys = await generateECDHKeyPair();
    const eveKeys = await generateECDHKeyPair();

    const bobPub = await importPublicKeySPKI(await exportPublicKeySPKI(bobKeys.publicKey));
    const evePub = await importPublicKeySPKI(await exportPublicKeySPKI(eveKeys.publicKey));

    const aliceBobKey = await deriveSharedAESKey(aliceKeys.privateKey, bobPub);
    const aliceEveKey = await deriveSharedAESKey(aliceKeys.privateKey, evePub);

    const message = 'Confidential bank transfer data';
    const enc1 = await encryptMessage(message, aliceBobKey);
    const enc2 = await encryptMessage(message, aliceBobKey);

    // Unique random IV per message
    expect(enc1.iv).not.toBe(enc2.iv);
    expect(enc1.ciphertext).not.toBe(enc2.ciphertext);

    // Attempting to decrypt with Eve's key must throw
    await expect(decryptMessage(enc1.ciphertext, enc1.iv, aliceEveKey)).rejects.toThrow();
  });

  it('calculates deterministic 60-digit Safety Numbers with symmetric participant ordering', async () => {
    const keyPairA = await generateECDHKeyPair();
    const keyPairB = await generateECDHKeyPair();
    const keyPairC = await generateECDHKeyPair();

    const pubA = await exportPublicKeySPKI(keyPairA.publicKey);
    const pubB = await exportPublicKeySPKI(keyPairB.publicKey);
    const pubC = await exportPublicKeySPKI(keyPairC.publicKey);

    // Order symmetry: Alice + Bob === Bob + Alice
    const safetyNumber1 = await computeSafetyNumber(pubA, pubB);
    const safetyNumber2 = await computeSafetyNumber(pubB, pubA);

    expect(safetyNumber1).toBe(safetyNumber2);

    // Format check: exactly 12 blocks of 5 digits separated by spaces
    const blocks = safetyNumber1.split(' ');
    expect(blocks.length).toBe(12);
    blocks.forEach((block) => {
      expect(block).toMatch(/^\d{5}$/);
    });

    // Total digits: 60 digits
    const digitsOnly = safetyNumber1.replace(/\s+/g, '');
    expect(digitsOnly.length).toBe(60);

    // Different contacts produce different safety numbers
    const safetyNumberWithEve = await computeSafetyNumber(pubA, pubC);
    expect(safetyNumberWithEve).not.toBe(safetyNumber1);
  });
});
