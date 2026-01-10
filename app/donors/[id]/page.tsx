'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { IntelligenceBrief, IntelligenceBriefSkeleton } from '@/components/donor';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { useDonor, useDeleteDonor, useUpdateDonor } from '@/lib/hooks/useDonors';

// Temporary organization ID - in production this would come from auth
const TEMP_ORG_ID = 'temp-org-id';

export default function DonorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const donorId = params.id as string;

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: donor, isLoading, error } = useDonor(donorId, TEMP_ORG_ID);
  const deleteDonor = useDeleteDonor();
  const updateDonor = useUpdateDonor();

  const handleExportPDF = () => {
    // In a real implementation, this would generate a PDF
    alert('PDF export functionality would be implemented here');
  };

  const handleRefreshIntelligence = async () => {
    if (!donor) return;

    setIsRefreshing(true);
    try {
      // In a real implementation, this would call an Edge Function
      // to regenerate intelligence data
      await new Promise((resolve) => setTimeout(resolve, 2000));

      await updateDonor.mutateAsync({
        donorId: donor.id,
        organizationId: TEMP_ORG_ID,
        updates: {
          lastUpdated: new Date(),
        },
      });

      alert('Intelligence refreshed successfully');
    } catch (err) {
      console.error('Failed to refresh intelligence:', err);
      alert('Failed to refresh intelligence');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDonor.mutateAsync({
        donorId,
        organizationId: TEMP_ORG_ID,
      });
      router.push('/donors');
    } catch (err) {
      console.error('Failed to delete donor:', err);
      alert('Failed to delete donor');
    }
  };

  if (error) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <Alert variant="error" title="Error Loading Donor">
            {error instanceof Error ? error.message : 'Failed to load donor'}
          </Alert>
          <div className="mt-4">
            <Button onClick={() => router.push('/donors')}>
              Back to Donors
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/donors')}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Button>
          </div>
          <IntelligenceBriefSkeleton />
        </div>
      </DashboardLayout>
    );
  }

  if (!donor) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <Alert variant="warning" title="Donor Not Found">
            The requested donor could not be found.
          </Alert>
          <div className="mt-4">
            <Button onClick={() => router.push('/donors')}>
              Back to Donors
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push('/donors')}>
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Donors
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={handleRefreshIntelligence}
              loading={isRefreshing}
            >
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Intelligence
            </Button>

            <Button
              variant="danger"
              onClick={() => setShowDeleteModal(true)}
            >
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </Button>
          </div>
        </div>

        {/* Intelligence Brief */}
        <IntelligenceBrief donor={donor} onExportPDF={handleExportPDF} />

        {/* Suggested Actions */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="secondary" fullWidth>
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Draft Email
          </Button>

          <Button variant="secondary" fullWidth>
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Find Connections
          </Button>

          <Button variant="secondary" fullWidth>
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Match Projects
          </Button>
        </div>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Donor"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Are you sure you want to delete <strong>{donor.name}</strong>? This action cannot be undone.
            </p>

            <ModalFooter>
              <Button
                variant="secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                loading={deleteDonor.isPending}
              >
                Delete
              </Button>
            </ModalFooter>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
