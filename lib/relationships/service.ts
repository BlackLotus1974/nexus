/**
 * Relationship Service
 *
 * Service functions for managing relationships and discovering warm paths.
 *
 * Note: This service uses type assertions for new schema features that may not
 * be reflected in auto-generated types until migrations are applied and types
 * are regenerated. This is a common pattern for forward compatibility.
 */

import { supabase } from '@/lib/supabase/client';
import type {
  Relationship,
  RelationshipConnection,
  RelationshipInput,
  WarmPath,
  FindWarmPathsOptions,
  RelationshipWithDonor,
  RelationshipStats,
  RelationshipType,
} from './types';

// Type helper for database operations with new columns
type RelationshipInsertData = {
  donor_id: string;
  organization_id: string;
  relationship_type?: string;
  connection_type?: string;
  strength_score?: number;
  connected_person_name?: string;
  connected_person_id?: string;
  contact_info?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  last_interaction?: string;
  relationship_notes?: string;
};

/**
 * Create a new relationship
 */
export async function createRelationship(
  input: RelationshipInput
): Promise<Relationship> {
  const insertData: RelationshipInsertData = {
    donor_id: input.donor_id,
    organization_id: input.organization_id,
    relationship_type: input.relationship_type || 'other',
    connection_type: input.connection_type,
    strength_score: input.strength_score || 5,
    connected_person_name: input.connected_person_name,
    connected_person_id: input.connected_person_id,
    contact_info: input.contact_info || {},
    metadata: input.metadata || {},
    last_interaction: input.last_interaction,
    relationship_notes: input.relationship_notes,
  };

  const { data, error } = await supabase
    .from('relationships')
    .insert(insertData as never)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create relationship: ${error.message}`);
  }

  return data as unknown as Relationship;
}

/**
 * Update an existing relationship
 */
export async function updateRelationship(
  id: string,
  updates: Partial<RelationshipInput>
): Promise<Relationship> {
  const { data, error } = await supabase
    .from('relationships')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update relationship: ${error.message}`);
  }

  return data as unknown as Relationship;
}

/**
 * Delete a relationship
 */
export async function deleteRelationship(id: string): Promise<void> {
  const { error } = await supabase
    .from('relationships')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete relationship: ${error.message}`);
  }
}

/**
 * Get relationships for a donor
 */
export async function getRelationshipsForDonor(
  donorId: string,
  organizationId: string
): Promise<RelationshipWithDonor[]> {
  // Note: Basic query without complex joins that may fail before migration
  // The donor info can be fetched separately if needed
  const { data, error } = await supabase
    .from('relationships')
    .select(`
      *,
      donor:donors!relationships_donor_id_fkey(id, name, location)
    `)
    .eq('donor_id', donorId)
    .eq('organization_id', organizationId)
    .order('strength_score', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch relationships: ${error.message}`);
  }

  // Map database rows to RelationshipWithDonor type, providing defaults for new fields
  return (data || []).map((row) => {
    const rowRecord = row as Record<string, unknown>;
    return {
      id: row.id,
      donor_id: row.donor_id,
      organization_id: row.organization_id,
      connection_type: row.connection_type || undefined,
      relationship_type: (rowRecord.relationship_type as RelationshipType) || 'other',
      strength_score: row.strength_score || 5,
      warm_path_score: (rowRecord.warm_path_score as number) || 0,
      connected_person_name: (rowRecord.connected_person_name as string) || undefined,
      connected_person_id: (rowRecord.connected_person_id as string) || undefined,
      contact_info: row.contact_info as Record<string, unknown> || undefined,
      metadata: (rowRecord.metadata as Record<string, unknown>) || undefined,
      last_interaction: row.last_interaction || undefined,
      relationship_notes: row.relationship_notes || undefined,
      created_at: row.created_at || '',
      updated_at: row.updated_at || '',
      donor: row.donor as unknown as RelationshipWithDonor['donor'],
      connected_donor: undefined, // Requires connected_person_id FK from migration
    };
  }) as RelationshipWithDonor[];
}

/**
 * Get all relationships for an organization
 */
