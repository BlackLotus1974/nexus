/**
 * Relationship Types and Interfaces
 *
 * Types for the enhanced relationship mapping system including
 * warm path discovery and multi-hop connections.
 */

// Relationship type enum matching database
export type RelationshipType =
  | 'family'
  | 'friend'
  | 'colleague'
  | 'board_member'
  | 'donor_peer'
  | 'professional'
  | 'alumni'
  | 'community'
  | 'referral'
  | 'other';

// Connection status
export type ConnectionStatus = 'active' | 'used' | 'declined' | 'expired';

// Legacy connection type (from original schema)
export type ConnectionType = 'direct' | 'mutual' | 'linkedin';

/**
 * Enhanced relationship record
 */
export interface Relationship {
  id: string;
  donor_id: string;
  organization_id: string;
  connection_type?: ConnectionType;
  relationship_type: RelationshipType;
  strength_score: number; // 1-10
  warm_path_score: number; // 0-100 (calculated)
  connected_person_name?: string;
  connected_person_id?: string;
  contact_info?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  last_interaction?: string;
  relationship_notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Relationship connection (multi-hop path)
 */
export interface RelationshipConnection {
  id: string;
  organization_id: string;
  source_donor_id: string;
  target_donor_id: string;
  relationship_id?: string;
  path_length: number;
  path_data: PathStep[];
  total_path_score: number;
  confidence_score: number;
  status: ConnectionStatus;
  discovered_at: string;
  last_calculated_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * A single step in a warm path
 */
export interface PathStep {
  from: string;
  via?: string;
  to?: string;
  score: number;
}

/**
 * Warm path result from database function
 */
export interface WarmPath {
  path_id: string;
  intermediary_donor_id?: string;
  intermediary_name: string;
  relationship_type: RelationshipType;
  warm_path_score: number;
  path_length: number;
  path_description: string;
}

/**
 * Input for creating/updating a relationship
 */
export interface RelationshipInput {
  donor_id: string;
  organization_id: string;
  relationship_type?: RelationshipType;
  connection_type?: ConnectionType;
  strength_score?: number;
  connected_person_name?: string;
  connected_person_id?: string;
  contact_info?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  last_interaction?: string;
  relationship_notes?: string;
}

/**
 * Options for finding warm paths
 */
export interface FindWarmPathsOptions {
  organizationId: string;
  targetDonorId: string;
  maxHops?: number;
  minScore?: number;
  limit?: number;
}

/**
 * Relationship with donor details
 */
export interface RelationshipWithDonor extends Relationship {
  donor?: {
    id: string;
    name: string;
    email?: string;
  };
  connected_donor?: {
    id: string;
    name: string;
    email?: string;
  };
}

/**
 * Statistics for relationship network
 */
export interface RelationshipStats {
  total_relationships: number;
  avg_strength_score: number;
  avg_warm_path_score: number;
  by_type: Record<RelationshipType, number>;
  total_connections: number;
  strongest_paths: WarmPath[];
}
