/**
 * LinkedIn Connection Analyzer
 *
 * Analyzes LinkedIn profile data to extract relationship insights
 * and discover potential warm introductions.
 */

export interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  headline?: string;
  location?: string;
  industry?: string;
  connectionDegree: 1 | 2 | 3 | null; // 1st, 2nd, 3rd degree connection
  profileUrl?: string;
  photoUrl?: string;
  currentPosition?: {
    title: string;
    company: string;
    startDate?: string;
  };
  positions?: Array<{
    title: string;
    company: string;
    startDate?: string;
    endDate?: string;
    isCurrent: boolean;
  }>;
  education?: Array<{
    school: string;
    degree?: string;
    fieldOfStudy?: string;
    startYear?: number;
    endYear?: number;
  }>;
  skills?: string[];
  mutualConnections?: number;
  mutualConnectionNames?: string[];
}

export interface LinkedInConnectionAnalysis {
  profile: LinkedInProfile;
  connectionStrength: number; // 0-100
  sharedBackground: {
    companies: string[];
    schools: string[];
    industries: string[];
    skills: string[];
  };
  introductionPaths: Array<{
    throughPerson: string;
    relationshipType: 'professional' | 'alumni' | 'industry' | 'mutual';
    strength: number;
  }>;
  engagementRecommendation: {
    approach: string;
    talkingPoints: string[];
    timing: string;
  };
  givingPotential: {
    score: number; // 0-100
    indicators: string[];
  };
}

export interface LinkedInNetworkAnalysis {
  totalConnections: number;
  connectionsByIndustry: Record<string, number>;
  connectionsByDegree: Record<number, number>;
  potentialDonors: LinkedInProfile[];
  keyConnectors: Array<{
    profile: LinkedInProfile;
    networkReach: number;
    industries: string[];
  }>;
}

/**
 * Known philanthropic indicators in titles/companies
 */
const PHILANTHROPIC_INDICATORS = {
  titles: [
    'philanthrop', 'foundation', 'nonprofit', 'non-profit', 'charity',
    'board member', 'trustee', 'advisor', 'executive director',
  ],
  companies: [
    'foundation', 'charitable', 'philanthropy', 'giving', 'trust',
  ],
  industries: [
    'Philanthropy', 'Non-profit Organization Management', 'Civic & Social Organization',
  ],
};

/**
 * High-net-worth indicators
 */
const HNW_INDICATORS = {
  titles: [
    'ceo', 'president', 'chairman', 'founder', 'partner', 'managing director',
    'chief executive', 'owner', 'principal', 'investor', 'venture',
  ],
  industries: [
    'Venture Capital', 'Private Equity', 'Investment Management', 'Investment Banking',
    'Real Estate', 'Law Practice', 'Medical Practice',
  ],
};

/**
 * Calculate connection strength based on profile data
 */
function calculateConnectionStrength(
  profile: LinkedInProfile,
  ourProfile?: LinkedInProfile
): number {
  let strength = 0;

  // Connection degree (most important)
  switch (profile.connectionDegree) {
    case 1:
      strength += 50;
      break;
    case 2:
      strength += 25;
      break;
    case 3:
      strength += 10;
      break;
  }

  // Mutual connections
  if (profile.mutualConnections) {
    strength += Math.min(20, profile.mutualConnections * 2);
  }

  // Shared background (if we have our profile)
  if (ourProfile) {
    const sharedCompanies = findSharedCompanies(profile, ourProfile);
    const sharedSchools = findSharedSchools(profile, ourProfile);

    strength += sharedCompanies.length * 5;
    strength += sharedSchools.length * 8; // Alumni connections are strong
  }

  return Math.min(100, strength);
}

/**
 * Find companies in common between two profiles
 */
function findSharedCompanies(
  profile1: LinkedInProfile,
  profile2: LinkedInProfile
): string[] {
  const companies1 = new Set(
    profile1.positions?.map((p) => p.company.toLowerCase()) || []
  );
  const companies2 = new Set(
    profile2.positions?.map((p) => p.company.toLowerCase()) || []
  );

  return [...companies1].filter((c) => companies2.has(c));
}

/**
 * Find schools in common between two profiles
 */
function findSharedSchools(
  profile1: LinkedInProfile,
  profile2: LinkedInProfile
): string[] {
  const schools1 = new Set(
    profile1.education?.map((e) => e.school.toLowerCase()) || []
  );
  const schools2 = new Set(
    profile2.education?.map((e) => e.school.toLowerCase()) || []
  );

  return [...schools1].filter((s) => schools2.has(s));
}

