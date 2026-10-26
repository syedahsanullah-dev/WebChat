import {
  saveUserPrivateKey,
  getUserPrivateKey,
  saveUserPublicKey,
  getUserPublicKey,
} from './keyStore';

/**
 * Universal Base64 Encoding & Decoding Utilities
 */
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBuffer(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Environment-safe SubtleCrypto accessor
 */
export function getSubtleCrypto(): SubtleCrypto {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    return window.crypto.subtle;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new Error('Web Cryptography API (SubtleCrypto) is not supported in this environment');
}

// In-memory cache for derived shared AES keys: `${myUserId}:${peerUserId}` -> CryptoKey
const sharedKeyCache = new Map<string, CryptoKey>();
// In-memory cache for peer SPKI public keys: peerUserId -> spkiBase64
const peerPublicKeyCache = new Map<string, string>();

/**
 * Generates an ECDH P-256 keypair.
 * The private key is non-extractable for maximum security in the browser.
 */
export async function generateECDHKeyPair(): Promise<CryptoKeyPair> {
  const subtle = getSubtleCrypto();
  return subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    false, // Private key cannot be exported
    ['deriveKey', 'deriveBits']
  );
}

/**
 * Exports a public key to Base64 SPKI format
 */
export async function exportPublicKeySPKI(publicKey: CryptoKey): Promise<string> {
  const subtle = getSubtleCrypto();
  const exported = await subtle.exportKey('spki', publicKey);
  return bufferToBase64(exported);
}

/**
 * Imports a Base64 SPKI public key for ECDH agreement
 */
export async function importPublicKeySPKI(spkiBase64: string): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const buffer = base64ToBuffer(spkiBase64);
  return subtle.importKey(
    'spki',
    buffer as unknown as BufferSource,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    []
  );
}

/**
 * Derives a shared 256-bit AES-GCM CryptoKey from my private key and peer's public key
 */
export async function deriveSharedAESKey(
  myPrivateKey: CryptoKey,
  peerPublicKey: CryptoKey
): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  return subtle.deriveKey(
    {
      name: 'ECDH',
      public: peerPublicKey,
    },
    myPrivateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false, // Derived AES key is non-extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Initializes or loads local user keypair on login/boot.
 * If keys do not exist in IndexedDB, generates them and publishes public key to Server #1.
 */
export async function initializeUserKeys(
  userId: string
): Promise<{ publicKeyBase64: string; isNew: boolean }> {
  // Check if private key already exists locally
  const existingPrivateKey = await getUserPrivateKey(userId);
  const existingPublicKey = await getUserPublicKey(userId);

  if (existingPrivateKey && existingPublicKey) {
    const spkiBase64 = await exportPublicKeySPKI(existingPublicKey);
    return { publicKeyBase64: spkiBase64, isNew: false };
  }

  // Generate new ECDH P-256 keypair
  const keyPair = await generateECDHKeyPair();
  await saveUserPrivateKey(userId, keyPair.privateKey);
  await saveUserPublicKey(userId, keyPair.publicKey);

  const spkiBase64 = await exportPublicKeySPKI(keyPair.publicKey);

  // Publish public key to server registry
  try {
    const baseUrl =
      typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null'
        ? window.location.origin
        : '';
    await fetch(`${baseUrl}/api/users/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicKey: spkiBase64,
        algorithm: 'ECDH-P256',
      }),
    });
  } catch (err) {
    console.warn('[keyExchange] Non-fatal: Failed to publish public key to server:', err);
  }

  return { publicKeyBase64: spkiBase64, isNew: true };
}

/**
 * Fetches peer's public key from Server #1 (or local cache)
 */
export async function fetchPeerPublicKey(peerId: string): Promise<string | null> {
  if (peerPublicKeyCache.has(peerId)) {
    return peerPublicKeyCache.get(peerId)!;
  }

  try {
    const baseUrl =
      typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null'
        ? window.location.origin
        : '';
    const res = await fetch(`${baseUrl}/api/users/${peerId}/key`, {
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (data.publicKey) {
      peerPublicKeyCache.set(peerId, data.publicKey);
      if (data.userId && data.userId !== peerId) {
        peerPublicKeyCache.set(data.userId, data.publicKey);
      }
      return data.publicKey;
    }
  } catch (err) {
    console.warn(`[keyExchange] Error fetching public key for peer ${peerId}:`, err);
  }

  return null;
}

/**
 * Retrieves cached shared AES-GCM key or derives and caches it
 */
export async function getOrDeriveSharedKey(
  myUserId: string,
  peerId: string,
  peerPublicKeySPKI?: string | null
): Promise<CryptoKey | null> {
  const cacheKey = `${myUserId}:${peerId}`;
  if (sharedKeyCache.has(cacheKey)) {
    return sharedKeyCache.get(cacheKey)!;
  }

  // 1. Get my private key
  let myPrivateKey = await getUserPrivateKey(myUserId);
  if (!myPrivateKey) {
    await initializeUserKeys(myUserId);
    myPrivateKey = await getUserPrivateKey(myUserId);
  }
  if (!myPrivateKey) return null;

  // 2. Get peer's public key
  const targetSPKI = peerPublicKeySPKI || (await fetchPeerPublicKey(peerId));
  if (!targetSPKI) return null;

  try {
    const peerPubKey = await importPublicKeySPKI(targetSPKI);
    const sharedAESKey = await deriveSharedAESKey(myPrivateKey, peerPubKey);
    sharedKeyCache.set(cacheKey, sharedAESKey);
    return sharedAESKey;
  } catch (err) {
    console.error(`[keyExchange] Error deriving shared key with ${peerId}:`, err);
    return null;
  }
}

/**
 * Clears cached keys on logout
 */
export function clearCryptoMemoryCache(): void {
  sharedKeyCache.clear();
  peerPublicKeyCache.clear();
}
