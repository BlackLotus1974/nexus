# Redux Store

This directory contains the Redux Toolkit store configuration and slices for global state management.

## Structure

```
store/
├── index.ts           # Store configuration
├── hooks.ts           # Typed hooks (useAppDispatch, useAppSelector)
├── provider.tsx       # Redux Provider wrapper component
└── slices/
    ├── authSlice.ts   # Authentication state
    ├── donorSlice.ts  # Donor management state
    ├── projectSlice.ts # Project management state
    └── crmSlice.ts    # CRM integration state
```

## Usage

### Using Redux Hooks

Always use the typed hooks instead of plain `useDispatch` and `useSelector`:

```typescript
import { useAppDispatch, useAppSelector } from '@/store/hooks';

function MyComponent() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  // Dispatch actions
  dispatch(signIn({ email, password }));
}
```

### Auth Slice

Manages user authentication, session, and organization context.

```typescript
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { initializeAuth, signIn, signOut } from '@/store/slices/authSlice';

function AuthExample() {
  const dispatch = useAppDispatch();
  const { user, profile, loading, error } = useAppSelector((state) => state.auth);

  // Initialize auth on mount
  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  // Sign in
  const handleSignIn = async () => {
    await dispatch(signIn({ email: 'user@example.com', password: 'password' }));
  };

  // Sign out
  const handleSignOut = async () => {
    await dispatch(signOut());
  };
}
```

### Donor Slice

Manages donor data, search, and filters.

```typescript
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchDonors,
  createDonor,
  setSelectedDonor
} from '@/store/slices/donorSlice';

function DonorExample() {
  const dispatch = useAppDispatch();
  const { donors, selectedDonor, loading } = useAppSelector((state) => state.donor);
  const organizationId = useAppSelector((state) => state.auth.organizationId);

  // Fetch donors
  useEffect(() => {
    if (organizationId) {
      dispatch(fetchDonors(organizationId));
    }
  }, [organizationId, dispatch]);

  // Create donor
  const handleCreateDonor = async () => {
    await dispatch(createDonor({
      name: 'John Doe',
      location: 'New York, NY',
      organizationId: organizationId!
    }));
  };
}
```

### Project Slice

Manages project data and filters.

```typescript
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchProjects, createProject } from '@/store/slices/projectSlice';

function ProjectExample() {
  const dispatch = useAppDispatch();
  const { projects, loading } = useAppSelector((state) => state.project);
  const organizationId = useAppSelector((state) => state.auth.organizationId);

  // Fetch projects
  useEffect(() => {
    if (organizationId) {
      dispatch(fetchProjects(organizationId));
    }
  }, [organizationId, dispatch]);
}
```

### CRM Slice

Manages CRM integrations and sync status.

```typescript
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchCRMIntegrations,
  triggerCRMSync
} from '@/store/slices/crmSlice';

function CRMExample() {
  const dispatch = useAppDispatch();
  const { integrations, syncStatus } = useAppSelector((state) => state.crm);
  const organizationId = useAppSelector((state) => state.auth.organizationId);

  // Trigger sync
  const handleSync = async (integrationId: string) => {
    await dispatch(triggerCRMSync({ integrationId, organizationId: organizationId! }));
  };
}
```

## Best Practices

1. **Always use typed hooks** - Use `useAppDispatch` and `useAppSelector` instead of plain Redux hooks
2. **Organization ID filtering** - Always filter data by `organizationId` for multi-tenant security
3. **Error handling** - Check `error` state after async actions
4. **Loading states** - Use `loading` state to show loading indicators
5. **Selector memoization** - For complex selectors, use `createSelector` from Reselect

## DevTools

Redux DevTools are enabled in development mode. Install the browser extension to inspect state changes.
