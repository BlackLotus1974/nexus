# State Management Architecture

This document describes the state management architecture for the Nexus Fundraising Intelligence Platform.

## Overview

The application uses a **dual-state management approach**:

1. **Redux Toolkit** - For global application state
2. **React Query** - For server state and API caching

This separation provides optimal performance, developer experience, and follows modern best practices.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    React Components                          │
└────────┬────────────────────────────────────────────┬────────┘
         │                                            │
         ▼                                            ▼
┌─────────────────────┐                    ┌──────────────────────┐
│   Redux Toolkit     │                    │   React Query        │
│  (Global State)     │                    │  (Server State)      │
├─────────────────────┤                    ├──────────────────────┤
│ • Auth State        │                    │ • Donor Queries      │
│ • Selected Items    │                    │ • Project Queries    │
│ • UI State          │                    │ • Relationship Data  │
│ • Search Filters    │                    │ • CRM Integration    │
│ • User Preferences  │                    │ • Activity Logs      │
└─────────────────────┘                    └──────────────────────┘
                                                      │
                                                      ▼
                                           ┌──────────────────────┐
                                           │   Supabase Client    │
                                           └──────────────────────┘
```

## Redux Toolkit (Global State)

### Purpose

Redux manages **global application state** that needs to be:
- Accessible across many components
- Persisted across route changes
- Not directly tied to server data

### What Goes in Redux

✅ **DO store in Redux:**
- Authentication state (user, session, organization)
- Currently selected items (donor, project)
- UI state (sidebar open/closed, theme)
- Search queries and filters
- Form draft data
- Navigation state

❌ **DON'T store in Redux:**
- Server data from API calls (use React Query)
- Data that's only needed in one component (use local state)
- Derived/computed values (use selectors)

### Redux Slices

#### 1. Auth Slice (`store/slices/authSlice.ts`)

**State:**
```typescript
{
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  organizationId: string | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}
```

**Actions:**
- `initializeAuth()` - Load session on app start
- `signIn({ email, password })` - User sign in
- `signOut()` - User sign out
- `updateProfile(updates)` - Update user profile
- `setUser()` - Sync user from auth changes
- `setOrganization()` - Switch organization context

**Usage:**
```typescript
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { initializeAuth, signIn } from '@/store/slices/authSlice';

function MyComponent() {
  const dispatch = useAppDispatch();
  const { user, organizationId, loading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(initializeAuth());
  }, []);

  const handleSignIn = () => {
    dispatch(signIn({ email: 'user@example.com', password: 'pass' }));
  };
}
```

#### 2. Donor Slice (`store/slices/donorSlice.ts`)

**State:**
```typescript
{
  donors: Donor[];
  selectedDonor: Donor | null;
  searchQuery: string;
  filterCriteria: DonorFilterCriteria;
  searchHistory: string[];
  loading: boolean;
  error: string | null;
}
```

**When to Use:**
- Selected donor that persists across routes
- Search query that needs to be remembered
- Filter criteria for donor list
- Search history for autocomplete

#### 3. Project Slice (`store/slices/projectSlice.ts`)

**State:**
```typescript
{
  projects: Project[];
  selectedProject: Project | null;
  filters: ProjectFilters;
  loading: boolean;
  error: string | null;
}
```

#### 4. CRM Slice (`store/slices/crmSlice.ts`)

**State:**
```typescript
{
  integrations: CRMIntegration[];
  selectedIntegration: CRMIntegration | null;
  syncStatus: Record<string, 'idle' | 'syncing' | 'success' | 'error'>;
  loading: boolean;
  error: string | null;
}
```

### Redux Hooks

Always use typed hooks:

```typescript
import { useAppDispatch, useAppSelector } from '@/store/hooks';

// ✅ Correct - typed hooks
const dispatch = useAppDispatch();
const user = useAppSelector((state) => state.auth.user);

// ❌ Wrong - untyped hooks
const dispatch = useDispatch(); // Not type-safe
const user = useSelector((state) => state.auth.user); // No autocomplete
```

## React Query (Server State)

### Purpose

React Query manages **server state** with automatic:
- Caching
- Background refetching
- Optimistic updates
- Request deduplication
- Error retry logic

### What Goes in React Query

✅ **DO use React Query for:**
- All Supabase data fetching
- API requests
- Data that changes on the server
- Lists and collections
- Related data fetching

❌ **DON'T use React Query for:**
- Global UI state (use Redux)
- Form state (use local state or form libraries)
- Static data that never changes

### React Query Hooks

#### Donor Hooks

```typescript
import { useDonors, useCreateDonor } from '@/lib/hooks';

