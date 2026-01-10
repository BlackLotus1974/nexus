'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUpWithPassword, signInWithOAuth, getAuthErrorMessage } from '@/lib/auth/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardBody } from '@/components/ui/Card';

/**
 * Sign Up Page - User registration with email/password or OAuth
 */

export default function SignUpPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    console.log('[SignUp] Form submitted');
    setError(null);
    setSuccess(false);

    // Validation
    if (!email || !password || !confirmPassword) {
      console.log('[SignUp] Validation failed: missing fields');
      setError('Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      console.log('[SignUp] Validation failed: passwords do not match');
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      console.log('[SignUp] Validation failed: password too short');
      setError('Password must be at least 6 characters');
      return;
    }

    // Trim and normalize email
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedFullName = fullName.trim();

    console.log('[SignUp] Validation passed, attempting signup for:', trimmedEmail);
    setLoading(true);

    try {
      console.log('[SignUp] Calling signUpWithPassword...');
      const { data, error: signUpError } = await signUpWithPassword(trimmedEmail, password, trimmedFullName);
      console.log('[SignUp] signUpWithPassword response:', { data, error: signUpError });

      if (signUpError) {
        console.error('[SignUp] Signup error:', signUpError);
        setError(getAuthErrorMessage(signUpError));
        setLoading(false);
        return;
      }

      if (data.user) {
        console.log('[SignUp] User created:', data.user.id);
        // Check if email confirmation is required
        if (data.user.identities && data.user.identities.length === 0) {
          console.log('[SignUp] Email confirmation required');
          setSuccess(true);
          setError('Please check your email to confirm your account before logging in.');
        } else {
          console.log('[SignUp] Auto-login successful, redirecting to dashboard');
          // Auto-login successful, redirect to dashboard
          router.push('/dashboard');
        }
      }
    } catch (err) {
      console.error('[SignUp] Exception caught:', err);
      setError(getAuthErrorMessage(err as Error));
    } finally {
      setLoading(false);
      console.log('[SignUp] Signup flow complete');
    }
  };

  const handleOAuthSignUp = async (provider: 'google' | 'azure') => {
    console.log('[SignUp] OAuth signup initiated for provider:', provider);
    setError(null);
    const { error: oauthError } = await signInWithOAuth(provider);
    console.log('[SignUp] OAuth response:', { error: oauthError });

    if (oauthError) {
      console.error('[SignUp] OAuth error:', oauthError);
      setError(getAuthErrorMessage(oauthError));
    }
  };

  return (
    <Card>
      <CardBody className="p-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Create your account
        </h2>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200">
              Account created successfully! Please check your email to verify your account.
            </p>
          </div>
        )}

        {/* Sign Up Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            label="Full name (optional)"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            fullWidth
            autoComplete="name"
            disabled={loading}
          />

          <Input
            type="email"
            label="Email address"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            required
            autoComplete="email"
            disabled={loading}
          />

          <Input
            type="password"
            label="Password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            required
            autoComplete="new-password"
            disabled={loading}
            helperText="Must be at least 6 characters"
          />

          <Input
            type="password"
            label="Confirm password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            fullWidth
            required
            autoComplete="new-password"
            disabled={loading}
          />

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={loading}
            disabled={loading || success}
          >
            Create account
          </Button>
        </form>

        {/* OAuth Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              Or continue with
            </span>
          </div>
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-3">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={() => handleOAuthSignUp('google')}
            disabled={loading}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={() => handleOAuthSignUp('azure')}
            disabled={loading}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" />
            </svg>
            Continue with Microsoft
          </Button>
        </div>

        {/* Sign In Link */}
        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Sign in
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
