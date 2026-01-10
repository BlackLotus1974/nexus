# Donor Components

This directory contains all components related to the AI-powered donor intelligence feature of the Nexus Fundraising Platform.

## Components Overview

### DonorSearch
**Location:** `components/donor/DonorSearch.tsx`

Search form component for initiating AI donor intelligence generation.

**Features:**
- Name input (required, min 2 characters)
- Location input (optional)
- Form validation with error messages
- Loading state with spinner
- Recent search history (last 5 searches)
- Clickable recent searches
- Clear history functionality
- Responsive design

**Props:**
```typescript
interface DonorSearchProps {
  onSearch: (name: string, location?: string) => void;
  loading?: boolean;
  recentSearches?: string[];
  onRecentSearchClick?: (name: string) => void;
  onClearHistory?: () => void;
}
```

**Usage:**
```tsx
<DonorSearch
  onSearch={(name, location) => handleSearch(name, location)}
  loading={isGenerating}
  recentSearches={searchHistory}
  onRecentSearchClick={handleRecentClick}
  onClearHistory={handleClearHistory}
/>
```

---

### IntelligenceBrief
**Location:** `components/donor/IntelligenceBrief.tsx`

Displays AI-generated donor intelligence in a structured, readable format.

**Features:**
- Donor name and location header
- Last updated timestamp
- Export PDF button
- Collapsible sections (default open):
  - Overview (background)
  - Cause Interests (badges)
  - Donation History (timeline)
  - Connections & Network (with source badges)
  - Public Profile & Links
- Copy-to-clipboard for each section
- Empty state handling
- Data source disclaimer
- Responsive design

**Props:**
```typescript
interface IntelligenceBriefProps {
  donor: Donor;
  onExportPDF?: () => void;
  className?: string;
}
```

**Usage:**
```tsx
<IntelligenceBrief
  donor={selectedDonor}
  onExportPDF={() => generatePDF(selectedDonor)}
/>
```

---

### DonorList
**Location:** `components/donor/DonorList.tsx`

Table/grid view of donors with sorting, filtering, and bulk actions.

**Features:**
- Table and grid view modes (toggle)
- Sortable columns (name, location, last updated)
- Status filtering (all, complete, pending, failed)
- Checkbox selection (individual and bulk)
- Status badges (color-coded)
- Row actions (view, delete)
- Empty state message
- Responsive layout
- Hover effects

**Props:**
```typescript
interface DonorListProps {
  donors: Donor[];
  onDonorClick: (donor: Donor) => void;
  onDeleteDonor?: (donorId: string) => void;
  loading?: boolean;
  className?: string;
}
```

**Usage:**
```tsx
<DonorList
  donors={allDonors}
  onDonorClick={(donor) => router.push(`/donors/${donor.id}`)}
  onDeleteDonor={(id) => handleDelete(id)}
  loading={isLoading}
/>
```

---

### DonorListSkeleton
**Location:** `components/donor/DonorListSkeleton.tsx`

Loading skeleton for table view.

**Props:**
```typescript
interface SkeletonProps {
  count?: number; // Number of rows to show (default: 5)
}
```

**Usage:**
```tsx
{isLoading ? <DonorListSkeleton count={8} /> : <DonorList donors={donors} />}
```

---

### DonorGridSkeleton
**Location:** `components/donor/DonorListSkeleton.tsx`

Loading skeleton for grid view.

**Props:**
```typescript
interface SkeletonProps {
  count?: number; // Number of cards to show (default: 6)
}
```

**Usage:**
```tsx
{isLoading ? <DonorGridSkeleton count={9} /> : <DonorList donors={donors} />}
```

---

### IntelligenceBriefSkeleton
**Location:** `components/donor/IntelligenceBriefSkeleton.tsx`

Loading skeleton for intelligence brief.

**Usage:**
```tsx
{isLoading ? <IntelligenceBriefSkeleton /> : <IntelligenceBrief donor={donor} />}
```

---

## Type Definitions

All components use types from `types/index.ts`:

