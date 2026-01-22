-- Add full-text search capabilities for donors
-- Enables advanced search with pg_trgm for fuzzy matching and GIN indexes

-- Enable pg_trgm extension for similarity/fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add additional columns to donors table for enhanced search
ALTER TABLE donors ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS giving_level TEXT CHECK (giving_level IN ('major', 'mid-level', 'emerging', 'new', 'lapsed'));
ALTER TABLE donors ADD COLUMN IF NOT EXISTS total_giving DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS last_donation_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS donor_type TEXT DEFAULT 'individual' CHECK (donor_type IN ('individual', 'organization', 'foundation'));
ALTER TABLE donors ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE donors ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS source TEXT CHECK (source IN ('manual', 'salesforce', 'hubspot', 'bloomerang', 'kindful', 'neonone', 'import'));

-- Create a generated column for full-text search vector
ALTER TABLE donors ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(location, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(notes, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'C')
  ) STORED;

-- GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_donors_search_vector ON donors USING GIN (search_vector);

-- GIN index for trigram similarity on name (fuzzy search)
CREATE INDEX IF NOT EXISTS idx_donors_name_trgm ON donors USING GIN (name gin_trgm_ops);

-- GIN index for trigram similarity on location
CREATE INDEX IF NOT EXISTS idx_donors_location_trgm ON donors USING GIN (location gin_trgm_ops);

-- GIN index for tags array
CREATE INDEX IF NOT EXISTS idx_donors_tags ON donors USING GIN (tags);

-- B-tree indexes for range filters
CREATE INDEX IF NOT EXISTS idx_donors_giving_level ON donors(giving_level);
CREATE INDEX IF NOT EXISTS idx_donors_total_giving ON donors(total_giving);
CREATE INDEX IF NOT EXISTS idx_donors_last_contact_date ON donors(last_contact_date);
CREATE INDEX IF NOT EXISTS idx_donors_last_donation_date ON donors(last_donation_date);
CREATE INDEX IF NOT EXISTS idx_donors_donor_type ON donors(donor_type);
CREATE INDEX IF NOT EXISTS idx_donors_source ON donors(source);

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_donors_org_giving ON donors(organization_id, giving_level, total_giving);
CREATE INDEX IF NOT EXISTS idx_donors_org_dates ON donors(organization_id, last_contact_date, last_donation_date);

-- Function for advanced donor search with relevance scoring
CREATE OR REPLACE FUNCTION search_donors(
  p_organization_id UUID,
  p_query TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_giving_levels TEXT[] DEFAULT NULL,
  p_donor_types TEXT[] DEFAULT NULL,
  p_min_total_giving DECIMAL DEFAULT NULL,
  p_max_total_giving DECIMAL DEFAULT NULL,
  p_last_contact_after TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_last_contact_before TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_last_donation_after TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_last_donation_before TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_min_alignment_score DECIMAL DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  location TEXT,
  giving_level TEXT,
  total_giving DECIMAL,
  donor_type TEXT,
  last_contact_date TIMESTAMP WITH TIME ZONE,
  last_donation_date TIMESTAMP WITH TIME ZONE,
  tags TEXT[],
  notes TEXT,
  intelligence_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  last_updated TIMESTAMP WITH TIME ZONE,
  relevance_score REAL,
  alignment_score DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.organization_id,
    d.name,
    d.email,
    d.phone,
    d.location,
    d.giving_level,
    d.total_giving,
    d.donor_type,
    d.last_contact_date,
    d.last_donation_date,
    d.tags,
    d.notes,
    d.intelligence_data,
    d.created_at,
    d.last_updated,
    CASE
      WHEN p_query IS NOT NULL AND p_query != '' THEN
        ts_rank(d.search_vector, plainto_tsquery('english', p_query)) +
        similarity(d.name, p_query)
      ELSE 0.0
    END::REAL AS relevance_score,
    dpa.alignment_score
  FROM donors d
  LEFT JOIN donor_project_alignments dpa ON d.id = dpa.donor_id
    AND (p_project_id IS NULL OR dpa.project_id = p_project_id)
  WHERE
    d.organization_id = p_organization_id
    -- Full-text search with fuzzy matching
    AND (
      p_query IS NULL OR p_query = '' OR
      d.search_vector @@ plainto_tsquery('english', p_query) OR
      d.name % p_query OR  -- trigram similarity
      similarity(d.name, p_query) > 0.3
    )
    -- Location filter (fuzzy)
    AND (
      p_location IS NULL OR p_location = '' OR
      d.location ILIKE '%' || p_location || '%' OR
      similarity(d.location, p_location) > 0.3
    )
    -- Giving level filter
    AND (p_giving_levels IS NULL OR d.giving_level = ANY(p_giving_levels))
    -- Donor type filter
    AND (p_donor_types IS NULL OR d.donor_type = ANY(p_donor_types))
    -- Total giving range
    AND (p_min_total_giving IS NULL OR d.total_giving >= p_min_total_giving)
    AND (p_max_total_giving IS NULL OR d.total_giving <= p_max_total_giving)
    -- Last contact date range
    AND (p_last_contact_after IS NULL OR d.last_contact_date >= p_last_contact_after)
    AND (p_last_contact_before IS NULL OR d.last_contact_date <= p_last_contact_before)
    -- Last donation date range
    AND (p_last_donation_after IS NULL OR d.last_donation_date >= p_last_donation_after)
    AND (p_last_donation_before IS NULL OR d.last_donation_date <= p_last_donation_before)
    -- Tags filter (must have all specified tags)
    AND (p_tags IS NULL OR d.tags @> p_tags)
    -- Project alignment filter
    AND (p_project_id IS NULL OR dpa.project_id = p_project_id)
    AND (p_min_alignment_score IS NULL OR dpa.alignment_score >= p_min_alignment_score)
  ORDER BY
    CASE
      WHEN p_query IS NOT NULL AND p_query != '' THEN
        ts_rank(d.search_vector, plainto_tsquery('english', p_query)) +
        similarity(d.name, p_query)
      ELSE 0.0
    END DESC,
    d.last_updated DESC NULLS LAST,
    d.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_donors TO authenticated;

-- Function to get search suggestions (autocomplete)
CREATE OR REPLACE FUNCTION get_donor_suggestions(
  p_organization_id UUID,
  p_query TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  location TEXT,
  giving_level TEXT,
  similarity_score REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.name,
    d.location,
    d.giving_level,
    similarity(d.name, p_query)::REAL AS similarity_score
  FROM donors d
  WHERE
    d.organization_id = p_organization_id
    AND (
      d.name ILIKE p_query || '%' OR
      d.name % p_query OR
      similarity(d.name, p_query) > 0.2
    )
  ORDER BY
    CASE WHEN d.name ILIKE p_query || '%' THEN 0 ELSE 1 END,
    similarity(d.name, p_query) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_donor_suggestions TO authenticated;