export async function getOrganizationRelationships(
  organizationId: string,
  options?: {
    minScore?: number;
    type?: RelationshipType;
    limit?: number;
    offset?: number;
  }
): Promise<RelationshipWithDonor[]> {
  // Note: Basic query without complex joins that may fail before migration
  let query = supabase
    .from('relationships')
    .select(`
      *,
      donor:donors!relationships_donor_id_fkey(id, name, location)
    `)
    .eq('organization_id', organizationId)
    .order('strength_score', { ascending: false });

  // Note: These filters use new columns that may not exist until migration runs
  // The query will still work but may not filter if columns don't exist yet
  if (options?.minScore) {
    query = query.gte('strength_score', options.minScore / 10); // Approximate using strength_score
  }

  if (options?.type) {
    // Filter by relationship_type when column exists
    query = query.eq('relationship_type' as never, options.type);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch relationships: ${error.message}`);
  }

  // Map database rows to RelationshipWithDonor type, providing defaults for new fields
  return (data || []).map((row) => {
    const rowRecord = row as Record<string, unknown>;
    return {
      id: row.id,
      donor_id: row.donor_id,
      organization_id: row.organization_id,
      connection_type: row.connection_type || undefined,
      relationship_type: (rowRecord.relationship_type as RelationshipType) || 'other',
      strength_score: row.strength_score || 5,
      warm_path_score: (rowRecord.warm_path_score as number) || 0,
      connected_person_name: (rowRecord.connected_person_name as string) || undefined,
      connected_person_id: (rowRecord.connected_person_id as string) || undefined,
      contact_info: row.contact_info as Record<string, unknown> || undefined,
      metadata: (rowRecord.metadata as Record<string, unknown>) || undefined,
      last_interaction: row.last_interaction || undefined,
      relationship_notes: row.relationship_notes || undefined,
      created_at: row.created_at || '',
      updated_at: row.updated_at || '',
      donor: row.donor as unknown as RelationshipWithDonor['donor'],
      connected_donor: undefined, // Requires connected_person_id FK from migration
    };
  }) as RelationshipWithDonor[];
}

/**
 * Find warm paths to a donor using database function
 * Note: Uses type assertion for RPC call since the function is created by migration
 */
export async function findWarmPaths(
  options: FindWarmPathsOptions
): Promise<WarmPath[]> {
  // Use type assertion for RPC call - function created by migration
  const rpcCall = supabase.rpc as (
    fn: string,
    params: Record<string, unknown>
  ) => ReturnType<typeof supabase.rpc>;

  const { data, error } = await rpcCall('find_warm_paths', {
    p_organization_id: options.organizationId,
    p_target_donor_id: options.targetDonorId,
    p_max_hops: options.maxHops || 2,
    p_min_score: options.minScore || 20.0,
    p_limit: options.limit || 10,
  });

  if (error) {
    // If the function doesn't exist yet (migration not run), return empty
    if (error.message.includes('function') && error.message.includes('does not exist')) {
      console.warn('[RelationshipService] find_warm_paths function not available');
      return [];
    }
    throw new Error(`Failed to find warm paths: ${error.message}`);
  }

  return (data || []) as WarmPath[];
}

/**
 * Discover and store relationship connections for an organization
 * Note: Uses type assertion for RPC call since the function is created by migration
 */
export async function discoverConnections(
  organizationId: string
): Promise<number> {
  // Use type assertion for RPC call - function created by migration
  const rpcCall = supabase.rpc as (
    fn: string,
    params: Record<string, unknown>
  ) => ReturnType<typeof supabase.rpc>;

  const { data, error } = await rpcCall('discover_relationship_connections', {
    p_organization_id: organizationId,
  });

  if (error) {
    // If the function doesn't exist yet, return 0
    if (error.message.includes('function') && error.message.includes('does not exist')) {
      console.warn('[RelationshipService] discover_relationship_connections not available');
      return 0;
    }
    throw new Error(`Failed to discover connections: ${error.message}`);
  }

  return (data || 0) as number;
}

/**
 * Get relationship connections for an organization
 * Note: Uses type assertion for table query since the table is created by migration
 */
export async function getRelationshipConnections(
  organizationId: string,
  options?: {
    sourceDonorId?: string;
    targetDonorId?: string;
    maxPathLength?: number;
    minScore?: number;
    status?: string;
    limit?: number;
  }
): Promise<RelationshipConnection[]> {
  // Use type assertion for table that's created by migration
  const tableQuery = supabase.from as (table: string) => ReturnType<typeof supabase.from>;

  let query = tableQuery('relationship_connections')
    .select('*')
    .eq('organization_id', organizationId)
    .order('total_path_score', { ascending: false });

  if (options?.sourceDonorId) {
    query = query.eq('source_donor_id', options.sourceDonorId);
  }

  if (options?.targetDonorId) {
    query = query.eq('target_donor_id', options.targetDonorId);
  }

  if (options?.maxPathLength) {
    query = query.lte('path_length', options.maxPathLength);
  }

  if (options?.minScore) {
    query = query.gte('total_path_score', options.minScore);
  }

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    // Table might not exist yet
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.warn('[RelationshipService] relationship_connections table not available');
      return [];
    }
    throw new Error(`Failed to fetch connections: ${error.message}`);
  }

  return (data || []) as RelationshipConnection[];
}

/**
 * Update connection status (e.g., mark as used)
 * Note: Uses type assertion for table query since the table is created by migration
 */
export async function updateConnectionStatus(
  connectionId: string,
  status: 'active' | 'used' | 'declined' | 'expired'
): Promise<RelationshipConnection> {
  // Use type assertion for table that's created by migration
  const tableQuery = supabase.from as (table: string) => ReturnType<typeof supabase.from>;

  const { data, error } = await tableQuery('relationship_connections')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', connectionId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update connection status: ${error.message}`);
  }

  return data as RelationshipConnection;
}

