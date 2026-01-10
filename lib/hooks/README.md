# React Query Hooks

This directory contains custom React Query hooks for managing server state with Supabase.

## Available Hooks

### Donor Hooks (`useDonors.ts`)

- `useDonors(organizationId, enabled)` - Fetch all donors
- `useDonor(donorId, organizationId, enabled)` - Fetch single donor
- `useSearchDonors(organizationId, searchQuery, enabled)` - Search donors
- `useCreateDonor()` - Create donor mutation
- `useUpdateDonor()` - Update donor mutation
- `useDeleteDonor()` - Delete donor mutation

### Project Hooks (`useProjects.ts`)

- `useProjects(organizationId, enabled)` - Fetch all projects
- `useProject(projectId, organizationId, enabled)` - Fetch single project
- `useProjectsByStatus(organizationId, status, enabled)` - Fetch projects by status
- `useCreateProject()` - Create project mutation
- `useUpdateProject()` - Update project mutation
- `useDeleteProject()` - Delete project mutation

### Relationship Hooks (`useRelationships.ts`)

- `useDonorRelationships(donorId, organizationId, enabled)` - Fetch donor relationships
- `useRelationships(organizationId, enabled)` - Fetch all relationships
- `useCreateRelationship()` - Create relationship mutation
- `useUpdateRelationship()` - Update relationship mutation
- `useDeleteRelationship()` - Delete relationship mutation

### CRM Integration Hooks (`useCRMIntegrations.ts`)

- `useCRMIntegrations(organizationId, enabled)` - Fetch all integrations
- `useCRMIntegration(integrationId, organizationId, enabled)` - Fetch single integration
- `useCreateCRMIntegration()` - Create integration mutation
- `useUpdateCRMIntegration()` - Update integration mutation
- `useDeleteCRMIntegration()` - Delete integration mutation
- `useTriggerCRMSync()` - Trigger CRM sync with optimistic updates

## Usage Examples

### Fetching Data

```typescript
import { useDonors } from '@/lib/hooks';

function DonorList() {
  const organizationId = 'org-123';
  const { data: donors, isLoading, error } = useDonors(organizationId);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {donors?.map(donor => (
        <li key={donor.id}>{donor.name}</li>
      ))}
    </ul>
  );
}
```

### Creating Data

```typescript
import { useCreateDonor } from '@/lib/hooks';

function CreateDonorForm() {
  const createDonor = useCreateDonor();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createDonor.mutateAsync({
        name: 'Jane Doe',
        location: 'San Francisco, CA',
        organizationId: 'org-123'
      });

      // Success! The donors list will automatically refetch
    } catch (error) {
      console.error('Failed to create donor:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button type="submit" disabled={createDonor.isPending}>
        {createDonor.isPending ? 'Creating...' : 'Create Donor'}
      </button>
    </form>
  );
}
```

### Updating Data

```typescript
import { useUpdateDonor } from '@/lib/hooks';

function EditDonor({ donorId, organizationId }: Props) {
  const updateDonor = useUpdateDonor();

  const handleUpdate = async () => {
    await updateDonor.mutateAsync({
      donorId,
      organizationId,
      updates: {
        name: 'Updated Name',
        location: 'New Location'
      }
    });
  };

  return (
    <button onClick={handleUpdate} disabled={updateDonor.isPending}>
      Update
    </button>
  );
}
```

### Optimistic Updates (CRM Sync Example)

```typescript
import { useTriggerCRMSync } from '@/lib/hooks';

function CRMSyncButton({ integrationId, organizationId }: Props) {
  const triggerSync = useTriggerCRMSync();

  const handleSync = async () => {
    // The UI will optimistically show "syncing" state
    await triggerSync.mutateAsync({ integrationId, organizationId });
  };

  return (
    <button onClick={handleSync} disabled={triggerSync.isPending}>
      {triggerSync.isPending ? 'Syncing...' : 'Sync Now'}
    </button>
  );
}
```

### Conditional Fetching

```typescript
import { useDonor } from '@/lib/hooks';

function DonorDetails({ donorId }: Props) {
  const organizationId = useAppSelector((state) => state.auth.organizationId);

  // Only fetch when both IDs are available
  const { data: donor } = useDonor(
    donorId,
    organizationId || '',
    !!donorId && !!organizationId
  );

  if (!donor) return null;

  return <div>{donor.name}</div>;
}
```

### Search with Debouncing

```typescript
import { useState, useEffect } from 'react';
import { useSearchDonors } from '@/lib/hooks';

function DonorSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const organizationId = 'org-123';

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: donors } = useSearchDonors(
    organizationId,
    debouncedQuery,
    debouncedQuery.length > 2 // Only search if query is 3+ characters
  );

  return (
    <div>
      <input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search donors..."
      />
      <ul>
        {donors?.map(donor => (
          <li key={donor.id}>{donor.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Best Practices

1. **Use enabled parameter** - Control when queries run with the `enabled` parameter
2. **Handle loading states** - Always handle `isLoading` and `error` states
3. **Automatic refetching** - Mutations automatically invalidate related queries
4. **Organization ID filtering** - All queries respect organization boundaries
5. **Optimistic updates** - Use optimistic updates for better UX (see CRM sync example)
6. **Stale time configuration** - Queries have sensible stale times (5 min for most, 2 min for search)

## Cache Configuration

Default cache settings (configured in `lib/react-query/client.ts`):

- **Stale Time**: 5 minutes (data considered fresh)
- **GC Time**: 10 minutes (unused data kept in cache)
- **Retry**: 1 attempt for queries, 0 for mutations
- **Refetch on window focus**: Enabled
- **Refetch on mount**: Only if data is stale

## DevTools

React Query DevTools are available in development mode at the bottom of the screen.
