import { getSubtleCrypto, bufferToBase64, base64ToBuffer } from './keyExchange';

export interface EncryptedMessageResult {
  ciphertext: string; // Base64 encoded AES-GCM ciphertext + auth tag
  iv: string;         // Base64 encoded 12-byte (96-bit) IV
}

/**
 * Encrypts a UTF-8 plaintext string using AES-GCM-256 with a unique random 96-bit IV.
 */
export async function encryptMessage(
  plaintext: string,
  sharedKey: CryptoKey
): Promise<EncryptedMessageResult> {
  const subtle = getSubtleCrypto();

  // Generate cryptographically secure random 12-byte (96-bit) IV
  const iv = new Uint8Array(12);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(iv);
  } else if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(iv);
  } else {
    // Node environment fallback
    const { randomBytes } = await import('crypto');
    const bytes = randomBytes(12);
    iv.set(bytes);
  }

  const encodedPlaintext = new TextEncoder().encode(plaintext);

  const encryptedBuffer = await subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    sharedKey,
    encodedPlaintext
  );

  return {
    ciphertext: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv),
  };
}

/**
 * Decrypts an AES-GCM-256 ciphertext Base64 string with its 12-byte IV Base64 string.
 */
export async function decryptMessage(
  ciphertextBase64: string,
  ivBase64: string,
  sharedKey: CryptoKey
): Promise<string> {
  const subtle = getSubtleCrypto();

  const ciphertextBuffer = base64ToBuffer(ciphertextBase64);
  const ivBuffer = base64ToBuffer(ivBase64);

  const decryptedBuffer = await subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBuffer as unknown as BufferSource,
    },
    sharedKey,
    ciphertextBuffer as unknown as BufferSource
  );

  return new TextDecoder().decode(decryptedBuffer);
}
