// Core application types based on design.md

export interface Donor {
  id: string;
  organizationId: string;
  name: string;
  location?: string;
  intelligenceData: IntelligenceData;
  lastUpdated: Date;
  createdAt: Date;
}

export interface IntelligenceData {
  background?: string;
  interests?: string[];
  givingHistory?: GivingRecord[];
  connections?: Connection[];
  publicProfile?: PublicProfile;
}

export interface GivingRecord {
  organization: string;
  amount?: number;
  date?: string;
  cause?: string;
}

export interface Connection {
  name: string;
  relationship: string;
  source: 'email' | 'linkedin' | 'public';
}

export interface PublicProfile {
  linkedin?: string;
  twitter?: string;
  website?: string;
  bio?: string;
}

export interface IntelligenceBrief {
  donorId: string;
  summary: string;
  keyInsights: string[];
  givingCapacity: 'high' | 'medium' | 'low';
  preferredCauses: string[];
  connectionPoints: ConnectionPoint[];
  recommendedApproach: string;
  confidence: number; // 0-1 scale
}

export interface ConnectionPoint {
  type: string;
  description: string;
  strength: number;
}

export interface Relationship {
  id: string;
  donorId: string;
  organizationId: string;
  connectionType: 'direct' | 'mutual' | 'linkedin';
  strengthScore: number; // 1-10
  contactInfo: ContactInfo;
  lastInteraction?: Date;
  relationshipNotes?: string;
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  linkedin?: string;
  name?: string;
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  conceptNote?: string;
  fundingGoal?: number;
  status: 'active' | 'completed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface AlignmentAnalysis {
  donorId: string;
  projectId: string;
  alignmentScore: number; // 0-1 scale
  matchingInterests: string[];
  potentialConcerns: string[];
  recommendedTalkingPoints: string[];
  suggestedAskAmount?: number;
}

export interface CRMIntegration {
  id: string;
  organizationId: string;
  crmType: 'salesforce' | 'hubspot' | 'bloomerang' | 'kindful' | 'neonone';
  syncStatus: 'active' | 'paused' | 'error';
  lastSync?: Date;
  syncConfig: Record<string, unknown>;
}

export interface Organization {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Profile {
  id: string;
  organization_id: string | null;
  email: string;
  full_name?: string | null;
  role?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// API Response types
export interface APIResponse<T> {
  data?: T;
  error?: APIError;
}

export interface APIError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

// AI Service types
export interface DonorInput {
  name: string;
  location?: string;
  additionalContext?: string;
}

export interface EngagementContext {
  donor: Donor;
  project?: Project;
  relationshipData?: Relationship[];
}

export interface EngagementPlan {
  type: 'email' | 'intro' | 'event' | 'follow-up';
  timing: string;
  messagingApproach: string;
  draftContent?: string;
  followUpCadence?: string;
}