/**
 * Calculate giving potential based on profile indicators
 */
function calculateGivingPotential(profile: LinkedInProfile): {
  score: number;
  indicators: string[];
} {
  let score = 0;
  const indicators: string[] = [];

  const fullTitle = (profile.currentPosition?.title || profile.headline || '').toLowerCase();
  const company = (profile.currentPosition?.company || '').toLowerCase();
  const industry = (profile.industry || '').toLowerCase();

  // Check philanthropic indicators
  PHILANTHROPIC_INDICATORS.titles.forEach((term) => {
    if (fullTitle.includes(term)) {
      score += 15;
      indicators.push(`Title includes "${term}"`);
    }
  });

  PHILANTHROPIC_INDICATORS.companies.forEach((term) => {
    if (company.includes(term)) {
      score += 10;
      indicators.push(`Works at organization with "${term}"`);
    }
  });

  PHILANTHROPIC_INDICATORS.industries.forEach((ind) => {
    if (profile.industry === ind) {
      score += 20;
      indicators.push(`${ind} industry`);
    }
  });

  // Check HNW indicators
  HNW_INDICATORS.titles.forEach((term) => {
    if (fullTitle.includes(term)) {
      score += 10;
      indicators.push(`Senior position: "${term}"`);
    }
  });

  HNW_INDICATORS.industries.forEach((ind) => {
    if (profile.industry === ind) {
      score += 15;
      indicators.push(`High-net-worth industry: ${ind}`);
    }
  });

  // Tenure bonus (long-serving executives likely have accumulated wealth)
  if (profile.currentPosition?.startDate) {
    const startYear = new Date(profile.currentPosition.startDate).getFullYear();
    const yearsInRole = new Date().getFullYear() - startYear;
    if (yearsInRole > 10) {
      score += 10;
      indicators.push(`${yearsInRole}+ years in current role`);
    }
  }

  return { score: Math.min(100, score), indicators };
}

/**
 * Generate engagement recommendation
 */
function generateEngagementRecommendation(
  profile: LinkedInProfile,
  sharedBackground: LinkedInConnectionAnalysis['sharedBackground']
): LinkedInConnectionAnalysis['engagementRecommendation'] {
  const talkingPoints: string[] = [];
  let approach = '';
  let timing = 'Within the next 2 weeks';

  // Build talking points based on shared background
  if (sharedBackground.schools.length > 0) {
    talkingPoints.push(`Fellow ${sharedBackground.schools[0]} alumni`);
    approach = 'Lead with alumni connection';
  }

  if (sharedBackground.companies.length > 0) {
    talkingPoints.push(`Shared experience at ${sharedBackground.companies[0]}`);
    if (!approach) approach = 'Reference shared professional history';
  }

  if (profile.currentPosition) {
    talkingPoints.push(`Their work at ${profile.currentPosition.company}`);
  }

  if (profile.industry && PHILANTHROPIC_INDICATORS.industries.includes(profile.industry)) {
    talkingPoints.push('Their philanthropic interests and experience');
    approach = approach || 'Connect on shared commitment to giving';
  }

  // Default approach
  if (!approach) {
    if (profile.connectionDegree === 1) {
      approach = 'Direct outreach - mention specific shared connection or interest';
    } else if (profile.connectionDegree === 2) {
      approach = 'Request introduction through mutual connection';
    } else {
      approach = 'InMail with personalized message highlighting alignment';
    }
  }

  // Add generic talking point if needed
  if (talkingPoints.length === 0) {
    talkingPoints.push('Their professional background and expertise');
    talkingPoints.push('How their interests align with our mission');
  }

  return { approach, talkingPoints, timing };
}

/**
 * Analyze a LinkedIn profile for relationship insights
 */
