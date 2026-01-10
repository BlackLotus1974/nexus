# Quick Start: State Management

This guide helps you quickly get started with state management in Nexus.

## Installation

The dependencies are already installed, but if you need to reinstall:

```bash
npm install
```

This installs:
- `@reduxjs/toolkit` - Redux state management
- `react-redux` - React bindings for Redux
- `@tanstack/react-query` - Server state management
- `@tanstack/react-query-devtools` - DevTools for React Query

## 5-Minute Guide

### 1. Fetch Data from Supabase

Use React Query hooks for all server data:

```typescript
'use client';

import { useDonors } from '@/lib/hooks';
import { useAppSelector } from '@/store/hooks';

export function DonorList() {
  const organizationId = useAppSelector((state) => state.auth.organizationId);

  // Automatic caching, refetching, error handling
  const { data: donors, isLoading, error } = useDonors(organizationId || '');

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {donors?.map((donor) => (
        <li key={donor.id}>{donor.name}</li>
      ))}
    </ul>
  );
}
```

### 2. Create/Update Data

Use mutation hooks for write operations:

```typescript
'use client';

import { useState } from 'react';
import { useCreateDonor } from '@/lib/hooks';
import { useAppSelector } from '@/store/hooks';

export function CreateDonorForm() {
  const [name, setName] = useState('');
  const organizationId = useAppSelector((state) => state.auth.organizationId);
  const createDonor = useCreateDonor();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createDonor.mutateAsync({
        name,
        organizationId: organizationId!,
      });

      setName('');
      // Donors list automatically refetches!
    } catch (error) {
      console.error('Failed to create donor:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Donor name"
      />
      <button type="submit" disabled={createDonor.isPending}>
        {createDonor.isPending ? 'Creating...' : 'Create Donor'}
      </button>
    </form>
  );
}
```

### 3. Access Global State

Use Redux for app-wide state (auth, selected items, UI state):

```typescript
'use client';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSelectedDonor } from '@/store/slices/donorSlice';

export function DonorCard({ donor }: { donor: Donor }) {
  const dispatch = useAppDispatch();
  const selectedDonor = useAppSelector((state) => state.donor.selectedDonor);
  const isSelected = selectedDonor?.id === donor.id;

  return (
    <div
      onClick={() => dispatch(setSelectedDonor(donor))}
      className={isSelected ? 'bg-blue-100' : ''}
    >
      <h3>{donor.name}</h3>
      <p>{donor.location}</p>
    </div>
  );
}
```

### 4. Handle Authentication

Auth state is managed in Redux:

```typescript
'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { initializeAuth, signOut } from '@/store/slices/authSlice';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { user, loading, initialized } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  if (!initialized) return <div>Loading...</div>;

  return <>{children}</>;
}

export function UserProfile() {
  const dispatch = useAppDispatch();
  const { user, profile } = useAppSelector((state) => state.auth);

  if (!user) return <div>Not signed in</div>;

  return (
    <div>
      <p>Welcome, {profile?.fullName || user.email}</p>
      <button onClick={() => dispatch(signOut())}>Sign Out</button>
    </div>
  );
}
```

## Available Hooks

### React Query Hooks (Server State)

**Donors:**
```typescript
import {
  useDonors,              // Fetch all donors
  useDonor,               // Fetch single donor
  useSearchDonors,        // Search donors
  useCreateDonor,         // Create mutation
  useUpdateDonor,         // Update mutation
  useDeleteDonor,         // Delete mutation
} from '@/lib/hooks';
```

**Projects:**
```typescript
import {
  useProjects,            // Fetch all projects
  useProject,             // Fetch single project
  useProjectsByStatus,    // Fetch by status
  useCreateProject,       // Create mutation
  useUpdateProject,       // Update mutation
  useDeleteProject,       // Delete mutation
} from '@/lib/hooks';
```

**Relationships:**
```typescript
import {
  useDonorRelationships,  // Fetch donor relationships
  useRelationships,       // Fetch all relationships
  useCreateRelationship,  // Create mutation
  useUpdateRelationship,  // Update mutation
  useDeleteRelationship,  // Delete mutation
} from '@/lib/hooks';
```

**CRM Integrations:**
```typescript
import {
  useCRMIntegrations,     // Fetch all integrations
  useCRMIntegration,      // Fetch single integration
  useCreateCRMIntegration,// Create mutation
  useUpdateCRMIntegration,// Update mutation
  useDeleteCRMIntegration,// Delete mutation
  useTriggerCRMSync,      // Trigger sync
} from '@/lib/hooks';
```