function DonorList() {
  const organizationId = useAppSelector((state) => state.auth.organizationId);

  // Fetch donors - automatically caches, refetches
  const { data: donors, isLoading, error } = useDonors(organizationId || '');

  // Create mutation - automatically invalidates cache
  const createDonor = useCreateDonor();

  const handleCreate = async () => {
    await createDonor.mutateAsync({
      name: 'New Donor',
      organizationId: organizationId!
    });
    // Donors list automatically refetches!
  };
}
```

#### Available Hooks

**Donors:**
- `useDonors(organizationId)`
- `useDonor(donorId, organizationId)`
- `useSearchDonors(organizationId, query)`
- `useCreateDonor()`, `useUpdateDonor()`, `useDeleteDonor()`

**Projects:**
- `useProjects(organizationId)`
- `useProject(projectId, organizationId)`
- `useProjectsByStatus(organizationId, status)`
- `useCreateProject()`, `useUpdateProject()`, `useDeleteProject()`

**Relationships:**
- `useDonorRelationships(donorId, organizationId)`
- `useRelationships(organizationId)`
- `useCreateRelationship()`, `useUpdateRelationship()`, `useDeleteRelationship()`

**CRM Integrations:**
- `useCRMIntegrations(organizationId)`
- `useCRMIntegration(integrationId, organizationId)`
- `useCreateCRMIntegration()`, `useUpdateCRMIntegration()`, `useDeleteCRMIntegration()`
- `useTriggerCRMSync()` - with optimistic updates

### Cache Configuration

Default settings (see `lib/react-query/client.ts`):

```typescript
{
  queries: {
    staleTime: 5 * 60 * 1000,        // 5 minutes
    gcTime: 10 * 60 * 1000,          // 10 minutes
    retry: 1,                         // Retry once on failure
    refetchOnWindowFocus: true,       // Refetch when window regains focus
    refetchOnMount: false,            // Don't refetch if data is fresh
  },
  mutations: {
    retry: 0,                         // Don't retry mutations
  }
}
```

## Decision Guide: Redux vs React Query

### Use Redux When:

1. **Data needs to be globally accessible**
   ```typescript
   // Current user is needed everywhere
   const user = useAppSelector((state) => state.auth.user);
   ```

2. **State persists across route changes**
   ```typescript
   // Selected donor remains selected when navigating
   const selectedDonor = useAppSelector((state) => state.donor.selectedDonor);
   ```

3. **UI state management**
   ```typescript
   // Search query, filters, preferences
   const searchQuery = useAppSelector((state) => state.donor.searchQuery);
   ```

### Use React Query When:

1. **Fetching data from Supabase/APIs**
   ```typescript
   // Automatic caching, refetching, error handling
   const { data: donors } = useDonors(organizationId);
   ```

2. **Data might change on the server**
   ```typescript
   // React Query handles background updates
   const { data: project } = useProject(projectId, organizationId);
   ```

3. **Need automatic cache invalidation**
   ```typescript
   // Mutations automatically refetch related queries
   const createDonor = useCreateDonor();
   await createDonor.mutateAsync(newDonor);
   // Donors list automatically updates!
   ```

## Common Patterns

### Pattern 1: Fetch Data with React Query, Store Selection in Redux

```typescript
function DonorList() {
  const dispatch = useAppDispatch();
  const organizationId = useAppSelector((state) => state.auth.organizationId);
  const selectedDonorId = useAppSelector((state) => state.donor.selectedDonor?.id);

  // Fetch with React Query
  const { data: donors } = useDonors(organizationId || '');

  // Store selection in Redux
  const handleSelectDonor = (donor: Donor) => {
    dispatch(setSelectedDonor(donor));
  };

  return (
    <ul>
      {donors?.map((donor) => (
        <li
          key={donor.id}
          onClick={() => handleSelectDonor(donor)}
          className={donor.id === selectedDonorId ? 'selected' : ''}
        >
          {donor.name}
        </li>
      ))}
    </ul>
  );
}
```

### Pattern 2: Optimistic Updates

```typescript
function CRMSyncButton({ integrationId, organizationId }: Props) {
  const triggerSync = useTriggerCRMSync();

  const handleSync = async () => {
    // UI immediately shows "syncing" state
    await triggerSync.mutateAsync({ integrationId, organizationId });
  };

  return (
    <button onClick={handleSync} disabled={triggerSync.isPending}>
      {triggerSync.isPending ? 'Syncing...' : 'Sync Now'}
    </button>
  );
}
```

### Pattern 3: Conditional Fetching

```typescript
function DonorDetails({ donorId }: Props) {
  const organizationId = useAppSelector((state) => state.auth.organizationId);

  // Only fetch when both IDs are available
  const { data: donor } = useDonor(
    donorId,
    organizationId || '',
    !!donorId && !!organizationId
  );

  if (!donor) return <div>Loading...</div>;

  return <div>{donor.name}</div>;
}
```

### Pattern 4: Search with Debouncing

```typescript
function DonorSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: donors } = useSearchDonors(
    organizationId,
    debouncedQuery,
    debouncedQuery.length > 2
  );

  return (
    <input
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
    />
  );
}
```

## Performance Optimization

### Redux Performance

1. **Use selectors for derived data**
   ```typescript
   // ✅ Good - selector computes derived value
   const activeDonorsCount = useAppSelector((state) =>
     state.donor.donors.filter((d) => d.status === 'active').length
   );
   ```

2. **Memoize complex selectors**
   ```typescript
   import { createSelector } from '@reduxjs/toolkit';

   const selectDonors = (state: RootState) => state.donor.donors;
   const selectActiveDonors = createSelector(
     [selectDonors],
     (donors) => donors.filter((d) => d.status === 'active')
   );
   ```

### React Query Performance

1. **Use appropriate staleTime**
   ```typescript
   // Data changes frequently - short staleTime
   const { data } = useDonors(orgId, { staleTime: 1 * 60 * 1000 }); // 1 min

   // Data rarely changes - long staleTime
   const { data } = useProjects(orgId, { staleTime: 10 * 60 * 1000 }); // 10 min
   ```

2. **Prefetch predictable data**
   ```typescript
   const queryClient = useQueryClient();

   // Prefetch on hover
   const handleMouseEnter = (donorId: string) => {
     queryClient.prefetchQuery({
       queryKey: ['donors', organizationId, donorId],
       queryFn: () => fetchDonor(donorId, organizationId)
     });
   };
   ```

## DevTools

### Redux DevTools

Install the browser extension: [Redux DevTools](https://github.com/reduxjs/redux-devtools)

Features:
- Time-travel debugging
- Action history
- State diff viewer
- State snapshots

### React Query DevTools

Automatically included in development mode (bottom-right corner).

Features:
- Query cache viewer
- Background refetch indicator
- Query invalidation
- Mutation status

## File Structure

```
nexus/
├── store/
│   ├── index.ts              # Redux store configuration
│   ├── hooks.ts              # Typed Redux hooks
│   ├── provider.tsx          # Redux Provider component
│   └── slices/
│       ├── authSlice.ts      # Authentication state
│       ├── donorSlice.ts     # Donor management state
│       ├── projectSlice.ts   # Project management state
│       └── crmSlice.ts       # CRM integration state
│
├── lib/
│   ├── react-query/
│   │   ├── client.ts         # React Query client config
│   │   └── provider.tsx      # React Query Provider
│   │
│   └── hooks/
│       ├── useDonors.ts      # Donor query hooks
│       ├── useProjects.ts    # Project query hooks
│       ├── useRelationships.ts
│       ├── useCRMIntegrations.ts
│       └── index.ts          # Export all hooks
│
└── app/
    └── layout.tsx            # App layout with providers
