import React from 'react';

/**
 * Auth Layout - Layout for authentication pages (login, signup, forgot password)
 * Provides a centered, card-based layout without dashboard navigation
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">N</span>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Nexus
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Fundraising Intelligence Platform
          </p>
        </div>

        {/* Auth Content */}
        {children}
      </div>
    </div>
  );
}