### Redux Hooks (Global State)

```typescript
import { useAppDispatch, useAppSelector } from '@/store/hooks';

// Always use these instead of plain useDispatch/useSelector
const dispatch = useAppDispatch();
const user = useAppSelector((state) => state.auth.user);
```

## Common Patterns

### Pattern: Search with Debounce

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useSearchDonors } from '@/lib/hooks';

export function DonorSearch() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const organizationId = useAppSelector((state) => state.auth.organizationId);

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: donors } = useSearchDonors(
    organizationId || '',
    debouncedQuery,
    debouncedQuery.length > 2 // Only search if 3+ characters
  );

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search donors..."
      />
      <ul>
        {donors?.map((donor) => (
          <li key={donor.id}>{donor.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Pattern: Conditional Fetching

```typescript
export function DonorDetails({ donorId }: { donorId?: string }) {
  const organizationId = useAppSelector((state) => state.auth.organizationId);

  // Only fetch when both IDs are available
  const { data: donor, isLoading } = useDonor(
    donorId || '',
    organizationId || '',
    !!donorId && !!organizationId
  );

  if (!donorId) return <div>Select a donor</div>;
  if (isLoading) return <div>Loading...</div>;
  if (!donor) return <div>Donor not found</div>;

  return <div>{donor.name}</div>;
}
```

### Pattern: Optimistic Updates

```typescript
export function CRMSyncButton({ integrationId, organizationId }: Props) {
  const triggerSync = useTriggerCRMSync();

  return (
    <button
      onClick={() => triggerSync.mutate({ integrationId, organizationId })}
      disabled={triggerSync.isPending}
    >
      {triggerSync.isPending ? 'Syncing...' : 'Sync Now'}
    </button>
  );
}
```

## When to Use What?

### Use React Query For:
- ✅ Fetching data from Supabase
- ✅ Creating/updating/deleting records
- ✅ Data that changes on the server
- ✅ Lists and collections

### Use Redux For:
- ✅ Current user and authentication
- ✅ Selected donor/project/item
- ✅ Search queries and filters
- ✅ UI state (modals, sidebars)
- ✅ User preferences

### Use Local State For:
- ✅ Form input values
- ✅ Modal open/closed state
- ✅ Component-specific UI state
- ✅ Temporary data

## Debugging

### Redux DevTools

1. Install [Redux DevTools Extension](https://github.com/reduxjs/redux-devtools)
2. Open browser DevTools
3. Navigate to "Redux" tab
4. Inspect actions, state changes, and time-travel

### React Query DevTools

1. Automatically available in development
2. Look for floating icon in bottom-right corner
3. Click to open and inspect:
   - Query cache
   - Active queries
   - Mutation status
   - Background refetches

## Common Issues

### Issue: Data not refetching after mutation

**Solution:** Mutations automatically invalidate related queries. Make sure you're using the mutation hooks from `@/lib/hooks`.

```typescript
// ✅ Correct - automatically refetches
const createDonor = useCreateDonor();
await createDonor.mutateAsync({ name: 'John', organizationId });

// ❌ Wrong - manual refetch needed
const { data, refetch } = useDonors(organizationId);
await supabase.from('donors').insert({ name: 'John' });
await refetch(); // Manual refetch required
```

### Issue: Type errors with useAppSelector

**Solution:** Always use `useAppSelector` from `@/store/hooks`, not `useSelector` from `react-redux`.

```typescript
// ✅ Correct - typed selector
import { useAppSelector } from '@/store/hooks';
const user = useAppSelector((state) => state.auth.user);

// ❌ Wrong - untyped selector
import { useSelector } from 'react-redux';
const user = useSelector((state) => state.auth.user); // Type error
```

### Issue: Queries not running

**Solution:** Check the `enabled` parameter. Queries with `enabled: false` won't run.

```typescript
// Query only runs when organizationId exists
const { data } = useDonors(
  organizationId || '',
  !!organizationId  // enabled parameter
);
```

## Next Steps

1. **Read the full documentation:** `docs/STATE_MANAGEMENT.md`
2. **Review examples:** `components/examples/StateManagementExample.tsx`
3. **Check slice documentation:** `store/README.md` and `lib/hooks/README.md`
4. **Explore DevTools** in your browser

## Need Help?

- **Full Documentation:** See `docs/STATE_MANAGEMENT.md`
- **Redux Slices:** See `store/README.md`
- **React Query Hooks:** See `lib/hooks/README.md`
- **Example Component:** See `components/examples/StateManagementExample.tsx`
