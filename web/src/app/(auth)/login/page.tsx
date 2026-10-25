'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LogIn, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/chat';
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim()) {
      setError('Please enter your username or email');
      return;
    }

    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(identifier.trim(), password);
      if (result.success) {
        router.push(callbackUrl);
      } else {
        setError(result.error || 'Invalid credentials');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary">
          Sign In
        </h2>
        <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary mt-1">
          Enter your username or email address to continue
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2.5 text-red-600 dark:text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Identifier Input */}
      <div>
        <label
          htmlFor="identifier"
          className="block text-xs font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary mb-1.5"
        >
          Username or Email
        </label>
        <input
          id="identifier"
          type="text"
          autoComplete="username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="@username or user@example.com"
          className="w-full px-3.5 py-2.5 rounded-lg bg-wa-light-input dark:bg-wa-dark-input border border-wa-light-border dark:border-wa-dark-border text-sm text-wa-light-text-primary dark:text-wa-dark-text-primary placeholder:text-wa-light-text-muted dark:placeholder:text-wa-dark-text-muted focus:outline-none focus:ring-2 focus:ring-wa-green transition-all"
          disabled={isSubmitting}
        />
      </div>

      {/* Password Input */}
      <div>
        <label
          htmlFor="password"
          className="block text-xs font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary mb-1.5"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full px-3.5 py-2.5 pr-10 rounded-lg bg-wa-light-input dark:bg-wa-dark-input border border-wa-light-border dark:border-wa-dark-border text-sm text-wa-light-text-primary dark:text-wa-dark-text-primary placeholder:text-wa-light-text-muted dark:placeholder:text-wa-dark-text-muted focus:outline-none focus:ring-2 focus:ring-wa-green transition-all"
            disabled={isSubmitting}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-wa-light-text-muted dark:text-wa-dark-text-muted hover:text-wa-light-text-primary dark:hover:text-wa-dark-text-primary focus:outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full mt-2 py-2.5 px-4 rounded-lg bg-wa-green hover:bg-wa-green-dark text-white font-medium text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wa-green"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Signing in...</span>
          </>
        ) : (
          <>
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </>
        )}
      </button>

      {/* Switch to Register */}
      <div className="text-center pt-3 border-t border-wa-light-border dark:border-wa-dark-border mt-5">
        <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="text-wa-green hover:underline font-semibold ml-1"
          >
            Create an account
          </Link>
        </p>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-wa-green" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
