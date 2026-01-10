# Donor Component Architecture

## Component Hierarchy

```
DashboardLayout
├── Sidebar (with Donors link)
├── Header
└── Main Content
    └── Donors Page (/donors)
        ├── DonorSearch
        │   ├── Input (name)
        │   ├── Input (location)
        │   ├── Button (search)
        │   ├── Button (clear)
        │   └── Recent Searches
        │       └── Badge[] (clickable)
        │
        ├── Progress (AI generation)
        │   └── Alert (info/error)
        │
        └── DonorList
            ├── Toolbar
            │   ├── Button (table view)
            │   ├── Button (grid view)
            │   ├── Select (filter)
            │   └── Button (export selected)
            │
            └── Content
                ├── Table View
                │   ├── Checkbox (select all)
                │   ├── Sortable Headers
                │   └── Donor Rows[]
                │       ├── Checkbox
                │       ├── Name
                │       ├── Location
                │       ├── Date
                │       ├── Badge (status)
                │       └── Actions
                │
                └── Grid View
                    └── Card[] (donors)
                        ├── Checkbox
                        ├── Name
                        ├── Location
                        ├── Badge (status)
                        └── Button (view)
```

```
DashboardLayout
├── Sidebar
├── Header
└── Main Content
    └── Donor Detail Page (/donors/[id])
        ├── Navigation
        │   ├── Button (back)
        │   ├── Button (refresh)
        │   └── Button (delete)
        │
        ├── IntelligenceBrief
        │   ├── Header
        │   │   ├── Name
        │   │   ├── Location
        │   │   ├── Timestamp
        │   │   └── Button (export PDF)
        │   │
        │   └── Sections (collapsible)
        │       ├── Overview
        │       │   ├── Text (background)
        │       │   └── CopyButton
        │       │
        │       ├── Cause Interests
        │       │   ├── Badge[] (interests)
        │       │   └── CopyButton
        │       │
        │       ├── Donation History
        │       │   ├── GivingRecord[]
        │       │   │   ├── Organization
        │       │   │   ├── Amount
        │       │   │   ├── Date
        │       │   │   └── Cause
        │       │   └── CopyButton
        │       │
        │       ├── Connections
        │       │   ├── Connection[]
        │       │   │   ├── Name
        │       │   │   ├── Relationship
        │       │   │   └── Badge (source)
        │       │   └── CopyButton
        │       │
        │       └── Public Profile
        │           ├── Bio
        │           ├── Link (LinkedIn)
        │           ├── Link (Twitter)
        │           └── Link (Website)
        │
        ├── Action Buttons
        │   ├── Button (draft email)
        │   ├── Button (find connections)
        │   └── Button (match projects)
        │
        └── Modal (delete confirmation)
            ├── Message
            └── Actions
                ├── Button (cancel)
                └── Button (delete)
```

## Data Flow

```
User Action
    ↓
Component Event Handler
    ↓
    ├→ Redux Dispatch (state updates)
    │   ├→ donorSlice
    │   │   ├→ searchHistory
    │   │   ├→ selectedDonor
    │   │   └→ filterCriteria
    │   └→ localStorage (persistence)
    │
    └→ React Query Mutation/Query
        ├→ useDonors (GET)
        ├→ useDonor (GET)
        ├→ useCreateDonor (POST)
        ├→ useUpdateDonor (PUT)
        └→ useDeleteDonor (DELETE)
            ↓
        Supabase Client
            ↓
        Database
            ↓
        Auto Cache Update
            ↓
        Component Re-render
```

## State Management

### Redux State (store/slices/donorSlice.ts)

```typescript
DonorState {
  donors: Donor[]              // All donors for org
  selectedDonor: Donor | null  // Currently viewing
  searchQuery: string          // Active search
  filterCriteria: {            // List filters
    location?: string
    hasRelationships?: boolean
    lastUpdatedAfter?: Date
  }
  searchHistory: string[]      // Recent searches
  loading: boolean             // Loading state
  error: string | null         // Error message
  lastFetch: number | null     // Cache timestamp
}
```

### React Query Cache

```typescript
QueryCache {
  ['donors', orgId]: Donor[]                    // All donors
  ['donors', orgId, donorId]: Donor            // Single donor
  ['donors', orgId, 'search', query]: Donor[]  // Search results
}
```

### Local Storage

```typescript
localStorage {
  'donorSearchHistory': string[]  // Persisted searches
}
```

## Component Communication

### Parent → Child (Props)

```
DonorsPage
    ├→ DonorSearch
    │   ├─ onSearch: (name, location) => void
    │   ├─ loading: boolean
    │   ├─ recentSearches: string[]
    │   ├─ onRecentSearchClick: (name) => void
    │   └─ onClearHistory: () => void
    │
    └→ DonorList
        ├─ donors: Donor[]
        ├─ onDonorClick: (donor) => void
        ├─ onDeleteDonor?: (id) => void
        └─ loading: boolean
```

### Child → Parent (Events)

```
DonorSearch
    ↑ onSearch(name, location)
    ↑ onRecentSearchClick(name)
    ↑ onClearHistory()

DonorList
    ↑ onDonorClick(donor)
    ↑ onDeleteDonor(donorId)

IntelligenceBrief
    ↑ onExportPDF()
```

### Sibling Communication (via State)

```
DonorSearch → Redux → DonorList
    searchHistory updated

DonorList → Router → DonorDetail
    navigation with donor ID

DonorDetail → React Query → DonorList
    mutation triggers cache update
```

## Loading States Flow

