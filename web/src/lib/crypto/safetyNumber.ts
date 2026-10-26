import { getSubtleCrypto } from './keyExchange';

/**
 * Computes a standardized 60-digit cryptographic Safety Number for 1-on-1 chats.
 * 
 * Process:
 * 1. Lexicographically sorts both public keys so order of participants does not matter.
 * 2. Computes SHA-256 digest of concatenated public keys.
 * 3. Converts digest into a big integer.
 * 4. Extracts 60 decimal digits formatted into 12 blocks of 5 digits.
 * 
 * Example output: "38491 02842 98402 12948 57291 04829 84920 18274 95820 18472 94028 17492"
 */
export async function computeSafetyNumber(
  publicKeyA: string,
  publicKeyB: string
): Promise<string> {
  const subtle = getSubtleCrypto();

  // 1. Sort lexicographically to ensure symmetry (Alice+Bob === Bob+Alice)
  const sorted = [publicKeyA.trim(), publicKeyB.trim()].sort();
  const concatenated = `${sorted[0]}|${sorted[1]}`;
  const data = new TextEncoder().encode(concatenated);

  // 2. SHA-256 digest
  const hashBuffer = await subtle.digest('SHA-256', data);
  const hashBytes = new Uint8Array(hashBuffer);

  // 3. Convert to BigInt
  let hex = '';
  for (let i = 0; i < hashBytes.length; i++) {
    hex += hashBytes[i].toString(16).padStart(2, '0');
  }
  const bigNum = BigInt(`0x${hex}`);

  // 4. Extract 60 digits and format into 12 blocks of 5 digits
  let digits = bigNum.toString().padStart(60, '0');
  if (digits.length > 60) {
    digits = digits.slice(0, 60);
  }

  const blocks: string[] = [];
  for (let i = 0; i < 60; i += 5) {
    blocks.push(digits.slice(i, i + 5));
  }

  return blocks.join(' ');
}
