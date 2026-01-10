# Donor UI Quick Start Guide

## Getting Started

The donor search and intelligence UI is now fully implemented and ready to use. This guide will help you get started quickly.

## Running the Application

```bash
# Install dependencies (if not already done)
npm install

# Start the development server
npm run dev

# Open your browser to http://localhost:3000
```

## Available Pages

### 1. Main Donors Page
**URL:** `http://localhost:3000/donors`

This is your starting point for donor management:
- Search for new donors
- View all existing donors
- Filter and sort donors
- Toggle between table and grid views

### 2. Donor Detail Page
**URL:** `http://localhost:3000/donors/[id]`

Click any donor from the list to see their full intelligence brief:
- AI-generated insights
- Donation history
- Network connections
- Public profile links

### 3. Demo Page
**URL:** `http://localhost:3000/donors/demo`

Interactive demonstration with sample data:
- See all components in action
- Toggle skeleton loaders
- View component features
- Read integration guidelines

## Quick Usage Examples

### Searching for a Donor

```tsx
import { DonorSearch } from '@/components/donor';

function MyPage() {
  const handleSearch = async (name: string, location?: string) => {
    // Your search logic here
    console.log('Searching for:', name, location);
  };

  return (
    <DonorSearch
      onSearch={handleSearch}
      loading={false}
      recentSearches={['John Doe', 'Jane Smith']}
    />
  );
}
```

### Displaying Intelligence

```tsx
import { IntelligenceBrief } from '@/components/donor';

function DonorDetail({ donor }) {
  const handleExportPDF = () => {
    // PDF export logic
  };

  return (
    <IntelligenceBrief
      donor={donor}
      onExportPDF={handleExportPDF}
    />
  );
}
```

### Listing Donors

```tsx
import { DonorList } from '@/components/donor';

function DonorsPage({ donors }) {
  const handleDonorClick = (donor) => {
    router.push(`/donors/${donor.id}`);
  };

  return (
    <DonorList
      donors={donors}
      onDonorClick={handleDonorClick}
    />
  );
}
```

## Using React Query Hooks

```tsx
import { useDonors, useCreateDonor } from '@/lib/hooks/useDonors';

function MyComponent() {
  const orgId = 'your-org-id';

  // Fetch donors
  const { data: donors, isLoading } = useDonors(orgId);

  // Create donor
  const createDonor = useCreateDonor();

  const handleCreate = async () => {
    const newDonor = await createDonor.mutateAsync({
      name: 'John Doe',
      location: 'New York, NY',
      organizationId: orgId,
    });
    console.log('Created:', newDonor);
  };

  return (
    <div>
      {isLoading ? 'Loading...' : `${donors.length} donors`}
      <button onClick={handleCreate}>Create Donor</button>
    </div>
  );
}
```

## Using Redux State

```tsx
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addToSearchHistory, clearSearchHistory } from '@/store/slices/donorSlice';

function MyComponent() {
  const dispatch = useAppDispatch();
  const { searchHistory } = useAppSelector(state => state.donor);

  const addSearch = (name: string) => {
    dispatch(addToSearchHistory(name));
  };

  const clearHistory = () => {
    dispatch(clearSearchHistory());
  };

  return (
    <div>
      <p>Recent: {searchHistory.join(', ')}</p>
      <button onClick={() => addSearch('New Name')}>Add</button>
      <button onClick={clearHistory}>Clear</button>
    </div>
  );
}
```

## Component Features

### DonorSearch
- ✓ Form validation
- ✓ Loading states
- ✓ Recent searches
- ✓ Icons
- ✓ Responsive

### IntelligenceBrief
- ✓ Collapsible sections
- ✓ Copy to clipboard
- ✓ Export button
- ✓ Empty states
- ✓ Links to profiles

### DonorList
- ✓ Table/grid toggle
- ✓ Sorting
- ✓ Filtering
- ✓ Selection
- ✓ Actions

## Styling

All components use Tailwind CSS classes:

```tsx
// Example: Custom styling
<DonorSearch className="mb-6" />
<IntelligenceBrief className="max-w-4xl mx-auto" />
<DonorList className="mt-8" />
```

## Dark Mode

Dark mode is automatically supported:

```tsx
// No special configuration needed
// Components respond to system preference
// Toggle in your OS settings to test
```

## Loading States

Always show loading skeletons:

