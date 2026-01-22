/**
 * Test Fixtures and Factories
 * Provides reusable test data for unit and integration tests
 */

import type { Donor, Project, Profile, IntelligenceData, Relationship } from '@/types';
import { User, Session } from '@supabase/supabase-js';

// ============================================
// Factory Functions
// ============================================

let idCounter = 0;
const generateId = () => `test-id-${++idCounter}`;
const generateUUID = () => `${generateId()}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

/**
 * Create a mock Donor
 */
export function createMockDonor(overrides: Partial<Donor> = {}): Donor {
  const now = new Date();
  return {
    id: generateUUID(),
    organizationId: 'test-org-id',
    name: 'John Doe',
    location: 'New York, NY',
    intelligenceData: createMockIntelligenceData(),
    lastUpdated: now,
    createdAt: now,
    ...overrides,
  };
}

/**
 * Create mock intelligence data
 */
export function createMockIntelligenceData(overrides: Partial<IntelligenceData> = {}): IntelligenceData {
  return {
    background: 'Successful entrepreneur in the tech industry',
    interests: ['technology', 'education', 'healthcare'],
    givingHistory: [
      {
        organization: 'Tech for Good Foundation',
        amount: 50000,
        date: '2023-06-15',
        cause: 'education',
      },
    ],
    connections: [
      {
        name: 'Jane Smith',
        relationship: 'Business Partner',
        source: 'linkedin',
      },
    ],
    publicProfile: {
      linkedin: 'https://linkedin.com/in/johndoe',
      twitter: 'https://twitter.com/johndoe',
      bio: 'Tech entrepreneur and philanthropist',
    },
    ...overrides,
  };
}

/**
 * Create a mock Project
 */
export function createMockProject(overrides: Partial<Project> = {}): Project {
  const now = new Date();
  return {
    id: generateUUID(),
    organizationId: 'test-org-id',
    name: 'Community Education Initiative',
    description: 'A program to provide educational resources to underserved communities',
    conceptNote: 'Detailed concept note explaining the program goals and methodology...',
    fundingGoal: 100000,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create a mock Profile
 */
export function createMockProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: generateUUID(),
    organization_id: 'test-org-id',
    email: 'test@example.com',
    full_name: 'Test User',
    role: 'admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a mock Supabase User
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: generateUUID(),
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    email: 'test@example.com',
    email_confirmed_at: new Date().toISOString(),
    phone: '',
    role: 'authenticated',
    updated_at: new Date().toISOString(),
    ...overrides,
  } as User;
}

/**
 * Create a mock Supabase Session
 */
export function createMockSession(overrides: Partial<Session> = {}): Session {
  const user = createMockUser();
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user,
    ...overrides,
  } as Session;
}

/**
 * Create a mock Relationship
 */
export function createMockRelationship(overrides: Partial<Relationship> = {}): Relationship {
  return {
    id: generateUUID(),
    donorId: generateUUID(),
    organizationId: 'test-org-id',
    connectionType: 'mutual',
    strengthScore: 7,
    contactInfo: {
      name: 'Jane Smith',
      email: 'jane@example.com',
      linkedin: 'https://linkedin.com/in/janesmith',
    },
    lastInteraction: new Date(),
    relationshipNotes: 'Met at annual gala',
    ...overrides,
  };
}

// ============================================
// Predefined Test Data Sets
// ============================================

/**
 * Collection of test donors for list testing
 */
export const testDonors: Donor[] = [
  createMockDonor({
    id: 'donor-1',
    name: 'Alice Johnson',
    location: 'San Francisco, CA',
    intelligenceData: createMockIntelligenceData({
      interests: ['technology', 'women in tech'],
    }),
  }),
  createMockDonor({
    id: 'donor-2',
    name: 'Bob Williams',
    location: 'Boston, MA',
    intelligenceData: createMockIntelligenceData({
      interests: ['healthcare', 'research'],
    }),
  }),
  createMockDonor({
    id: 'donor-3',
    name: 'Carol Martinez',
    location: 'Austin, TX',
    intelligenceData: createMockIntelligenceData({
      interests: ['education', 'arts'],
    }),
  }),
];

/**
 * Collection of test projects
 */
export const testProjects: Project[] = [
  createMockProject({
    id: 'project-1',
    name: 'STEM Education Program',
    description: 'Providing STEM education to K-12 students',
    fundingGoal: 150000,
    status: 'active',
  }),
  createMockProject({
    id: 'project-2',
    name: 'Community Health Initiative',
    description: 'Mobile health clinics for rural areas',
    fundingGoal: 200000,
    status: 'active',
  }),
  createMockProject({
    id: 'project-3',
    name: 'Arts Scholarship Fund',
    description: 'Scholarships for aspiring artists',
    fundingGoal: 75000,
    status: 'completed',
  }),
];

// ============================================
// Mock API Responses
// ============================================

/**
 * Create a mock Supabase query response
 */
export function createMockQueryResponse<T>(data: T, error: { message: string } | null = null) {
  return {
    data,
    error,
    count: Array.isArray(data) ? data.length : 1,
    status: error ? 400 : 200,
    statusText: error ? 'Bad Request' : 'OK',
  };
}

/**
 * Create a mock Edge Function response
 */
export function createMockEdgeFunctionResponse<T>(
  data: T,
  success = true,
  error: string | null = null
) {
  return {
    data: success ? { success: true, data } : { success: false, error },
    error: success ? null : { message: error },
  };
}

// ============================================
// Redux Test Helpers
// ============================================

/**
 * Create initial auth state for testing
 */
export function createAuthState(overrides: Partial<{
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  organizationId: string | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}> = {}) {
  return {
    user: null,
    profile: null,
    session: null,
    organizationId: null,
    loading: false,
    error: null,
    initialized: false,
    ...overrides,
  };
}

/**
 * Create initial donor state for testing
 */
export function createDonorState(overrides: Partial<{
  donors: Donor[];
  selectedDonor: Donor | null;
  searchQuery: string;
  filterCriteria: { location?: string; hasRelationships?: boolean };
  searchHistory: string[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;
}> = {}) {
  return {
    donors: [],
    selectedDonor: null,
    searchQuery: '',
    filterCriteria: {},
    searchHistory: [],
    loading: false,
    error: null,
    lastFetch: null,
    ...overrides,
  };
}

/**
 * Create initial project state for testing
 */
export function createProjectState(overrides: Partial<{
  projects: Project[];
  selectedProject: Project | null;
  loading: boolean;
  error: string | null;
}> = {}) {
  return {
    projects: [],
    selectedProject: null,
    loading: false,
    error: null,
    ...overrides,
  };
}

// ============================================
// Reset Utilities
// ============================================

/**
 * Reset ID counter (useful between tests)
 */
export function resetIdCounter() {
  idCounter = 0;
}
