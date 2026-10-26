import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateLuhn,
  scanMessageContent,
  PREDEFINED_DLP_RULES,
} from '@/lib/dlpPatterns';

describe('Phase 34: Real-Time Data Loss Prevention (DLP) Regex Scanner', () => {
  describe('1. Pre-Configured Regex Pattern Matching', () => {
    it('detects and blocks AWS Access Key IDs', () => {
      const sensitiveMessage = 'Here are my credentials: AKIAIOSFODNN7EXAMPLE for the dev server';
      const result = scanMessageContent(sensitiveMessage, PREDEFINED_DLP_RULES);

      expect(result.isBlocked).toBe(true);
      expect(result.matchedRule?.id).toBe('dlp-aws-keys');
      expect(result.matchedRule?.category).toBe('CREDENTIALS');
      expect(result.matchedSnippet).toBe('AKIAIOSFODNN7EXAMPLE');
    });

    it('detects and blocks PEM / RSA Private Keys', () => {
      const sensitiveMessage = `
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Yh0...
-----END RSA PRIVATE KEY-----
      `;
      const result = scanMessageContent(sensitiveMessage, PREDEFINED_DLP_RULES);

      expect(result.isBlocked).toBe(true);
      expect(result.matchedRule?.id).toBe('dlp-ssh-private-keys');
      expect(result.matchedRule?.category).toBe('CREDENTIALS');
    });

    it('validates and blocks Credit Cards using Luhn checksum', () => {
      // 4532015112830366 is a valid 16-digit Visa card format passing Luhn
      expect(validateLuhn('4532015112830366')).toBe(true);
      // Altered last digit should fail Luhn
      expect(validateLuhn('4532015112830367')).toBe(false);

      const messageWithValidCard = 'Payment card number: 4532015112830366';
      const result = scanMessageContent(messageWithValidCard, PREDEFINED_DLP_RULES);
      expect(result.isBlocked).toBe(true);
      expect(result.matchedRule?.category).toBe('FINANCIAL');

      // Random 16 digit number that fails Luhn should NOT be blocked
      const messageWithFake16Digits = 'Serial number: 4000000000000001';
      const resultFake = scanMessageContent(messageWithFake16Digits, PREDEFINED_DLP_RULES);
      expect(resultFake.isBlocked).toBe(false);
    });

    it('detects and blocks US Social Security Numbers (SSN)', () => {
      const messageWithSsn = 'Employee tax record SSN is 123-45-6789.';
      const result = scanMessageContent(messageWithSsn, PREDEFINED_DLP_RULES);

      expect(result.isBlocked).toBe(true);
      expect(result.matchedRule?.id).toBe('dlp-us-ssn');
      expect(result.matchedRule?.category).toBe('IDENTITY');
    });

    it('detects generic API key variable assignments', () => {
      const messageWithSecret = 'api_key = "abcdef123456789012345678"';
      const result = scanMessageContent(messageWithSecret, PREDEFINED_DLP_RULES);

      expect(result.isBlocked).toBe(true);
      expect(result.matchedRule?.id).toBe('dlp-secret-keys');
    });

    it('allows benign ordinary chat messages to pass through untouched', () => {
      const benignMessages = [
        'Hey Alice, how was your weekend?',
        'Can we meet at 3:30 PM today?',
        'Check out this link: https://github.com/facebook/react',
        'Order reference #12345678 has been shipped',
        'Here is the phone number: +1 555-0199',
      ];

      for (const msg of benignMessages) {
        const result = scanMessageContent(msg, PREDEFINED_DLP_RULES);
        expect(result.isBlocked).toBe(false);
        expect(result.matchedRule).toBeUndefined();
      }
    });

    it('respects isActive toggle and WARN / LOG action modes', () => {
      const customRules = [
        {
          id: 'custom-disabled',
          name: 'Disabled Key',
          pattern: 'SUPER_SECRET',
          category: 'CUSTOM',
          action: 'BLOCK',
          isActive: false,
        },
        {
          id: 'custom-warn',
          name: 'Warn Key',
          pattern: 'WARN_FLAG',
          category: 'CUSTOM',
          action: 'WARN',
          isActive: true,
        },
      ];

      // Disabled rule should not block
      const result1 = scanMessageContent('My text with SUPER_SECRET', customRules);
      expect(result1.isBlocked).toBe(false);

      // WARN rule matches but isBlocked is false
      const result2 = scanMessageContent('My text with WARN_FLAG', customRules);
      expect(result2.isBlocked).toBe(false);
      expect(result2.matchedRule?.action).toBe('WARN');
    });
  });
});