```tsx
import { DonorListSkeleton, IntelligenceBriefSkeleton } from '@/components/donor';

function MyPage() {
  const { data, isLoading } = useDonors(orgId);

  return (
    <div>
      {isLoading ? (
        <DonorListSkeleton count={5} />
      ) : (
        <DonorList donors={data} />
      )}
    </div>
  );
}
```

## Error Handling

Use the Alert component for errors:

```tsx
import { Alert } from '@/components/ui/Alert';

function MyPage() {
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      {error && (
        <Alert
          variant="error"
          title="Error"
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}
    </div>
  );
}
```

## Progress Indication

Show progress during AI generation:

```tsx
import { Progress } from '@/components/ui/Progress';

function MyPage() {
  const [progress, setProgress] = useState(0);

  return (
    <Progress
      value={progress}
      showLabel
      label="Generating Intelligence"
    />
  );
}
```

## Common Patterns

### Search with History

```tsx
const [searchHistory, setSearchHistory] = useState<string[]>([]);

const handleSearch = (name: string) => {
  // Add to history
  setSearchHistory(prev => [name, ...prev.slice(0, 4)]);

  // Perform search
  searchForDonor(name);
};

return (
  <DonorSearch
    onSearch={handleSearch}
    recentSearches={searchHistory}
    onRecentSearchClick={(name) => searchForDonor(name)}
    onClearHistory={() => setSearchHistory([])}
  />
);
```

### Navigation

```tsx
import { useRouter } from 'next/navigation';

const router = useRouter();

const handleDonorClick = (donor: Donor) => {
  router.push(`/donors/${donor.id}`);
};
```

### Delete with Confirmation

```tsx
import { Modal } from '@/components/ui/Modal';

const [showDeleteModal, setShowDeleteModal] = useState(false);
const deleteDonor = useDeleteDonor();

const handleDelete = async () => {
  await deleteDonor.mutateAsync({ donorId, organizationId });
  router.push('/donors');
};

return (
  <>
    <Button onClick={() => setShowDeleteModal(true)}>Delete</Button>

    <Modal
      isOpen={showDeleteModal}
      onClose={() => setShowDeleteModal(false)}
      title="Confirm Delete"
    >
      <p>Are you sure?</p>
      <Button onClick={handleDelete}>Yes, Delete</Button>
    </Modal>
  </>
);
```

## TypeScript Tips

All components are fully typed:

```tsx
import type { Donor, IntelligenceData } from '@/types';

// Type-safe function
function processDonor(donor: Donor): void {
  console.log(donor.name); // ✓ Type-safe
  console.log(donor.xyz);  // ✗ TypeScript error
}

// Type-safe component props
interface MyProps {
  donor: Donor;
  onUpdate: (id: string) => void;
}
```

## Performance Tips

1. **Use React Query caching:**
   ```tsx
   const { data } = useDonors(orgId); // Cached automatically
   ```

2. **Memoize expensive operations:**
   ```tsx
   const sortedDonors = useMemo(() =>
     donors.sort((a, b) => a.name.localeCompare(b.name)),
     [donors]
   );
   ```

3. **Show skeletons immediately:**
   ```tsx
   {isLoading && <Skeleton />}
   {data && <Content />}
   ```

## Troubleshooting

### Components not rendering?
- Check that you're importing from the correct path
- Ensure all required props are provided
- Check browser console for errors

### Styles not applying?
- Verify Tailwind is properly configured
- Check that you're using the correct class names
- Ensure dark mode classes are included

### Data not loading?
- Check that organization ID is valid
- Verify Supabase connection is working
- Check React Query DevTools for query status

## Next Steps

1. **Implement AI integration:** Connect to Edge Functions for real intelligence generation
2. **Add PDF export:** Implement actual PDF generation functionality
3. **Add email functionality:** Implement draft email feature
4. **Add relationship mapping:** Implement connection finder
5. **Add project matching:** Implement alignment algorithm

## Resources

- **Component Docs:** `components/donor/README.md`
- **Implementation Summary:** `IMPLEMENTATION_TASK_005.md`
- **Type Definitions:** `types/index.ts`
- **Redux Slice:** `store/slices/donorSlice.ts`
- **React Query Hooks:** `lib/hooks/useDonors.ts`
- **Demo Page:** `http://localhost:3000/donors/demo`

## Support

For questions or issues:
1. Check the component README
2. Review the demo page
3. Check TypeScript errors in your IDE
4. Review the implementation summary

Happy coding! 🚀