```
Initial Load
    ├→ Show DonorListSkeleton
    ├→ Fetch data (React Query)
    └→ Replace with DonorList

Search Action
    ├→ Show loading spinner on button
    ├→ Show Progress component
    ├→ Create donor (simulated AI)
    ├→ Update progress (0% → 100%)
    └→ Navigate to detail page

Detail View
    ├→ Show IntelligenceBriefSkeleton
    ├→ Fetch donor data
    └→ Replace with IntelligenceBrief

Refresh Intelligence
    ├→ Show loading on refresh button
    ├→ Update donor data
    └→ Re-render brief
```

## Error Handling Flow

```
API Error
    ├→ React Query catches error
    ├→ Set error state
    └→ Display Alert component
        ├→ Error message
        ├→ Retry button (optional)
        └→ Dismiss button

Form Validation Error
    ├→ Client-side validation
    ├→ Set field error state
    └→ Display inline error
        └→ Input component error prop

Network Error
    ├→ Fetch fails
    ├→ React Query retry logic
    └→ Show error after retries
        └→ Alert with network message

404 Error
    ├→ Donor not found
    ├→ Check query result
    └→ Show empty state
        └→ Back button to list
```

## File Structure

```
nexus/
├── app/
│   └── donors/
│       ├── page.tsx                 # Main list page
│       ├── [id]/
│       │   └── page.tsx            # Detail page
│       └── demo/
│           └── page.tsx            # Demo page
│
├── components/
│   ├── donor/
│   │   ├── DonorSearch.tsx         # Search form
│   │   ├── IntelligenceBrief.tsx   # Intelligence display
│   │   ├── DonorList.tsx           # List/grid view
│   │   ├── DonorListSkeleton.tsx   # Loading skeletons
│   │   ├── IntelligenceBriefSkeleton.tsx
│   │   ├── index.ts                # Exports
│   │   └── README.md               # Documentation
│   │
│   ├── ui/
│   │   ├── Badge.tsx               # Status badges
│   │   ├── Skeleton.tsx            # Loading skeleton
│   │   ├── Alert.tsx               # Alerts/errors
│   │   ├── Progress.tsx            # Progress bar
│   │   ├── Button.tsx              # (existing)
│   │   ├── Card.tsx                # (existing)
│   │   ├── Input.tsx               # (existing)
│   │   ├── Modal.tsx               # (existing)
│   │   └── index.ts                # Updated exports
│   │
│   └── layout/
│       ├── DashboardLayout.tsx     # Main layout
│       ├── Sidebar.tsx             # Navigation
│       └── Header.tsx              # Top bar
│
├── lib/
│   └── hooks/
│       └── useDonors.ts            # React Query hooks
│
├── store/
│   └── slices/
│       └── donorSlice.ts           # Redux state
│
├── types/
│   └── index.ts                    # TypeScript types
│
└── docs/
    ├── DONOR_UI_QUICKSTART.md      # Quick start guide
    ├── DONOR_COMPONENT_ARCHITECTURE.md  # This file
    └── IMPLEMENTATION_TASK_005.md  # Implementation summary
```

## Integration Points

### Supabase
```
Components → React Query → Supabase Client → PostgreSQL
                                ↓
                         Row Level Security
                                ↓
                         Organization Filter
```

### Redux
```
Components → Dispatch → donorSlice → State Update → Component Re-render
                            ↓
                      localStorage Sync
```

### Router
```
DonorList → onClick → router.push() → Next.js Router → DonorDetail
                                            ↓
                                      URL Update
                                            ↓
                                   Server Component Load
```

## Performance Optimizations

### React Query Caching
- **staleTime:** 5 minutes for donor queries
- **Auto refetch:** On window focus
- **Optimistic updates:** Immediate UI response
- **Background refetch:** Keep data fresh

### React Optimizations
- **useMemo:** Filtered/sorted donor lists
- **useCallback:** Event handlers
- **Lazy loading:** Code splitting by route
- **Skeleton loaders:** Prevent layout shift

### Network Optimizations
- **Debounced search:** Wait for user input
- **Request deduplication:** React Query
- **Parallel queries:** Multiple data sources
- **Infinite scroll:** Load more donors (planned)

## Accessibility Tree

```
DonorSearch (form)
├── Name Input (required, aria-invalid)
├── Location Input (optional)
├── Search Button (aria-busy during loading)
└── Recent Searches (role="list")
    └── Search Items (role="listitem", clickable)

DonorList (table)
├── Header (columnheader)
├── Body (rowgroup)
│   └── Rows (row)
│       ├── Checkbox (checked state)
│       ├── Name (cell, clickable)
│       └── Actions (menu buttons)
└── Empty State (status message)

IntelligenceBrief (article)
├── Header (heading level 2)
├── Sections (regions)
│   ├── Heading (level 3)
│   ├── Content (expandable/collapsible)
│   └── Copy Button (tooltip)
└── Links (external, target="_blank")
```

## Testing Strategy

### Unit Tests
```
DonorSearch
├── Form validation
├── Input handling
├── Button states
└── Recent searches

IntelligenceBrief
├── Section rendering
├── Collapse/expand
├── Copy functionality
└── Empty states

DonorList
├── Sorting
├── Filtering
├── Selection
└── View toggle
```

### Integration Tests
```
Donor Flow
├── Search → Create
├── Create → View
├── View → Update
├── Update → List
└── List → Delete
```

### E2E Tests
```
User Journey
├── Login
├── Navigate to Donors
├── Search for donor
├── View intelligence
├── Export PDF
└── Return to list
```

## Summary

The donor component architecture is:
- **Modular:** Independent, reusable components
- **Typed:** Full TypeScript coverage
- **Accessible:** WCAG 2.1 compliant
- **Performant:** Optimized rendering and caching
- **Responsive:** Mobile-first design
- **Testable:** Clear separation of concerns
- **Documented:** Comprehensive documentation

This architecture provides a solid foundation for the core donor intelligence feature of the Nexus platform.
