-- Migration: Relationship Database Schema Enhancements
-- Task 8: Enhance Relationship Database Schema
--
-- This migration adds:
-- 1. relationship_type enum for categorizing relationships
-- 2. relationship_connections table for indirect/multi-hop connections
-- 3. warm_path_score field for relationship strength scoring
-- 4. Database functions for path finding queries

-- ============================================================================
-- 1. Create relationship_type enum
-- ============================================================================

CREATE TYPE relationship_type AS ENUM (
    'family',           -- Family members
    'friend',           -- Personal friends
    'colleague',        -- Work colleagues
    'board_member',     -- Board member connections
    'donor_peer',       -- Fellow donors
    'professional',     -- Professional network
    'alumni',           -- School/university alumni
    'community',        -- Community organization connections
    'referral',         -- Referred by someone
    'other'             -- Other types
);

-- ============================================================================
-- 2. Alter relationships table to add new fields
-- ============================================================================

-- Add relationship_type column
ALTER TABLE relationships
ADD COLUMN IF NOT EXISTS relationship_type relationship_type DEFAULT 'other';

-- Add warm_path_score (calculated score based on relationship strength and recency)
ALTER TABLE relationships
ADD COLUMN IF NOT EXISTS warm_path_score DECIMAL(5, 2) DEFAULT 0.0
    CHECK (warm_path_score >= 0 AND warm_path_score <= 100);

-- Add connected_person_name (the intermediary person's name)
ALTER TABLE relationships
ADD COLUMN IF NOT EXISTS connected_person_name TEXT;

-- Add connected_person_id (if the connected person is also a donor in system)
ALTER TABLE relationships
ADD COLUMN IF NOT EXISTS connected_person_id UUID REFERENCES donors(id) ON DELETE SET NULL;

-- Add relationship metadata as JSONB for flexible storage
ALTER TABLE relationships
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- ============================================================================
-- 3. Create relationship_connections table for indirect connections
-- ============================================================================

CREATE TABLE IF NOT EXISTS relationship_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    -- Source donor (the prospect we want to reach)
    source_donor_id UUID REFERENCES donors(id) ON DELETE CASCADE NOT NULL,

    -- Target donor (the person who can make the introduction)
    target_donor_id UUID REFERENCES donors(id) ON DELETE CASCADE NOT NULL,

    -- The relationship that connects them
    relationship_id UUID REFERENCES relationships(id) ON DELETE CASCADE,

    -- Path information
    path_length INTEGER NOT NULL DEFAULT 1,  -- Number of hops
    path_data JSONB DEFAULT '[]',            -- Array of intermediate connections

    -- Scoring
    total_path_score DECIMAL(5, 2) DEFAULT 0.0,  -- Combined warm path score
    confidence_score DECIMAL(3, 2) DEFAULT 0.0 CHECK (confidence_score >= 0 AND confidence_score <= 1),

    -- Status and metadata
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'declined', 'expired')),
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Standard timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Prevent duplicate connections
    UNIQUE(organization_id, source_donor_id, target_donor_id)
);

-- ============================================================================
-- 4. Create indexes for performance
-- ============================================================================

-- Indexes for relationships table new columns
CREATE INDEX IF NOT EXISTS idx_relationships_type ON relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_relationships_warm_path_score ON relationships(warm_path_score DESC);
CREATE INDEX IF NOT EXISTS idx_relationships_connected_person ON relationships(connected_person_id);

-- Indexes for relationship_connections table
CREATE INDEX IF NOT EXISTS idx_rel_connections_org ON relationship_connections(organization_id);
CREATE INDEX IF NOT EXISTS idx_rel_connections_source ON relationship_connections(source_donor_id);
CREATE INDEX IF NOT EXISTS idx_rel_connections_target ON relationship_connections(target_donor_id);
CREATE INDEX IF NOT EXISTS idx_rel_connections_score ON relationship_connections(total_path_score DESC);
CREATE INDEX IF NOT EXISTS idx_rel_connections_path_length ON relationship_connections(path_length);

-- ============================================================================
-- 5. Enable RLS on relationship_connections
-- ============================================================================

ALTER TABLE relationship_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for relationship_connections
CREATE POLICY "Users can view relationship connections in their organization"
    ON relationship_connections FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can manage relationship connections in their organization"
    ON relationship_connections FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

-- ============================================================================
-- 6. Create function to calculate warm path score
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_warm_path_score(
    p_strength_score INTEGER,
    p_last_interaction TIMESTAMP WITH TIME ZONE,
    p_relationship_type relationship_type
) RETURNS DECIMAL(5, 2) AS $$
DECLARE
    base_score DECIMAL(5, 2);
    recency_multiplier DECIMAL(3, 2);
    type_multiplier DECIMAL(3, 2);
    days_since_interaction INTEGER;
