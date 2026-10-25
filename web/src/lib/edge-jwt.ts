/**
 * Lightweight, zero-dependency JWT verification for Next.js Middleware and Edge Runtime
 * Uses standard Web Crypto API (crypto.subtle) without Node.js dependencies
 */

export const AUTH_COOKIE_NAME = 'auth_token';
export const DEFAULT_JWT_SECRET =
  'EPAzsE8JURfzZxKzyfOaY8tguziGHNWmB8N202AWCAwbRIUGGycrGXFixZJ';

export function getEdgeJwtSecret(): string {
  return process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
}

function base64UrlDecode(str: string): Uint8Array {
  // Add padding if missing
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function verifyJwtEdge(
  token: string,
  secret: string
): Promise<{ userId: string; username: string; email: string } | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    // Decode header
    const headerJson = new TextDecoder().decode(base64UrlDecode(headerB64));
    const header = JSON.parse(headerJson);
    if (header.alg !== 'HS256') return null;

    // Import secret key for HMAC-SHA256
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Verify signature
    const data = enc.encode(`${headerB64}.${payloadB64}`);
    const signature = base64UrlDecode(signatureB64);
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature as unknown as BufferSource,
      data as unknown as BufferSource
    );
    if (!isValid) return null;

    // Decode payload
    const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64));
    const payload = JSON.parse(payloadJson);

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    if (!payload.userId || !payload.username) {
      return null;
    }

    return {
      userId: payload.userId,
      username: payload.username,
      email: payload.email,
    };
  } catch {
    return null;
  }
}
