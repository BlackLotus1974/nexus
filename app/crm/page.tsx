'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CRMConnectionCard } from '@/components/crm/CRMConnectionCard';
import { ConnectCRMModal } from '@/components/crm/ConnectCRMModal';
import { SyncHistoryPanel } from '@/components/crm/SyncHistoryPanel';
import { useCRMIntegrations } from '@/lib/hooks/useCRMIntegrations';
import { useAppSelector } from '@/store/hooks';
import type { CRMProvider, CRMConnectionStatus } from '@/lib/crm/types';

/**
 * CRM Integrations Dashboard
 *
 * Allows users to connect, manage, and monitor CRM integrations.
 */
export default function CRMPage() {
  const [selectedProvider, setSelectedProvider] = useState<CRMProvider | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { profile } = useAppSelector((state) => state.auth);
  const organizationId = profile?.organization_id || '';
  const { data: integrations, isLoading, refetch } = useCRMIntegrations(organizationId, !!organizationId);

  const crmProviders: Array<{
    provider: CRMProvider;
    name: string;
    description: string;
    authType: 'oauth2' | 'api_key';
    logo: string;
  }> = [
    {
      provider: 'salesforce',
      name: 'Salesforce',
      description: 'Enterprise CRM with comprehensive donor management',
      authType: 'oauth2',
      logo: '/logos/salesforce.svg',
    },
    {
      provider: 'hubspot',
      name: 'HubSpot',
      description: 'Modern CRM with marketing automation',
      authType: 'oauth2',
      logo: '/logos/hubspot.svg',
    },
    {
      provider: 'bloomerang',
      name: 'Bloomerang',
      description: 'Non-profit focused donor management',
      authType: 'api_key',
      logo: '/logos/bloomerang.svg',
    },
    {
      provider: 'kindful',
      name: 'Kindful',
      description: 'Donor CRM for non-profits',
      authType: 'api_key',
      logo: '/logos/kindful.svg',
    },
    {
      provider: 'neonone',
      name: 'Neon One',
      description: 'Comprehensive non-profit software suite',
      authType: 'api_key',
      logo: '/logos/neonone.svg',
    },
  ];

  const handleConnect = (provider: CRMProvider) => {
    setSelectedProvider(provider);
    setIsModalOpen(true);
  };

  const handleDisconnect = async (provider: CRMProvider) => {
    if (!confirm(`Are you sure you want to disconnect ${provider}? This will remove your stored credentials.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/crm/${provider}/disconnect`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to disconnect');
      }

      await refetch();
    } catch (error) {
      console.error('Disconnect error:', error);
      alert(`Failed to disconnect: ${(error as Error).message}`);
    }
  };

  const handleSync = async (provider: CRMProvider) => {
    try {
      const response = await fetch(`/api/crm/${provider}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          direction: 'bidirectional',
          syncDonors: true,
          syncDonations: true,
          syncInteractions: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Sync failed');
      }

      const result = await response.json();
      console.log('Sync result:', result);
      await refetch();
    } catch (error) {
      console.error('Sync error:', error);
      alert(`Sync failed: ${(error as Error).message}`);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedProvider(null);
  };

  const handleConnectionSuccess = async () => {
    setIsModalOpen(false);
    setSelectedProvider(null);
    await refetch();
  };

  const getIntegration = (provider: CRMProvider) => {
    return integrations?.find((i: { crmType: string }) => i.crmType === provider);
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">CRM Integrations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Connect your CRM to sync donor data and activities with Nexus
          </p>
        </div>

        {/* CRM Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {crmProviders.map((crm) => {
            const integration = getIntegration(crm.provider);
            return (
              <CRMConnectionCard
                key={crm.provider}
                provider={crm.provider}
                name={crm.name}
                description={crm.description}
                authType={crm.authType}
                logo={crm.logo}
                isConnected={!!integration}
                syncStatus={(integration?.syncStatus as CRMConnectionStatus) || undefined}
                lastSync={integration?.lastSync || undefined}
                isLoading={isLoading}
                onConnect={() => handleConnect(crm.provider)}
                onDisconnect={() => handleDisconnect(crm.provider)}
                onSync={() => handleSync(crm.provider)}
              />
            );
          })}
        </div>

        {/* Sync History Panel */}
        <SyncHistoryPanel integrations={integrations || []} />

        {/* Connect Modal */}
        {selectedProvider && (
          <ConnectCRMModal
            isOpen={isModalOpen}
            onClose={handleModalClose}
            provider={selectedProvider}
            providerName={crmProviders.find((c) => c.provider === selectedProvider)?.name || ''}
            authType={crmProviders.find((c) => c.provider === selectedProvider)?.authType || 'oauth2'}
            onSuccess={handleConnectionSuccess}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
