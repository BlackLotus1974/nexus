'use client';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import type { CRMProvider, CRMConnectionStatus } from '@/lib/crm/types';

interface CRMConnectionCardProps {
  provider: CRMProvider;
  name: string;
  description: string;
  authType: 'oauth2' | 'api_key';
  logo: string;
  isConnected: boolean;
  syncStatus?: CRMConnectionStatus | null;
  lastSync?: Date | string | null;
  isLoading?: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSync: () => void;
}

/**
 * CRM Connection Card Component
 *
 * Displays a CRM provider with connection status and action buttons.
 */
export function CRMConnectionCard({
  provider,
  name,
  description,
  authType,
  logo,
  isConnected,
  syncStatus,
  lastSync,
  isLoading = false,
  onConnect,
  onDisconnect,
  onSync,
}: CRMConnectionCardProps) {
  const getStatusBadge = () => {
    if (!isConnected) {
      return <Badge variant="secondary">Not Connected</Badge>;
    }

    switch (syncStatus) {
      case 'connected':
        return <Badge variant="success">Connected</Badge>;
      case 'syncing':
        return <Badge variant="warning">Syncing...</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="success">Connected</Badge>;
    }
  };

  const formatLastSync = () => {
    if (!lastSync) return 'Never';
    const date = typeof lastSync === 'string' ? new Date(lastSync) : lastSync;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getProviderIcon = () => {
    // Return a placeholder icon based on provider
    const icons: Record<CRMProvider, string> = {
      salesforce: '☁️',
      hubspot: '🟠',
      bloomerang: '🌸',
      kindful: '💚',
      neonone: '🔵',
    };
    return icons[provider] || '📊';
  };

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
            {getProviderIcon()}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{name}</h3>
            <p className="text-sm text-gray-500 capitalize">
              {authType === 'oauth2' ? 'OAuth 2.0' : 'API Key'}
            </p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      <p className="text-sm text-gray-600 mb-4">{description}</p>

      {isConnected && (
        <div className="text-sm text-gray-500 mb-4">
          <span className="font-medium">Last sync:</span> {formatLastSync()}
        </div>
      )}

      <div className="flex gap-2">
        {!isConnected ? (
          <Button
            onClick={onConnect}
            disabled={isLoading}
            className="flex-1"
          >
            Connect
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={onSync}
              disabled={isLoading || syncStatus === 'syncing'}
              className="flex-1"
            >
              {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
            </Button>
            <Button
              variant="ghost"
              onClick={onDisconnect}
              disabled={isLoading}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Disconnect
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
