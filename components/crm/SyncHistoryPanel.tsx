'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { CRMProvider } from '@/lib/crm/types';
import { getCRMDisplayName } from '@/lib/crm/adapters';

interface SyncHistoryIntegration {
  id: string;
  crmType: CRMProvider;
  syncStatus: string | null;
  lastSync?: Date | string | null;
  syncConfig?: { syncFrequencyMinutes?: number } | Record<string, unknown>;
}

interface SyncHistoryPanelProps {
  integrations: SyncHistoryIntegration[];
}

/**
 * Sync History Panel
 *
 * Displays recent sync activity and status across all CRM integrations.
 */
export function SyncHistoryPanel({ integrations }: SyncHistoryPanelProps) {
  const connectedIntegrations = integrations.filter(
    (i) => i.syncStatus === 'connected' || i.syncStatus === 'syncing'
  );

  if (connectedIntegrations.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sync History</h2>
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-2">📊</div>
          <p className="text-gray-500">No CRM integrations connected yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Connect a CRM above to start syncing donor data
          </p>
        </div>
      </Card>
    );
  }

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'Never';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString();
  };

  const getSyncStatusBadge = (status: string | null) => {
    switch (status) {
      case 'connected':
        return <Badge variant="success">Active</Badge>;
      case 'syncing':
        return <Badge variant="warning">Syncing</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Sync Status</h2>

      <div className="space-y-4">
        {connectedIntegrations.map((integration) => (
          <div
            key={integration.id}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                {getProviderIcon(integration.crmType)}
              </div>
              <div>
                <h3 className="font-medium text-gray-900">
                  {getCRMDisplayName(integration.crmType)}
                </h3>
                <p className="text-sm text-gray-500">
                  Last sync: {formatDate(integration.lastSync)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {getSyncStatusBadge(integration.syncStatus)}

              {integration.syncConfig && (
                <div className="text-sm text-gray-500 hidden sm:block">
                  {(() => {
                    const freq = (integration.syncConfig as { syncFrequencyMinutes?: number }).syncFrequencyMinutes;
                    return freq && freq > 0 ? (
                      <span>Auto-sync every {freq}min</span>
                    ) : (
                      <span>Manual sync only</span>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Sync Activity Log */}
      <div className="mt-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Activity</h3>
        <div className="space-y-2">
          {/* Placeholder for activity log - would be populated from activity_log table */}
          <div className="text-sm text-gray-500 py-4 text-center border border-dashed border-gray-200 rounded-lg">
            Activity log will appear here after syncs occur
          </div>
        </div>
      </div>

      {/* Sync Statistics */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">
            {connectedIntegrations.length}
          </div>
          <div className="text-sm text-gray-500">Connected CRMs</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">
            {connectedIntegrations.filter((i) => i.syncStatus === 'connected').length}
          </div>
          <div className="text-sm text-gray-500">Active Syncs</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">
            {connectedIntegrations.filter((i) => i.lastSync).length}
          </div>
          <div className="text-sm text-gray-500">Synced Today</div>
        </div>
      </div>
    </Card>
  );
}

function getProviderIcon(provider: CRMProvider): string {
  const icons: Record<CRMProvider, string> = {
    salesforce: '☁️',
    hubspot: '🟠',
    bloomerang: '🌸',
    kindful: '💚',
    neonone: '🔵',
  };
  return icons[provider] || '📊';
}