```typescript
interface Donor {
  id: string;
  organizationId: string;
  name: string;
  location?: string;
  intelligenceData: IntelligenceData;
  lastUpdated: Date;
  createdAt: Date;
}

interface IntelligenceData {
  background?: string;
  interests?: string[];
  givingHistory?: GivingRecord[];
  connections?: Connection[];
  publicProfile?: PublicProfile;
}

interface GivingRecord {
  organization: string;
  amount?: number;
  date?: string;
  cause?: string;
}

interface Connection {
  name: string;
  relationship: string;
  source: 'email' | 'linkedin' | 'public';
}

interface PublicProfile {
  linkedin?: string;
  twitter?: string;
  website?: string;
  bio?: string;
}
```

---

## Integration

### Redux Integration

Components integrate with `store/slices/donorSlice.ts`:

```typescript
// Selectors
const { searchHistory, selectedDonor, donors, loading, error } = useAppSelector(state => state.donor);

// Actions
dispatch(addToSearchHistory(donorName));
dispatch(clearSearchHistory());
dispatch(setSelectedDonor(donor));

// Async thunks
dispatch(fetchDonors(organizationId));
dispatch(createDonor({ name, location, organizationId }));
dispatch(updateDonor({ donorId, organizationId, updates }));
dispatch(deleteDonor({ donorId, organizationId }));
```

### React Query Integration

Use custom hooks from `lib/hooks/useDonors.ts`:

```typescript
// Queries
const { data: donors, isLoading, error } = useDonors(organizationId);
const { data: donor } = useDonor(donorId, organizationId);

// Mutations
const createDonor = useCreateDonor();
const updateDonor = useUpdateDonor();
const deleteDonor = useDeleteDonor();

// Usage
await createDonor.mutateAsync({ name, location, organizationId });
await updateDonor.mutateAsync({ donorId, organizationId, updates });
await deleteDonor.mutateAsync({ donorId, organizationId });
```

### Search History Persistence

Search history is persisted to localStorage:

```typescript
// Load on mount
useEffect(() => {
  const history = JSON.parse(localStorage.getItem('donorSearchHistory') || '[]');
  history.forEach(name => dispatch(addToSearchHistory(name)));
}, []);

// Save on change
useEffect(() => {
  localStorage.setItem('donorSearchHistory', JSON.stringify(searchHistory));
}, [searchHistory]);
```

---

## Page Examples

### Main Donors Page
**Location:** `app/donors/page.tsx`

Features:
- DonorSearch component
- Progress indicator during AI generation
- Error handling with Alert component
- DonorList with loading skeletons
- Navigation to donor detail page

### Donor Detail Page
**Location:** `app/donors/[id]/page.tsx`

Features:
- IntelligenceBrief component
- Refresh intelligence button
- Delete donor with confirmation modal
- Action buttons (draft email, find connections, match projects)
- Back navigation

### Demo Page
**Location:** `app/donors/demo/page.tsx`

Interactive demonstration of all components with:
- Sample data
- Toggle for skeleton loaders
- Component feature documentation
- Integration guidelines

---

## Styling

All components use Tailwind CSS with:
- Dark mode support
- Responsive breakpoints (sm, md, lg, xl)
- Consistent spacing from Tailwind scale
- Color scheme matching project design system
- Smooth transitions and animations

---

## Accessibility

Components follow WCAG 2.1 guidelines:
- Semantic HTML elements
- ARIA labels and roles
- Keyboard navigation support
- Focus management
- Screen reader compatibility
- Color contrast compliance (AA level)

---

## Testing

Components should be tested for:
- Form validation (DonorSearch)
- Empty states
- Loading states
- Error handling
- User interactions (click, sort, filter)
- Responsive behavior
- Accessibility compliance

Example test structure:
```typescript
describe('DonorSearch', () => {
  it('validates required name field');
  it('shows recent searches');
  it('handles search submission');
  it('displays loading state');
  it('clears form on reset');
});
```

---

## Future Enhancements

Potential improvements:
- PDF export implementation (IntelligenceBrief)
- Advanced search filters (date range, donation amount)
- Bulk export functionality (DonorList)
- Drag-and-drop column reordering (DonorList)
- Intelligence confidence score visualization
- Real-time intelligence updates via websockets
- Share intelligence brief via email
- Print-optimized layout

---

## Related Files

- `types/index.ts` - Type definitions
- `store/slices/donorSlice.ts` - Redux state management
- `lib/hooks/useDonors.ts` - React Query hooks
- `components/ui/` - Reusable UI components
- `app/donors/page.tsx` - Main donors page
- `app/donors/[id]/page.tsx` - Donor detail page
