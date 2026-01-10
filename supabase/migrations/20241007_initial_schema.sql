-- Nexus Fundraising Intelligence Platform - Initial Schema
-- Based on design.md specifications

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table (multi-tenant root)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profiles table (linked to Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'owner')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Donors table (core donor intelligence storage)
CREATE TABLE donors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    location TEXT,
    intelligence_data JSONB DEFAULT '{}',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Relationships table (connection mapping)
CREATE TABLE relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id UUID REFERENCES donors(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    connection_type TEXT CHECK (connection_type IN ('direct', 'mutual', 'linkedin')),
    strength_score INTEGER CHECK (strength_score >= 1 AND strength_score <= 10),
    contact_info JSONB DEFAULT '{}',
    last_interaction TIMESTAMP WITH TIME ZONE,
    relationship_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table (fundraising projects)
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    concept_note TEXT,
    funding_goal DECIMAL(15, 2),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Donor-Project Alignments table (AI-generated compatibility scores)
CREATE TABLE donor_project_alignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id UUID REFERENCES donors(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    alignment_score DECIMAL(3, 2) CHECK (alignment_score >= 0 AND alignment_score <= 1),
    analysis_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(donor_id, project_id)
);

-- CRM Integrations table (external CRM connections)
CREATE TABLE crm_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    crm_type TEXT NOT NULL CHECK (crm_type IN ('salesforce', 'hubspot', 'bloomerang', 'kindful', 'neonone')),
    credentials JSONB NOT NULL, -- encrypted credentials
    sync_status TEXT DEFAULT 'active' CHECK (sync_status IN ('active', 'paused', 'error')),
    last_sync TIMESTAMP WITH TIME ZONE,
    sync_config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, crm_type)
);

-- Activity Log table (track all system activities)
CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_donors_organization ON donors(organization_id);
CREATE INDEX idx_donors_name ON donors(name);
CREATE INDEX idx_relationships_donor ON relationships(donor_id);
CREATE INDEX idx_relationships_organization ON relationships(organization_id);
CREATE INDEX idx_projects_organization ON projects(organization_id);
CREATE INDEX idx_alignments_donor ON donor_project_alignments(donor_id);
CREATE INDEX idx_alignments_project ON donor_project_alignments(project_id);
CREATE INDEX idx_crm_integrations_organization ON crm_integrations(organization_id);
CREATE INDEX idx_activity_log_organization ON activity_log(organization_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at);

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE donor_project_alignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Users can view their own organization"
    ON organizations FOR SELECT
    USING (id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

-- RLS Policies for profiles
CREATE POLICY "Users can view profiles in their organization"
    ON profiles FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid());

-- RLS Policies for donors
CREATE POLICY "Users can view donors in their organization"
    ON donors FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert donors in their organization"
    ON donors FOR INSERT
    WITH CHECK (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update donors in their organization"
    ON donors FOR UPDATE
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

-- RLS Policies for relationships
CREATE POLICY "Users can view relationships in their organization"
    ON relationships FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can manage relationships in their organization"
    ON relationships FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

-- RLS Policies for projects
CREATE POLICY "Users can view projects in their organization"
    ON projects FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can manage projects in their organization"
    ON projects FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

-- RLS Policies for donor_project_alignments
CREATE POLICY "Users can view alignments for their organization's donors"
    ON donor_project_alignments FOR SELECT
    USING (donor_id IN (
        SELECT id FROM donors WHERE organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can manage alignments for their organization's donors"
    ON donor_project_alignments FOR ALL
    USING (donor_id IN (
        SELECT id FROM donors WHERE organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    ));

-- RLS Policies for crm_integrations
CREATE POLICY "Users can view CRM integrations in their organization"
    ON crm_integrations FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Admins can manage CRM integrations"
    ON crm_integrations FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM profiles
        WHERE id = auth.uid() AND role IN ('admin', 'owner')
    ));

-- RLS Policies for activity_log
CREATE POLICY "Users can view activity log for their organization"
    ON activity_log FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "System can insert activity log entries"
    ON activity_log FOR INSERT
    WITH CHECK (true);

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_donors_updated_at BEFORE UPDATE ON donors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_relationships_updated_at BEFORE UPDATE ON relationships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alignments_updated_at BEFORE UPDATE ON donor_project_alignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_integrations_updated_at BEFORE UPDATE ON crm_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
