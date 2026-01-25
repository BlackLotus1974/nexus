'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import type { CRMProvider } from '@/lib/crm/types';

interface ConnectCRMModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: CRMProvider;
  providerName: string;
  authType: 'oauth2' | 'api_key';
  onSuccess: () => void;
}

/**
 * Connect CRM Modal
 *
 * Handles OAuth flow or API key entry for connecting a CRM.
 */
export function ConnectCRMModal({
  isOpen,
  onClose,
  provider,
  providerName,
  authType,
  onSuccess,
}: ConnectCRMModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOAuthConnect = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Redirect to OAuth flow
      const redirectUri = `${window.location.origin}/api/crm/oauth/callback`;
      const state = btoa(JSON.stringify({ provider, timestamp: Date.now() }));

      let authUrl: string;

      switch (provider) {
        case 'salesforce':
          authUrl = `https://login.salesforce.com/services/oauth2/authorize?response_type=code&client_id=${process.env.NEXT_PUBLIC_SALESFORCE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
          break;
        case 'hubspot':
          authUrl = `https://app.hubspot.com/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_HUBSPOT_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=crm.objects.contacts.read%20crm.objects.contacts.write%20crm.objects.deals.read&state=${state}`;
          break;
        default:
          throw new Error('OAuth not supported for this provider');
      }

      window.location.href = authUrl;
    } catch (err) {
      setError((err as Error).message);
      setIsLoading(false);
    }
  };

  const handleAPIKeyConnect = async () => {
    if (!apiKey) {
      setError('API key is required');
      return;
    }

    if (provider === 'neonone' && !apiSecret) {
      setError('Organization ID is required for Neon One');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/crm/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          credentials: {
            type: 'api_key',
            apiKey,
            apiSecret: apiSecret || undefined,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to connect');
      }

      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authType === 'oauth2') {
      handleOAuthConnect();
    } else {
      handleAPIKeyConnect();
    }
  };

  const getApiKeyHelp = () => {
    switch (provider) {
      case 'bloomerang':
        return 'Find your API key in Bloomerang under Settings > Integrations > API';
      case 'kindful':
        return 'Get your API token from Kindful under Settings > API';
      case 'neonone':
        return 'Get your API key and Org ID from Neon One under Settings > API';
      default:
        return 'Enter your API credentials';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Connect ${providerName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            {error}
          </Alert>
        )}

        {authType === 'oauth2' ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Click the button below to securely connect your {providerName} account.
              You&apos;ll be redirected to {providerName} to authorize access.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                Permissions requested:
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Read contact/donor information</li>
                <li>• Read donation history</li>
                <li>• Create notes and activities</li>
                <li>• Sync data between systems</li>
              </ul>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Connecting...' : `Connect with ${providerName}`}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {getApiKeyHelp()}
            </p>

            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
                required
              />
            </div>

            {provider === 'neonone' && (
              <div>
                <label htmlFor="apiSecret" className="block text-sm font-medium text-gray-700 mb-1">
                  Organization ID
                </label>
                <Input
                  id="apiSecret"
                  type="text"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="Enter your organization ID"
                  required
                />
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                Your credentials will be encrypted and stored securely.
                Nexus never shares your credentials with third parties.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isLoading}
              >
                {isLoading ? 'Connecting...' : 'Connect'}
              </Button>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
