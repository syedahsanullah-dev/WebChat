import { describe, it, expect } from 'vitest';
import {
  RegisterSchema,
  LoginSchema,
  CheckUsernameSchema,
  ProfileUpdateSchema,
} from '@/lib/validations';

describe('Phase 03 Validation Schemas', () => {
  describe('RegisterSchema', () => {
    it('accepts valid registration input', () => {
      const valid = {
        displayName: 'Alex Turner',
        username: 'alex_turner',
        email: 'alex@example.com',
        password: 'Password123',
      };
      const result = RegisterSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects usernames with spaces or special symbols', () => {
      const invalid = {
        displayName: 'Alex Turner',
        username: 'alex turner!',
        email: 'alex@example.com',
        password: 'Password123',
      };
      const result = RegisterSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects short passwords or passwords without numbers', () => {
      const shortPass = {
        displayName: 'Alex Turner',
        username: 'alex_turner',
        email: 'alex@example.com',
        password: 'pass',
      };
      expect(RegisterSchema.safeParse(shortPass).success).toBe(false);

      const noNumberPass = {
        displayName: 'Alex Turner',
        username: 'alex_turner',
        email: 'alex@example.com',
        password: 'passwordonly',
      };
      expect(RegisterSchema.safeParse(noNumberPass).success).toBe(false);
    });

    it('rejects invalid email formats', () => {
      const invalidEmail = {
        displayName: 'Alex Turner',
        username: 'alex_turner',
        email: 'not-an-email',
        password: 'Password123',
      };
      expect(RegisterSchema.safeParse(invalidEmail).success).toBe(false);
    });

    it('strictly has zero phone number fields', () => {
      // Ensuring phone numbers are not in the schema contract
      const result = RegisterSchema.safeParse({
        displayName: 'Alex Turner',
        username: 'alex_turner',
        email: 'alex@example.com',
        password: 'Password123',
        phoneNumber: '+1234567890',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect('phoneNumber' in result.data).toBe(false);
      }
    });
  });

  describe('LoginSchema', () => {
    it('accepts username identifier', () => {
      const result = LoginSchema.safeParse({
        identifier: 'alex_turner',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('accepts email identifier', () => {
      const result = LoginSchema.safeParse({
        identifier: 'alex@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty credentials', () => {
      expect(LoginSchema.safeParse({ identifier: '', password: '' }).success).toBe(false);
    });
  });

  describe('CheckUsernameSchema', () => {
    it('validates correct username query', () => {
      expect(CheckUsernameSchema.safeParse({ q: 'valid_user12' }).success).toBe(true);
    });

    it('rejects username query shorter than 3 characters or with symbols', () => {
      expect(CheckUsernameSchema.safeParse({ q: 'ab' }).success).toBe(false);
      expect(CheckUsernameSchema.safeParse({ q: 'user@name' }).success).toBe(false);
    });
  });

  describe('ProfileUpdateSchema', () => {
    it('accepts partial display name and about updates', () => {
      expect(ProfileUpdateSchema.safeParse({ displayName: 'New Name' }).success).toBe(true);
      expect(ProfileUpdateSchema.safeParse({ about: 'Busy coding' }).success).toBe(true);
      expect(
        ProfileUpdateSchema.safeParse({ displayName: 'New Name', about: 'Available' }).success
      ).toBe(true);
    });

    it('rejects display name shorter than 2 chars or about > 255 chars', () => {
      expect(ProfileUpdateSchema.safeParse({ displayName: 'A' }).success).toBe(false);
      expect(ProfileUpdateSchema.safeParse({ about: 'a'.repeat(256) }).success).toBe(false);
    });
  });
});
