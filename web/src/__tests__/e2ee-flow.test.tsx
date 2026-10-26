import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import E2EEBubbleIndicator from '@/components/chat/E2EEBubbleIndicator';
import E2EEHeaderBadge from '@/components/chat/E2EEHeaderBadge';
import SafetyNumberModal from '@/components/security/SafetyNumberModal';
import MessageBubble from '@/components/chat/MessageBubble';
import {
  generateECDHKeyPair,
  exportPublicKeySPKI,
  importPublicKeySPKI,
  deriveSharedAESKey,
} from '@/lib/crypto/keyExchange';
import { encryptMessage, decryptMessage } from '@/lib/crypto/e2eeCipher';
import { computeSafetyNumber } from '@/lib/crypto/safetyNumber';
import * as keyExchangeModule from '@/lib/crypto/keyExchange';
import * as keyStoreModule from '@/lib/crypto/keyStore';

describe('Phase 16: End-to-End Encryption (E2EE) Full Integration & Component Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. E2EE UI Badges & Indicators', () => {
    it('renders E2EEBubbleIndicator with lock icon', () => {
      const { container } = render(<E2EEBubbleIndicator />);
      const indicator = screen.getByTitle(/end-to-end encrypted message/i);
      expect(indicator).toBeDefined();
      expect(container.querySelector('svg')).toBeDefined();
    });

    it('renders E2EEHeaderBadge and invokes onVerifySecurity callback when clicked', () => {
      const handleVerify = vi.fn();
      render(<E2EEHeaderBadge onVerifySecurity={handleVerify} />);

      const button = screen.getByRole('button');
      expect(button.textContent).toMatch(/Messages and calls are end-to-end encrypted/i);
      expect(button.textContent).toMatch(/Click to verify/i);

      fireEvent.click(button);
      expect(handleVerify).toHaveBeenCalledTimes(1);
    });

    it('renders MessageBubble with E2EEBubbleIndicator when isE2EE is true', () => {
      const { container } = render(
        <MessageBubble
          id="msg-e2ee-1"
          content="Decrypted secret message"
          isMe={true}
          status="read"
          createdAt={new Date()}
          isE2EE={true}
        />
      );

      expect(screen.getByText('Decrypted secret message')).toBeDefined();
      const lockIndicator = container.querySelector('[title="End-to-end encrypted message"]');
      expect(lockIndicator).not.toBeNull();
    });

    it('does not render E2EEBubbleIndicator when isE2EE is false', () => {
      const { container } = render(
        <MessageBubble
          id="msg-plain-1"
          content="Plain unencrypted message"
          isMe={true}
          status="sent"
          createdAt={new Date()}
          isE2EE={false}
        />
      );

      const lockIndicator = container.querySelector('[title="End-to-end encrypted message"]');
      expect(lockIndicator).toBeNull();
    });
  });

  describe('2. SafetyNumberModal & Cryptographic Verification', () => {
    it('calculates, formats into 12 blocks, renders QR code, and allows copying', async () => {
      const aliceKeys = await generateECDHKeyPair();
      const bobKeys = await generateECDHKeyPair();
      const alicePubSPKI = await exportPublicKeySPKI(aliceKeys.publicKey);
      const bobPubSPKI = await exportPublicKeySPKI(bobKeys.publicKey);

      vi.spyOn(keyStoreModule, 'getUserPublicKey').mockResolvedValue(aliceKeys.publicKey);
      vi.spyOn(keyExchangeModule, 'fetchPeerPublicKey').mockResolvedValue(bobPubSPKI);

      const mockClipboard = {
        writeText: vi.fn().mockResolvedValue(undefined),
      };
      Object.assign(navigator, { clipboard: mockClipboard });

      const handleClose = vi.fn();

      render(
        <SafetyNumberModal
          isOpen={true}
          onClose={handleClose}
          contactName="Bob Smith"
          contactUsername="@bob"
          myUserId="alice-uuid"
          peerUserId="bob-uuid"
          peerPublicKey={bobPubSPKI}
        />
      );

      // Verify contact name displayed
      expect(screen.getByText('Bob Smith')).toBeDefined();
      expect(screen.getByText('@bob')).toBeDefined();

      // Await calculation completion
      await waitFor(() => {
        expect(screen.getByText(/Copy 60-digit code/i)).toBeDefined();
      });

      // Verify 60-digit number presence (12 blocks)
      const expectedSafetyNumber = await computeSafetyNumber(alicePubSPKI, bobPubSPKI);
      const firstBlock = expectedSafetyNumber.split(' ')[0];
      expect(screen.getByText(firstBlock)).toBeDefined();

      // Verify visual QR code SVG rendered
      const qrSvg = document.querySelector('svg');
      expect(qrSvg).toBeDefined();

      // Test copy action
      const copyButton = screen.getByText(/Copy 60-digit code/i);
      fireEvent.click(copyButton);

      expect(mockClipboard.writeText).toHaveBeenCalledWith(expectedSafetyNumber);
      await waitFor(() => {
        expect(screen.getByText(/Copied to clipboard/i)).toBeDefined();
      });

      // Test close button
      const doneButton = screen.getByText('Done');
      fireEvent.click(doneButton);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('displays graceful fallback when peer has not published keys yet', async () => {
      const aliceKeys = await generateECDHKeyPair();
      vi.spyOn(keyStoreModule, 'getUserPublicKey').mockResolvedValue(aliceKeys.publicKey);
      vi.spyOn(keyExchangeModule, 'fetchPeerPublicKey').mockResolvedValue(null);

      render(
        <SafetyNumberModal
          isOpen={true}
          onClose={vi.fn()}
          contactName="Charlie"
          contactUsername="@charlie"
          myUserId="alice-uuid"
          peerUserId="charlie-uuid"
          peerPublicKey={null}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Charlie hasn't registered an encryption key/i)).toBeDefined();
      });
    });
  });

  describe('3. End-to-End Chat Flow Simulation (Alice -> Bob)', () => {
    it('encrypts on transmitter side, transmits ciphertext, and recovers plaintext on receiver', async () => {
      // 1. Alice setup
      const aliceKeys = await generateECDHKeyPair();
      const alicePubSPKI = await exportPublicKeySPKI(aliceKeys.publicKey);

      // 2. Bob setup
      const bobKeys = await generateECDHKeyPair();
      const bobPubSPKI = await exportPublicKeySPKI(bobKeys.publicKey);

      // 3. Alice derives shared key using Bob's public key
      const aliceImportedBobPub = await importPublicKeySPKI(bobPubSPKI);
      const aliceSharedKey = await deriveSharedAESKey(aliceKeys.privateKey, aliceImportedBobPub);

      // 4. Bob derives shared key using Alice's public key
      const bobImportedAlicePub = await importPublicKeySPKI(alicePubSPKI);
      const bobSharedKey = await deriveSharedAESKey(bobKeys.privateKey, bobImportedAlicePub);

      // 5. Alice writes message and encrypts
      const originalSecret = 'Meet me at 10 PM. Safety code verified! 🔐';
      const encryptedPayload = await encryptMessage(originalSecret, aliceSharedKey);

      // 6. Network transmission payload simulation
      const networkMessage = {
        id: 'msg-live-999',
        chatId: 'direct-alice-bob',
        senderId: 'alice-id',
        content: encryptedPayload.ciphertext,
        isE2EE: true,
        e2eeIv: encryptedPayload.iv,
      };

      // Server / Wire check: Content is encrypted Base64 and not plaintext
      expect(networkMessage.content).not.toBe(originalSecret);
      expect(networkMessage.content.length).toBeGreaterThan(20);
      expect(networkMessage.isE2EE).toBe(true);

      // 7. Bob receives over WebSocket and decrypts locally
      const decryptedByBob = await decryptMessage(
        networkMessage.content,
        networkMessage.e2eeIv,
        bobSharedKey
      );

      // Bob sees plaintext
      expect(decryptedByBob).toBe(originalSecret);
    });
  });
});
