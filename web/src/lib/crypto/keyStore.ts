/**
 * Web Cryptography Key Storage
 * Uses browser IndexedDB ('webchat_crypto') to store non-extractable private keys
 * with in-memory fallback for non-browser/test environments.
 */

const DB_NAME = 'webchat_crypto';
const DB_VERSION = 1;
const STORE_NAME = 'keys';

// In-memory fallback map for Node/Vitest environments where IndexedDB is unavailable
const memoryKeyStore = new Map<string, any>();

function getIndexedDB(): IDBFactory | null {
  if (typeof window !== 'undefined' && window.indexedDB) {
    return window.indexedDB;
  }
  return null;
}

function openDatabase(): Promise<IDBDatabase | null> {
  const idb = getIndexedDB();
  if (!idb) return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    const request = idb.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      console.warn('[keyStore] IndexedDB open error, falling back to in-memory store:', request.error);
      resolve(null);
    };
  });
}

/**
 * Stores a key in IndexedDB (or in-memory fallback)
 */
export async function setCryptoKey(keyName: string, key: any): Promise<void> {
  const db = await openDatabase();
  if (!db) {
    memoryKeyStore.set(keyName, key);
    return;
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(key, keyName);

      req.onsuccess = () => resolve();
      req.onerror = () => {
        console.warn('[keyStore] Error saving key to IndexedDB, fallback to memory:', req.error);
        memoryKeyStore.set(keyName, key);
        resolve();
      };
    } catch (err) {
      memoryKeyStore.set(keyName, key);
      resolve();
    }
  });
}

/**
 * Retrieves a key from IndexedDB (or in-memory fallback)
 */
export async function getCryptoKey<T = any>(keyName: string): Promise<T | null> {
  const db = await openDatabase();
  if (!db) {
    return (memoryKeyStore.get(keyName) as T) || null;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(keyName);

      req.onsuccess = () => {
        const val = req.result;
        if (val) {
          resolve(val as T);
        } else {
          resolve((memoryKeyStore.get(keyName) as T) || null);
        }
      };
      req.onerror = () => {
        resolve((memoryKeyStore.get(keyName) as T) || null);
      };
    } catch {
      resolve((memoryKeyStore.get(keyName) as T) || null);
    }
  });
}

/**
 * Specific helpers for user private & public keys
 */
export async function saveUserPrivateKey(userId: string, privateKey: CryptoKey): Promise<void> {
  await setCryptoKey(`priv_${userId}`, privateKey);
}

export async function getUserPrivateKey(userId: string): Promise<CryptoKey | null> {
  return getCryptoKey<CryptoKey>(`priv_${userId}`);
}

export async function saveUserPublicKey(userId: string, publicKey: CryptoKey): Promise<void> {
  await setCryptoKey(`pub_${userId}`, publicKey);
}

export async function getUserPublicKey(userId: string): Promise<CryptoKey | null> {
  return getCryptoKey<CryptoKey>(`pub_${userId}`);
}

/**
 * Clears all crypto keys for logout/reset
 */
export async function clearAllCryptoKeys(): Promise<void> {
  memoryKeyStore.clear();
  const db = await openDatabase();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}