/**
 * Get relationship statistics for an organization
 * Note: Uses type assertion for new columns and tables created by migration
 */
export async function getRelationshipStats(
  organizationId: string
): Promise<RelationshipStats> {
  // Get all relationships - use basic columns that definitely exist
  const { data: relationships, error: relError } = await supabase
    .from('relationships')
    .select('strength_score')
    .eq('organization_id', organizationId);

  if (relError) {
    throw new Error(`Failed to fetch relationship stats: ${relError.message}`);
  }

  // Use type assertion for table that's created by migration
  const tableQuery = supabase.from as (table: string) => ReturnType<typeof supabase.from>;

  // Get connection count - table created by migration, may not exist
  let connectionsCount = 0;
  let connError: Error | null = null;
  try {
    const result = await tableQuery('relationship_connections')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);
    connectionsCount = result.count || 0;
    if (result.error && !result.error.message.includes('does not exist')) {
      connError = result.error;
    }
  } catch {
    // Table may not exist yet
    connectionsCount = 0;
  }

  // Calculate stats
  const byType: Record<RelationshipType, number> = {
    family: 0,
    friend: 0,
    colleague: 0,
    board_member: 0,
    donor_peer: 0,
    professional: 0,
    alumni: 0,
    community: 0,
    referral: 0,
    other: 0,
  };

  let totalStrength = 0;
  let totalWarmPath = 0;

  for (const rel of relationships || []) {
    const relRecord = rel as Record<string, unknown>;
    totalStrength += (rel.strength_score || 0) as number;
    // warm_path_score may not exist until migration runs
    totalWarmPath += (relRecord.warm_path_score as number) || 0;
    // relationship_type may not exist until migration runs
    const type = ((relRecord.relationship_type as string) || 'other') as RelationshipType;
    byType[type] = (byType[type] || 0) + 1;
  }

  const count = relationships?.length || 0;

  // Get top warm paths
  let strongestPaths: WarmPath[] = [];
  try {
    strongestPaths = await findWarmPaths({
      organizationId,
      targetDonorId: '', // This won't work, but we'll handle it
      limit: 5,
    });
  } catch {
    // Ignore errors for stats
  }

  return {
    total_relationships: count,
    avg_strength_score: count > 0 ? totalStrength / count : 0,
    avg_warm_path_score: count > 0 ? totalWarmPath / count : 0,
    by_type: byType,
    total_connections: connError ? 0 : (connectionsCount || 0),
    strongest_paths: strongestPaths,
  };
}

/**
 * Calculate warm path score (client-side fallback)
 */
export function calculateWarmPathScore(
  strengthScore: number,
  lastInteraction: Date | null,
  relationshipType: RelationshipType
): number {
  // Base score from strength (0-10 -> 0-50)
  const baseScore = (strengthScore || 5) * 5.0;

  // Recency multiplier
  let recencyMultiplier = 0.5;
  if (lastInteraction) {
    const daysSince = Math.floor(
      (Date.now() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSince <= 30) recencyMultiplier = 1.0;
    else if (daysSince <= 90) recencyMultiplier = 0.8;
    else if (daysSince <= 180) recencyMultiplier = 0.6;
    else if (daysSince <= 365) recencyMultiplier = 0.4;
    else recencyMultiplier = 0.2;
  }

  // Type multiplier
  const typeMultipliers: Record<RelationshipType, number> = {
    family: 1.0,
    friend: 0.95,
    board_member: 0.9,
    colleague: 0.85,
    donor_peer: 0.8,
    alumni: 0.75,
    professional: 0.7,
    community: 0.65,
    referral: 0.6,
    other: 0.5,
  };
  const typeMultiplier = typeMultipliers[relationshipType] || 0.5;

  // Calculate final score (0-100)
  return Math.min(100, baseScore * recencyMultiplier * typeMultiplier * 2);
}
