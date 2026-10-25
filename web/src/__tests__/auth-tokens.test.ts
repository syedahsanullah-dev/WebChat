import { describe, it, expect } from 'vitest';
import { signToken, verifyToken, getJwtSecret } from '@/lib/auth';
import { verifyJwtEdge } from '@/lib/edge-jwt';

describe('Phase 03 JWT Token & Edge Verification', () => {
  const samplePayload = {
    userId: 'user-uuid-1234',
    username: 'alex_test',
    email: 'alex@test.com',
  };

  it('signs and verifies a valid JWT payload using jsonwebtoken', () => {
    const token = signToken(samplePayload);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);

    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(samplePayload.userId);
    expect(decoded?.username).toBe(samplePayload.username);
    expect(decoded?.email).toBe(samplePayload.email);
  });

  it('verifies the signed JWT using Edge Web Crypto helper (verifyJwtEdge)', async () => {
    const token = signToken(samplePayload);
    const secret = getJwtSecret();

    const edgeDecoded = await verifyJwtEdge(token, secret);
    expect(edgeDecoded).not.toBeNull();
    expect(edgeDecoded?.userId).toBe(samplePayload.userId);
    expect(edgeDecoded?.username).toBe(samplePayload.username);
    expect(edgeDecoded?.email).toBe(samplePayload.email);
  });

  it('rejects tampered or forged tokens', async () => {
    const validToken = signToken(samplePayload);
    const secret = getJwtSecret();

    // Tampered payload
    const parts = validToken.split('.');
    const tamperedToken = `${parts[0]}.${parts[1]}wrong.${parts[2]}`;

    expect(verifyToken(tamperedToken)).toBeNull();
    expect(await verifyJwtEdge(tamperedToken, secret)).toBeNull();

    // Wrong secret
    expect(await verifyJwtEdge(validToken, 'different-secret-key-12345')).toBeNull();
  });
});
