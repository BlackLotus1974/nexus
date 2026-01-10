'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchDonors, createDonor } from '@/store/slices/donorSlice';
import { useDonors, useCreateDonor } from '@/lib/hooks';

/**
 * Example component demonstrating both Redux and React Query usage
 *
 * This shows:
 * 1. Redux for global state (auth, selected donor)
 * 2. React Query for server state (donor list, mutations)
 */
export function StateManagementExample() {
  const dispatch = useAppDispatch();

  // Redux state - global app state
  const { user, organizationId } = useAppSelector((state) => state.auth);
  const { selectedDonor } = useAppSelector((state) => state.donor);

  // React Query - server state with automatic caching/refetching
  const {
    data: donors,
    isLoading,
    error,
    refetch
  } = useDonors(organizationId || '', !!organizationId);

  const createDonorMutation = useCreateDonor();

  // Example: Create a donor using React Query
  const handleCreateDonorQuery = async () => {
    if (!organizationId) return;

    try {
      await createDonorMutation.mutateAsync({
        name: 'John Doe (React Query)',
        location: 'New York, NY',
        organizationId,
      });

      // No need to manually refetch - React Query handles this automatically!
    } catch (error) {
      console.error('Failed to create donor:', error);
    }
  };

  // Example: Create a donor using Redux
  const handleCreateDonorRedux = async () => {
    if (!organizationId) return;

    try {
      await dispatch(createDonor({
        name: 'Jane Doe (Redux)',
        location: 'San Francisco, CA',
        organizationId,
      })).unwrap();

      // Need to manually refetch or rely on Redux state
    } catch (error) {
      console.error('Failed to create donor:', error);
    }
  };

  if (!organizationId) {
    return (
      <div className="p-4 border rounded-lg">
        <p className="text-gray-600">Please sign in to view donors</p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg space-y-4">
      <h2 className="text-xl font-bold">State Management Example</h2>

      {/* Redux State Display */}
      <div className="bg-blue-50 p-3 rounded">
        <h3 className="font-semibold text-blue-900">Redux Global State</h3>
        <p className="text-sm text-blue-700">User: {user?.email || 'Not signed in'}</p>
        <p className="text-sm text-blue-700">Organization: {organizationId}</p>
        <p className="text-sm text-blue-700">
          Selected Donor: {selectedDonor?.name || 'None'}
        </p>
      </div>

      {/* React Query Server State Display */}
      <div className="bg-green-50 p-3 rounded">
        <h3 className="font-semibold text-green-900">React Query Server State</h3>

        {isLoading && <p className="text-sm text-green-700">Loading donors...</p>}

        {error && (
          <p className="text-sm text-red-700">
            Error: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        )}

        {donors && (
          <div>
            <p className="text-sm text-green-700">
              Total Donors: {donors.length}
            </p>
            <ul className="text-sm text-green-700 ml-4 mt-2">
              {donors.slice(0, 5).map((donor) => (
                <li key={donor.id}>• {donor.name}</li>
              ))}
              {donors.length > 5 && (
                <li className="italic">...and {donors.length - 5} more</li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleCreateDonorQuery}
          disabled={createDonorMutation.isPending}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
        >
          {createDonorMutation.isPending
            ? 'Creating...'
            : 'Create Donor (React Query)'}
        </button>

        <button
          onClick={handleCreateDonorRedux}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Create Donor (Redux)
        </button>

        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Refetch
        </button>
      </div>

      {/* Guidelines */}
      <div className="bg-yellow-50 p-3 rounded text-sm">
        <h3 className="font-semibold text-yellow-900 mb-2">When to Use Each:</h3>
        <ul className="space-y-1 text-yellow-800">
          <li>
            <strong>Redux:</strong> Global app state (auth, UI state, selected items)
          </li>
          <li>
            <strong>React Query:</strong> Server state (API data, caching, mutations)
          </li>
        </ul>
      </div>
    </div>
  );
}
