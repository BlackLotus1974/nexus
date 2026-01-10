'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { resetPasswordForEmail, getAuthErrorMessage } from '@/lib/auth/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardBody } from '@/components/ui/Card';

/**
 * Forgot Password Page - Password reset request
 */

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await resetPasswordForEmail(email);

      if (resetError) {
        setError(getAuthErrorMessage(resetError));
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError(getAuthErrorMessage(err as Error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardBody className="p-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Reset your password
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200 font-medium mb-1">
              Check your email
            </p>
            <p className="text-sm text-green-800 dark:text-green-200">
              We&apos;ve sent a password reset link to {email}. Click the link in the email to reset your password.
            </p>
          </div>
        )}

        {/* Reset Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            label="Email address"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            required
            autoComplete="email"
            disabled={loading || success}
          />

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={loading}
            disabled={loading || success}
          >
            Send reset link
          </Button>
        </form>

        {/* Back to Login Link */}
        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Back to login
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
