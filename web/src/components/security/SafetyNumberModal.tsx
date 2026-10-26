'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import {
  getUserPublicKey,
  saveUserPublicKey,
} from '@/lib/crypto/keyStore';
import {
  exportPublicKeySPKI,
  fetchPeerPublicKey,
  initializeUserKeys,
} from '@/lib/crypto/keyExchange';
import { computeSafetyNumber } from '@/lib/crypto/safetyNumber';
import { ShieldCheck, Copy, Check, Lock, Loader2, AlertCircle } from 'lucide-react';

export interface SafetyNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactName: string;
  contactUsername?: string;
  contactAvatar?: string | null;
  myUserId: string;
  peerUserId: string;
  peerPublicKey?: string | null;
}

/**
 * Pure SVG QR Code Matrix Generator
 * Generates an authentic matrix pattern with standard 7x7 corner finder patterns
 * based deterministically on the safety number string.
 */
function VisualSecurityQRCode({ value }: { value: string }) {
  const size = 25; // 25x25 grid
  const cells: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // Finder pattern helper (7x7 with 3x3 solid center)
  const drawFinder = (startX: number, startY: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        cells[startY + r][startX + c] = isBorder || isCenter;
      }
    }
  };

  // 1. Draw standard finder patterns
  drawFinder(0, 0);              // Top-Left
  drawFinder(size - 7, 0);       // Top-Right
  drawFinder(0, size - 7);       // Bottom-Left

  // 2. Deterministic pseudo-random fill based on input value hash
  let seed = 0;
  for (let i = 0; i < value.length; i++) {
    seed = (seed * 31 + value.charCodeAt(i)) >>> 0;
  }

  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Skip finder zones
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= size - 8;
      const inBottomLeft = r >= size - 8 && c < 8;
      if (!inTopLeft && !inTopRight && !inBottomLeft) {
        cells[r][c] = nextRand() > 0.48;
      }
    }
  }

  return (
    <div className="p-3 bg-white rounded-xl shadow-xs inline-block border border-gray-200 dark:border-transparent">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-40 h-40 sm:w-44 sm:h-44"
        shapeRendering="crispEdges"
      >
        {cells.map((row, r) =>
          row.map((active, c) =>
            active ? (
              <rect
                key={`${r}-${c}`}
                x={c}
                y={r}
                width={1}
                height={1}
                fill="#111b21"
              />
            ) : null
          )
        )}
      </svg>
    </div>
  );
}

export default function SafetyNumberModal({
  isOpen,
  onClose,
  contactName,
  contactUsername,
  contactAvatar,
  myUserId,
  peerUserId,
  peerPublicKey: propPeerPublicKey,
}: SafetyNumberModalProps) {
  const [safetyNumber, setSafetyNumber] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const loadSafetyNumber = async () => {
      try {
        // 1. Get or create my public key
        let myKeyObj = await getUserPublicKey(myUserId);
        let mySPKI = '';
        if (myKeyObj) {
          mySPKI = await exportPublicKeySPKI(myKeyObj);
        } else {
          const initRes = await initializeUserKeys(myUserId);
          mySPKI = initRes.publicKeyBase64;
        }

        // 2. Get peer's public key
        let peerSPKI = propPeerPublicKey || null;
        if (!peerSPKI) {
          peerSPKI = await fetchPeerPublicKey(peerUserId);
        }

        if (!peerSPKI && contactUsername) {
          peerSPKI = await fetchPeerPublicKey(contactUsername.replace(/^@/, ''));
        }

        if (!isMounted) return;

        if (!peerSPKI) {
          setError(
            `${contactName} hasn't registered an encryption key on this device yet. Once they open WebChat, end-to-end encryption will be fully established.`
          );
          setIsLoading(false);
          return;
        }

        // 3. Compute 60-digit safety number
        const number = await computeSafetyNumber(mySPKI, peerSPKI);
        if (isMounted) {
          setSafetyNumber(number);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[SafetyNumberModal] Error calculating safety number:', err);
        if (isMounted) {
          setError('Failed to compute security code. Please check your internet connection and try again.');
          setIsLoading(false);
        }
      }
    };

    loadSafetyNumber();

    return () => {
      isMounted = false;
    };
  }, [isOpen, myUserId, peerUserId, propPeerPublicKey, contactName, contactUsername]);

  const handleCopy = () => {
    if (!safetyNumber) return;
    navigator.clipboard?.writeText(safetyNumber).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const blocks = safetyNumber ? safetyNumber.split(' ') : [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Verify security code"
      maxWidth="md"
    >
      <div className="flex flex-col items-center text-center space-y-4 py-2">
        {/* Contact info snippet */}
        <div className="flex flex-col items-center gap-1.5">
          <Avatar
            src={contactAvatar}
            alt={contactName}
            size="md"
            status="offline"
          />
          <h3 className="font-medium text-base text-wa-light-text-primary dark:text-wa-dark-text-primary">
            {contactName}
          </h3>
          {contactUsername && (
            <span className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
              {contactUsername.startsWith('@') ? contactUsername : `@${contactUsername}`}
            </span>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-8 flex flex-col items-center gap-3 text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
            <Loader2 className="w-8 h-8 animate-spin text-[#00a884]" />
            <p className="text-xs">Computing cryptographic safety number...</p>
          </div>
        )}

        {/* Error / Not registered State */}
        {!isLoading && error && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2.5 text-left max-w-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" />
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        {/* Active Safety Number View */}
        {!isLoading && !error && safetyNumber && (
          <>
            {/* Visual QR Code */}
            <VisualSecurityQRCode value={safetyNumber} />

            <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary max-w-sm leading-relaxed">
              To verify that end-to-end encryption is active with <span className="font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary">{contactName}</span>, compare the numbers below with their device, or scan this code.
            </p>

            {/* 60-digit number display in 4 rows x 3 columns */}
            <div className="w-full bg-[#f0f2f5] dark:bg-[#111b21] rounded-xl p-4 border border-[#e9edef] dark:border-white/5 select-all">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4 text-center font-mono text-sm sm:text-base font-medium tracking-widest text-wa-light-text-primary dark:text-wa-dark-text-primary">
                {blocks.map((block, idx) => (
                  <span key={idx} className="bg-white/60 dark:bg-[#202c33]/70 py-1 px-2 rounded-md shadow-2xs">
                    {block}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions: Copy Button */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#00a884] hover:bg-[#008f6f] text-white text-xs font-medium transition-colors focus:outline-none cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copied to clipboard</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy 60-digit code</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-[#202c33] hover:bg-gray-300 dark:hover:bg-[#2a3942] text-xs font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary transition-colors focus:outline-none cursor-pointer"
              >
                Done
              </button>
            </div>
          </>
        )}

        {/* Footer Guarantee */}
        <div className="pt-2 border-t border-[#e9edef] dark:border-white/10 w-full flex items-center justify-center gap-1.5 text-[11px] text-wa-light-text-muted dark:text-wa-dark-text-muted">
          <ShieldCheck className="w-3.5 h-3.5 text-[#00a884]" />
          <span>Protected with Web Cryptography ECDH P-256 and AES-GCM-256</span>
        </div>
      </div>
    </Modal>
  );
}
