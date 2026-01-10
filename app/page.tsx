'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import { Button } from '@/components/ui/Button';

export default function Home() {
  const router = useRouter();
  const { user, initialized } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Redirect to dashboard if user is authenticated
    if (initialized && user) {
      router.push('/dashboard');
    }
  }, [initialized, user, router]);

  if (!initialized) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl w-full text-center space-y-8">
        {/* Logo and Brand */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-3xl">N</span>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Nexus
          </h1>
        </div>

        {/* Tagline */}
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Fundraising Intelligence Platform
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            AI-powered donor research, relationship mapping, and personalized engagement for non-profits
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">AI Donor Intelligence</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Comprehensive donor research in under 2 minutes
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Relationship Mapping</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Discover warm connections through your network
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">CRM Integration</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Seamless sync with Salesforce, HubSpot, and more
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex items-center justify-center gap-4 mt-12">
          <Button
            variant="primary"
            size="lg"
            onClick={() => router.push('/signup')}
          >
            Get Started
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => router.push('/login')}
          >
            Sign In
          </Button>
        </div>
      </div>
    </main>
  );
}
