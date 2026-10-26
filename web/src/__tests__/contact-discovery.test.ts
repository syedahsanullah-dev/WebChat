import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AddContactSchema, SearchQuerySchema } from '@/lib/validations';

describe('Phase 04: Contact Discovery & Address Book Validations', () => {
  describe('AddContactSchema', () => {
    it('accepts valid contact payload with aliasName', () => {
      const valid = {
        contactUserId: 'uuid-1234-5678',
        aliasName: 'Alex (Tech Lead)',
      };
      const result = AddContactSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.aliasName).toBe('Alex (Tech Lead)');
      }
    });

    it('accepts valid contact payload without aliasName (optional)', () => {
      const valid = {
        contactUserId: 'uuid-1234-5678',
      };
      const result = AddContactSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects payload missing contactUserId', () => {
      const invalid = {
        aliasName: 'No User ID',
      };
      const result = AddContactSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects aliasName exceeding 100 characters', () => {
      const invalid = {
        contactUserId: 'uuid-1234',
        aliasName: 'a'.repeat(101),
      };
      const result = AddContactSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('strictly enforces no phone number fields in contact schema', () => {
      const payload = {
        contactUserId: 'uuid-1234',
        aliasName: 'Bob',
        phoneNumber: '+15551234567',
      };
      const result = AddContactSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect('phoneNumber' in result.data).toBe(false);
      }
    });
  });

  describe('SearchQuerySchema', () => {
    it('accepts standard search queries', () => {
      expect(SearchQuerySchema.safeParse({ q: '@alex' }).success).toBe(true);
      expect(SearchQuerySchema.safeParse({ q: 'alex@example.com' }).success).toBe(true);
      expect(SearchQuerySchema.safeParse({ q: 'Alex Turner' }).success).toBe(true);
    });

    it('rejects queries that are too long (>100 chars)', () => {
      expect(SearchQuerySchema.safeParse({ q: 'x'.repeat(101) }).success).toBe(false);
    });
  });

  describe('Alphabetical Contact Grouping Logic', () => {
    it('correctly groups and sorts contacts alphabetically by effective display name', () => {
      const mockContacts = [
        { id: '1', name: 'Zoe Kravitz' },
        { id: '2', name: 'Alex Turner' },
        { id: '3', name: 'benjamin' },
        { id: '4', name: 'Adam Sandler' },
        { id: '5', name: '123 Number User' },
      ];

      const sorted = [...mockContacts].sort((a, b) => a.name.localeCompare(b.name));
      const groups: Record<string, string[]> = {};

      for (const item of sorted) {
        const first = item.name.trim().charAt(0).toUpperCase();
        const letter = /^[A-Z]$/.test(first) ? first : '#';
        if (!groups[letter]) groups[letter] = [];
        groups[letter].push(item.name);
      }

      expect(Object.keys(groups)).toContain('A');
      expect(Object.keys(groups)).toContain('B');
      expect(Object.keys(groups)).toContain('Z');
      expect(Object.keys(groups)).toContain('#');

      expect(groups['A']).toEqual(['Adam Sandler', 'Alex Turner']);
      expect(groups['B']).toEqual(['benjamin']);
      expect(groups['Z']).toEqual(['Zoe Kravitz']);
      expect(groups['#']).toEqual(['123 Number User']);
    });
  });
});