BEGIN
    -- Base score from strength (0-10 -> 0-50)
    base_score := COALESCE(p_strength_score, 5) * 5.0;

    -- Recency multiplier (more recent = higher score)
    IF p_last_interaction IS NULL THEN
        recency_multiplier := 0.5;
    ELSE
        days_since_interaction := EXTRACT(DAY FROM NOW() - p_last_interaction);
        IF days_since_interaction <= 30 THEN
            recency_multiplier := 1.0;
        ELSIF days_since_interaction <= 90 THEN
            recency_multiplier := 0.8;
        ELSIF days_since_interaction <= 180 THEN
            recency_multiplier := 0.6;
        ELSIF days_since_interaction <= 365 THEN
            recency_multiplier := 0.4;
        ELSE
            recency_multiplier := 0.2;
        END IF;
    END IF;

    -- Type multiplier (closer relationships = higher score)
    CASE p_relationship_type
        WHEN 'family' THEN type_multiplier := 1.0;
        WHEN 'friend' THEN type_multiplier := 0.95;
        WHEN 'board_member' THEN type_multiplier := 0.9;
        WHEN 'colleague' THEN type_multiplier := 0.85;
        WHEN 'donor_peer' THEN type_multiplier := 0.8;
        WHEN 'alumni' THEN type_multiplier := 0.75;
        WHEN 'professional' THEN type_multiplier := 0.7;
        WHEN 'community' THEN type_multiplier := 0.65;
        WHEN 'referral' THEN type_multiplier := 0.6;
        ELSE type_multiplier := 0.5;
    END CASE;

    -- Calculate final score (0-100)
    RETURN LEAST(100, base_score * recency_multiplier * type_multiplier * 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 7. Create trigger to auto-calculate warm_path_score
-- ============================================================================

CREATE OR REPLACE FUNCTION update_warm_path_score()
RETURNS TRIGGER AS $$
BEGIN
    NEW.warm_path_score := calculate_warm_path_score(
        NEW.strength_score,
        NEW.last_interaction,
        NEW.relationship_type
    );
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_warm_path_score
    BEFORE INSERT OR UPDATE ON relationships
    FOR EACH ROW
    EXECUTE FUNCTION update_warm_path_score();

-- ============================================================================
-- 8. Create function to find warm paths between donors
-- ============================================================================

CREATE OR REPLACE FUNCTION find_warm_paths(
    p_organization_id UUID,
    p_target_donor_id UUID,
    p_max_hops INTEGER DEFAULT 2,
    p_min_score DECIMAL DEFAULT 20.0,
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
    path_id UUID,
    intermediary_donor_id UUID,
    intermediary_name TEXT,
    relationship_type relationship_type,
    warm_path_score DECIMAL(5, 2),
    path_length INTEGER,
    path_description TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- Direct connections (1 hop)
    SELECT
        r.id as path_id,
        r.connected_person_id as intermediary_donor_id,
        COALESCE(r.connected_person_name, 'Unknown') as intermediary_name,
        r.relationship_type,
        r.warm_path_score,
        1 as path_length,
        FORMAT('Direct connection via %s (%s)',
            COALESCE(r.connected_person_name, 'someone'),
            r.relationship_type::TEXT
        ) as path_description
    FROM relationships r
    WHERE r.organization_id = p_organization_id
      AND r.donor_id = p_target_donor_id
      AND r.warm_path_score >= p_min_score

    UNION ALL

    -- Two-hop connections (if max_hops >= 2)
    SELECT
        rc.id as path_id,
        rc.target_donor_id as intermediary_donor_id,
        d.name as intermediary_name,
        r.relationship_type,
        rc.total_path_score as warm_path_score,
        rc.path_length,
        FORMAT('Via %s (path score: %s)', d.name, rc.total_path_score) as path_description
    FROM relationship_connections rc
    JOIN donors d ON d.id = rc.target_donor_id
    JOIN relationships r ON r.id = rc.relationship_id
    WHERE rc.organization_id = p_organization_id
      AND rc.source_donor_id = p_target_donor_id
      AND rc.path_length <= p_max_hops
      AND rc.total_path_score >= p_min_score
      AND rc.status = 'active'

    ORDER BY warm_path_score DESC, path_length ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 9. Create function to discover and store relationship connections
-- ============================================================================

CREATE OR REPLACE FUNCTION discover_relationship_connections(
    p_organization_id UUID
) RETURNS INTEGER AS $$
DECLARE
    connections_found INTEGER := 0;
BEGIN
    -- Find 2-hop connections through shared relationships
    INSERT INTO relationship_connections (
        organization_id,
        source_donor_id,
        target_donor_id,
        relationship_id,
        path_length,
        total_path_score,
        confidence_score,
        path_data
    )
    SELECT DISTINCT ON (r1.donor_id, r2.donor_id)
        p_organization_id,
        r1.donor_id as source_donor_id,
        r2.donor_id as target_donor_id,
        r1.id as relationship_id,
        2 as path_length,
        (r1.warm_path_score + r2.warm_path_score) / 2 as total_path_score,
        0.7 as confidence_score,
        jsonb_build_array(
            jsonb_build_object('from', r1.donor_id, 'via', r1.connected_person_id, 'score', r1.warm_path_score),
            jsonb_build_object('from', r1.connected_person_id, 'to', r2.donor_id, 'score', r2.warm_path_score)
        ) as path_data
    FROM relationships r1
    JOIN relationships r2 ON r1.connected_person_id = r2.donor_id
    WHERE r1.organization_id = p_organization_id
      AND r2.organization_id = p_organization_id
      AND r1.donor_id != r2.donor_id
      AND r1.connected_person_id IS NOT NULL
    ON CONFLICT (organization_id, source_donor_id, target_donor_id)
    DO UPDATE SET
        total_path_score = EXCLUDED.total_path_score,
        last_calculated_at = NOW(),
        updated_at = NOW();

    GET DIAGNOSTICS connections_found = ROW_COUNT;

    RETURN connections_found;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. Create updated_at trigger for relationship_connections
-- ============================================================================

CREATE TRIGGER update_relationship_connections_updated_at
    BEFORE UPDATE ON relationship_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 11. Update existing relationships to calculate warm_path_score
-- ============================================================================

UPDATE relationships
SET warm_path_score = calculate_warm_path_score(
    strength_score,
    last_interaction,
    COALESCE(relationship_type, 'other')
)
WHERE warm_path_score IS NULL OR warm_path_score = 0;