```

## Security Considerations

All state management respects the multi-tenant architecture:

1. **Organization ID filtering**
   - All queries filter by `organization_id`
   - RLS policies enforced at database level
   - Redux stores current `organizationId`

2. **Authentication state**
   - User session in Redux
   - Auto-refresh handled by Supabase
   - Session timeout detection

3. **Sensitive data**
   - CRM credentials encrypted in database
   - Never stored in Redux store
   - Only transmitted over HTTPS

## Testing

### Testing Redux

```typescript
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';

describe('Auth Slice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: { auth: authReducer }
    });
  });

  it('should handle sign in', async () => {
    await store.dispatch(signIn({ email: 'test@example.com', password: 'pass' }));
    expect(store.getState().auth.user).toBeDefined();
  });
});
```

### Testing React Query Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDonors } from '@/lib/hooks';

describe('useDonors', () => {
  it('should fetch donors', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useDonors('org-123'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});
```

## Migration Guide

If migrating from older patterns:

### From useState to React Query

```typescript
// ❌ Before - manual fetching
const [donors, setDonors] = useState([]);
const [loading, setLoading] = useState(false);

useEffect(() => {
  const fetchDonors = async () => {
    setLoading(true);
    const data = await supabase.from('donors').select();
    setDonors(data);
    setLoading(false);
  };
  fetchDonors();
}, []);

// ✅ After - React Query
const { data: donors, isLoading } = useDonors(organizationId);
```

### From Context to Redux

```typescript
// ❌ Before - Context API
const AuthContext = createContext();

// ✅ After - Redux
const user = useAppSelector((state) => state.auth.user);
```

## Further Reading

- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Supabase Client Documentation](https://supabase.com/docs/reference/javascript)