export function analyzeLinkedInProfile(
  profile: LinkedInProfile,
  ourProfile?: LinkedInProfile
): LinkedInConnectionAnalysis {
  const connectionStrength = calculateConnectionStrength(profile, ourProfile);
  const givingPotential = calculateGivingPotential(profile);

  // Find shared background
  const sharedBackground: LinkedInConnectionAnalysis['sharedBackground'] = {
    companies: ourProfile ? findSharedCompanies(profile, ourProfile) : [],
    schools: ourProfile ? findSharedSchools(profile, ourProfile) : [],
    industries: ourProfile && ourProfile.industry === profile.industry && profile.industry
      ? [profile.industry]
      : [],
    skills: [], // Would need skill comparison
  };

  // Build introduction paths
  const introductionPaths: LinkedInConnectionAnalysis['introductionPaths'] = [];

  if (profile.mutualConnectionNames && profile.mutualConnectionNames.length > 0) {
    profile.mutualConnectionNames.slice(0, 5).forEach((name) => {
      introductionPaths.push({
        throughPerson: name,
        relationshipType: 'mutual',
        strength: 70,
      });
    });
  }

  if (sharedBackground.schools.length > 0) {
    introductionPaths.push({
      throughPerson: `${sharedBackground.schools[0]} alumni network`,
      relationshipType: 'alumni',
      strength: 60,
    });
  }

  const engagementRecommendation = generateEngagementRecommendation(
    profile,
    sharedBackground
  );

  return {
    profile,
    connectionStrength,
    sharedBackground,
    introductionPaths,
    engagementRecommendation,
    givingPotential,
  };
}

/**
 * Analyze a network of LinkedIn connections
 */
export function analyzeLinkedInNetwork(
  connections: LinkedInProfile[]
): LinkedInNetworkAnalysis {
  const connectionsByIndustry: Record<string, number> = {};
  const connectionsByDegree: Record<number, number> = { 1: 0, 2: 0, 3: 0 };

  connections.forEach((profile) => {
    // Count by industry
    if (profile.industry) {
      connectionsByIndustry[profile.industry] =
        (connectionsByIndustry[profile.industry] || 0) + 1;
    }

    // Count by degree
    if (profile.connectionDegree) {
      connectionsByDegree[profile.connectionDegree]++;
    }
  });

  // Identify potential donors
  const potentialDonors = connections
    .map((profile) => ({
      profile,
      score: calculateGivingPotential(profile).score,
    }))
    .filter((p) => p.score >= 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map((p) => p.profile);

  // Identify key connectors (people with high mutual connections)
  const keyConnectors = connections
    .filter((p) => (p.mutualConnections || 0) >= 10)
    .map((profile) => ({
      profile,
      networkReach: profile.mutualConnections || 0,
      industries: profile.industry ? [profile.industry] : [],
    }))
    .sort((a, b) => b.networkReach - a.networkReach)
    .slice(0, 10);

  return {
    totalConnections: connections.length,
    connectionsByIndustry,
    connectionsByDegree,
    potentialDonors,
    keyConnectors,
  };
}

/**
 * Find potential introduction paths between two profiles through a network
 */
export function findLinkedInIntroductionPaths(
  fromProfile: LinkedInProfile,
  toProfile: LinkedInProfile,
  network: LinkedInProfile[]
): Array<{
  path: LinkedInProfile[];
  strength: number;
  connectionType: string;
}> {
  const paths: Array<{
    path: LinkedInProfile[];
    strength: number;
    connectionType: string;
  }> = [];

  // Direct connection check
  if (toProfile.connectionDegree === 1) {
    paths.push({
      path: [fromProfile, toProfile],
      strength: 100,
      connectionType: 'Direct 1st degree connection',
    });
  }

  // Check for mutual connections (2nd degree paths)
  if (toProfile.mutualConnectionNames) {
    toProfile.mutualConnectionNames.forEach((mutualName) => {
      const mutualProfile = network.find(
        (p) =>
          `${p.firstName} ${p.lastName}`.toLowerCase() === mutualName.toLowerCase()
      );

      if (mutualProfile) {
        paths.push({
          path: [fromProfile, mutualProfile, toProfile],
          strength: 75,
          connectionType: 'Through mutual connection',
        });
      }
    });
  }

  // Check for alumni connections
  const toSchools = new Set(toProfile.education?.map((e) => e.school.toLowerCase()) || []);
  network
    .filter((p) => p.connectionDegree === 1)
    .forEach((connector) => {
      const connectorSchools = connector.education?.map((e) => e.school.toLowerCase()) || [];
      const sharedSchool = connectorSchools.find((s) => toSchools.has(s));

      if (sharedSchool && !paths.some((p) => p.path.includes(connector))) {
        paths.push({
          path: [fromProfile, connector, toProfile],
          strength: 60,
          connectionType: `Alumni connection (${sharedSchool})`,
        });
      }
    });

  // Sort by strength
  paths.sort((a, b) => b.strength - a.strength);

  return paths.slice(0, 5);
}
