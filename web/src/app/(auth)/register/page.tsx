'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { USERNAME_REGEX } from '@/lib/validations';
import {
  UserPlus,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Username availability state
  const [usernameStatus, setUsernameStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle');
  const [usernameMessage, setUsernameMessage] = useState('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounced username checking
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const cleanUsername = username.trim().toLowerCase();

    if (!cleanUsername) {
      setUsernameStatus('idle');
      setUsernameMessage('');
      return;
    }

    if (!USERNAME_REGEX.test(cleanUsername)) {
      setUsernameStatus('invalid');
      setUsernameMessage('3-25 characters, letters, numbers & _ only');
      return;
    }

    setUsernameStatus('checking');
    setUsernameMessage('Checking availability...');

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/auth/check-username?q=${encodeURIComponent(cleanUsername)}`
        );
        const data = await res.json();

        if (res.ok && data.available) {
          setUsernameStatus('available');
          setUsernameMessage(`@${cleanUsername} is available!`);
        } else {
          setUsernameStatus('taken');
          setUsernameMessage(data.message || `@${cleanUsername} is taken`);
        }
      } catch {
        setUsernameStatus('idle');
        setUsernameMessage('');
      }
    }, 350);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validations
    if (displayName.trim().length < 2) {
      setError('Display name must be at least 2 characters long');
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    if (!USERNAME_REGEX.test(cleanUsername)) {
      setError('Username must be 3-25 alphanumeric characters or underscores');
      return;
    }

    if (usernameStatus === 'taken') {
      setError('Please choose an available username');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address');
      return;
    }

    if (password.length < 8 || !/\d/.test(password)) {
      setError('Password must be at least 8 characters and include at least one number');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await register({
        displayName: displayName.trim(),
        username: cleanUsername,
        email: email.trim().toLowerCase(),
        password,
      });

      if (result.success) {
        router.replace('/chat');
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      <div className="text-center mb-5">
        <h2 className="text-xl font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary">
          Create Account
        </h2>
        <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary mt-1">
          Join WebChat with your unique username and email
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2.5 text-red-600 dark:text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Display Name Input */}
      <div>
        <label
          htmlFor="displayName"
          className="block text-xs font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary mb-1"
        >
          Your Full Name
        </label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. Alex Turner"
          className="w-full px-3.5 py-2.5 sm:py-2 rounded-lg bg-wa-light-input dark:bg-wa-dark-input border border-wa-light-border dark:border-wa-dark-border text-base sm:text-sm text-wa-light-text-primary dark:text-wa-dark-text-primary placeholder:text-wa-light-text-muted dark:placeholder:text-wa-dark-text-muted focus:outline-none focus:ring-2 focus:ring-wa-green transition-all"
          disabled={isSubmitting}
        />
      </div>

      {/* Username Input with live check */}
      <div>
        <label
          htmlFor="username"
          className="block text-xs font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary mb-1"
        >
          Unique Username (@handle)
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-wa-light-text-muted dark:text-wa-dark-text-muted font-mono text-sm">
            @
          </span>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="alex_turner"
            className="w-full pl-7 pr-10 py-2.5 sm:py-2 rounded-lg bg-wa-light-input dark:bg-wa-dark-input border border-wa-light-border dark:border-wa-dark-border text-base sm:text-sm font-mono text-wa-light-text-primary dark:text-wa-dark-text-primary placeholder:text-wa-light-text-muted dark:placeholder:text-wa-dark-text-muted focus:outline-none focus:ring-2 focus:ring-wa-green transition-all lowercase"
            disabled={isSubmitting}
          />
          {/* Status Icon */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {usernameStatus === 'checking' && (
              <Loader2 className="w-4 h-4 animate-spin text-wa-light-text-muted" />
            )}
            {usernameStatus === 'available' && (
              <CheckCircle2 className="w-4 h-4 text-wa-green" />
            )}
            {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
          </div>
        </div>
        {usernameMessage && (
          <p
            className={`text-[11px] mt-1 ${
              usernameStatus === 'available'
                ? 'text-wa-green'
                : usernameStatus === 'checking'
                ? 'text-wa-light-text-muted dark:text-wa-dark-text-muted'
                : 'text-red-500'
            }`}
          >
            {usernameMessage}
          </p>
        )}
      </div>

      {/* Email Input */}
      <div>
        <label
          htmlFor="email"
          className="block text-xs font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary mb-1"
        >
          Email Address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="alex@example.com"
          className="w-full px-3.5 py-2.5 sm:py-2 rounded-lg bg-wa-light-input dark:bg-wa-dark-input border border-wa-light-border dark:border-wa-dark-border text-base sm:text-sm text-wa-light-text-primary dark:text-wa-dark-text-primary placeholder:text-wa-light-text-muted dark:placeholder:text-wa-dark-text-muted focus:outline-none focus:ring-2 focus:ring-wa-green transition-all"
          disabled={isSubmitting}
        />
      </div>

      {/* Password Input */}
      <div>
        <label
          htmlFor="password"
          className="block text-xs font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary mb-1"
        >
          Password (min 8 chars with number)
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters with 1 number"
            className="w-full px-3.5 py-2.5 sm:py-2 pr-10 rounded-lg bg-wa-light-input dark:bg-wa-dark-input border border-wa-light-border dark:border-wa-dark-border text-base sm:text-sm text-wa-light-text-primary dark:text-wa-dark-text-primary placeholder:text-wa-light-text-muted dark:placeholder:text-wa-dark-text-muted focus:outline-none focus:ring-2 focus:ring-wa-green transition-all"
            disabled={isSubmitting}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-wa-light-text-muted dark:text-wa-dark-text-muted hover:text-wa-light-text-primary dark:hover:text-wa-dark-text-primary focus:outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting || usernameStatus === 'taken' || usernameStatus === 'checking'}
        className="w-full mt-3 py-2.5 px-4 min-h-[44px] rounded-lg bg-wa-green hover:bg-wa-green-dark text-white font-medium text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wa-green cursor-pointer"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Creating account...</span>
          </>
        ) : (
          <>
            <UserPlus className="w-4 h-4" />
            <span>Create Account</span>
          </>
        )}
      </button>

      {/* Switch to Login */}
      <div className="text-center pt-3 border-t border-wa-light-border dark:border-wa-dark-border mt-4">
        <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-wa-green hover:underline font-semibold ml-1"
          >
            Sign In
          </Link>
        </p>
      </div>
    </form>
  );
}
