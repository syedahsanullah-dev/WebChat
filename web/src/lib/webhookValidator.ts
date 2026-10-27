import crypto from 'crypto';

/**
 * Validates HMAC SHA-256 signature for inbound webhooks.
 * Supports standard X-Signature-SHA256 and GitHub-style X-Hub-Signature-256 (sha256=...).
 */
export function verifyWebhookSignature(
  rawBody: string,
  secret: string,
  signatureHeader?: string | null
): boolean {
  if (!signatureHeader || !secret) {
    return false;
  }

  // Strip prefix "sha256=" if present
  const cleanSignature = signatureHeader.replace(/^sha256=/i, '').trim();

  try {
    const computedHash = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('hex');

    const expectedBuffer = Buffer.from(computedHash, 'hex');
    const receivedBuffer = Buffer.from(cleanSignature, 'hex');

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch {
    return false;
  }
}

/**
 * Computes HMAC SHA-256 signature for outbound webhooks.
 */
export function computeOutboundSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}
