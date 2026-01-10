# Nexus UI Components

This directory contains all reusable UI components and layout components for the Nexus Fundraising Intelligence Platform.

## Directory Structure

```
components/
├── ui/                  # Reusable UI primitives
│   ├── Button.tsx       # Button component with variants
│   ├── Card.tsx         # Card container component
│   ├── Input.tsx        # Text input with validation
│   ├── Select.tsx       # Dropdown select component
│   ├── Modal.tsx        # Modal dialog component
│   └── index.ts         # Barrel export file
├── layout/              # Layout components
│   ├── DashboardLayout.tsx  # Main dashboard layout
│   ├── Header.tsx       # Top navigation header
│   ├── Sidebar.tsx      # Side navigation menu
│   └── index.ts         # Barrel export file
└── examples/            # Example components
    └── StateManagementExample.tsx
```

## UI Components

### Button

A versatile button component with multiple variants, sizes, and states.

**Props:**
- `variant`: 'primary' | 'secondary' | 'danger' | 'ghost'
- `size`: 'sm' | 'md' | 'lg'
- `loading`: boolean - Shows loading spinner
- `fullWidth`: boolean - Makes button full width
- `disabled`: boolean - Disables the button

**Usage:**
```tsx
import { Button } from '@/components/ui';

<Button variant="primary" size="md" loading={false}>
  Click me
</Button>
```

### Card

A container component with optional header, body, and footer sections.

**Components:**
- `Card` - Main card container
- `CardHeader` - Header section with bottom border
- `CardBody` - Body content section
- `CardFooter` - Footer section with top border

**Props:**
- `padding`: boolean - Apply default padding (default: true)
- `hover`: boolean - Apply hover effect

**Usage:**
```tsx
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui';

<Card hover>
  <CardHeader>
    <h2>Title</h2>
  </CardHeader>
  <CardBody>
    <p>Content goes here</p>
  </CardBody>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Input

Text input component with label, error states, icons, and helper text.

**Props:**
- `label`: string - Input label
- `error`: string - Error message to display
- `helperText`: string - Helper text below input
- `fullWidth`: boolean - Make input full width
- `leftIcon`: ReactNode - Icon on the left
- `rightIcon`: ReactNode - Icon on the right

**Usage:**
```tsx
import { Input } from '@/components/ui';

<Input
  label="Email"
  type="email"
  placeholder="you@example.com"
  error={errors.email}
  fullWidth
  leftIcon={<EmailIcon />}
/>
```

### Select

Dropdown select component with label and options.

**Props:**
- `label`: string - Select label
- `options`: SelectOption[] - Array of options
- `error`: string - Error message
- `helperText`: string - Helper text
- `fullWidth`: boolean - Make select full width
- `placeholder`: string - Placeholder text

**Usage:**
```tsx
import { Select } from '@/components/ui';

<Select
  label="Organization Type"
  placeholder="Select an option"
  options={[
    { value: 'nonprofit', label: 'Non-profit' },
    { value: 'foundation', label: 'Foundation' }
  ]}
  fullWidth
/>
```

### Modal

Accessible modal dialog with keyboard navigation and focus trapping.

**Props:**
- `isOpen`: boolean - Control modal visibility
- `onClose`: () => void - Close handler
- `title`: string - Modal title
- `size`: 'sm' | 'md' | 'lg' | 'xl'
- `closeOnOverlayClick`: boolean - Close on outside click (default: true)
- `showCloseButton`: boolean - Show X button (default: true)

**Components:**
- `Modal` - Main modal component
- `ModalFooter` - Footer section for action buttons

**Usage:**
```tsx
import { Modal, ModalFooter } from '@/components/ui';

<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Confirm Action"
  size="md"
>
  <p>Are you sure?</p>
  <ModalFooter>
    <Button variant="ghost" onClick={onClose}>Cancel</Button>
    <Button variant="primary" onClick={onConfirm}>Confirm</Button>
  </ModalFooter>
</Modal>
```

## Layout Components

### DashboardLayout

Main layout wrapper for all dashboard pages. Includes sidebar and header.

**Props:**
- `children`: ReactNode - Page content

**Usage:**
```tsx
import { DashboardLayout } from '@/components/layout';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <h1>Dashboard Content</h1>
    </DashboardLayout>
  );
}
```

### Header

Top navigation bar with search, notifications, and user menu.

**Features:**
- Mobile menu toggle
- Search bar
- Notification bell
- User profile dropdown with sign out

**Props:**
- `onMenuClick`: () => void - Mobile menu toggle handler

### Sidebar

Side navigation menu with links and active state.

**Features:**
- Responsive collapsible menu
- Active route highlighting
- Logo and branding
- Help section in footer

**Props:**
- `isOpen`: boolean - Sidebar open state (mobile)
- `onClose`: () => void - Close handler

**Navigation Items:**
- Dashboard
- Donors
- Projects
- CRM
- Settings

## Styling Guidelines

All components use Tailwind CSS with the following conventions:

### Color Palette
- **Primary**: Blue (blue-600, blue-700)
- **Secondary**: Gray (gray-200, gray-700)
- **Danger**: Red (red-600, red-700)
- **Success**: Green (green-600)
- **Warning**: Amber (amber-600)
- **Info**: Purple (purple-600)

### Dark Mode
All components support dark mode using Tailwind's `dark:` variant.

### Spacing Scale
- Small: 1-2 (4-8px)
- Medium: 3-4 (12-16px)
- Large: 6-8 (24-32px)

### Typography
- Headings: font-bold, font-semibold
- Body: font-medium, font-normal
- Small text: text-sm, text-xs

## Accessibility

All components follow WCAG 2.1 AA standards:

- Semantic HTML elements
- ARIA labels and roles
- Keyboard navigation support
- Focus management and visible focus states
- Color contrast compliance
- Screen reader compatibility

## Testing

To test components, visit the UI Demo page:
```
http://localhost:3000/ui-demo
```

This page demonstrates all components with various configurations and states.

## Best Practices

1. **Import from barrel files**: Use `@/components/ui` instead of individual files
2. **TypeScript**: All components are fully typed - use the exported types
3. **Responsive Design**: All components are mobile-first responsive
4. **Accessibility**: Always include labels, ARIA attributes, and semantic HTML
5. **Composition**: Prefer composing small components over large monolithic ones
6. **Client Components**: Use 'use client' directive when needed for interactivity

## Examples

See `/app/ui-demo/page.tsx` for comprehensive examples of all components in use.
