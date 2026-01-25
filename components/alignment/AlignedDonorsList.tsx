'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { AlignmentScore } from './AlignmentScore';
import { createClient } from '@/lib/supabase/client';

interface AlignedDonor {
  id: string;
  donor_id: string;
  donor_name: string;
  donor_email?: string;
  alignment_score: number;
  alignment_reasons: string[];
  last_contacted?: string;
  total_giving?: number;
}

interface AlignedDonorsListProps {
  projectId: string;
  limit?: number;
  showActions?: boolean;
}

/**
 * Aligned Donors List Component
 *
 * Shows donors ranked by their alignment score with a specific project.
 */
export function AlignedDonorsList({
  projectId,
  limit = 10,
  showActions = true,
}: AlignedDonorsListProps) {
  const [donors, setDonors] = useState<AlignedDonor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'score' | 'giving' | 'recent'>('score');

  useEffect(() => {
    async function fetchAlignedDonors() {
      try {
        const supabase = createClient();

        // Use type assertion due to potential schema variations
        const { data, error } = await supabase
          .from('donor_project_alignments')
          .select(`
            id,
            donor_id,
            alignment_score,
            donors!inner(
              name,
              email,
              intelligence_data
            )
          `)
          .eq('project_id', projectId)
          .order('alignment_score', { ascending: false })
          .limit(limit) as { data: Array<Record<string, unknown>> | null; error: Error | null };

        if (error) throw error;

        const mapped = (data || []).map((item) => {
          const donor = item.donors as { name: string; email?: string; intelligence_data?: Record<string, unknown> } | undefined;
          return {
            id: item.id as string,
            donor_id: item.donor_id as string,
            donor_name: donor?.name || 'Unknown',
            donor_email: donor?.email,
            alignment_score: item.alignment_score as number,
            alignment_reasons: [] as string[], // Column may not exist yet
            total_giving: donor?.intelligence_data?.totalGiving as number | undefined,
          };
        });

        setDonors(mapped);
      } catch (error) {
        console.error('Error fetching aligned donors:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAlignedDonors();
  }, [projectId, limit]);

  const sortedDonors = [...donors].sort((a, b) => {
    switch (sortBy) {
      case 'giving':
        return (b.total_giving || 0) - (a.total_giving || 0);
      case 'recent':
        return new Date(b.last_contacted || 0).getTime() - new Date(a.last_contacted || 0).getTime();
      default:
        return b.alignment_score - a.alignment_score;
    }
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="w-14 h-14 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Best Aligned Donors
        </h3>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="text-sm border border-gray-300 rounded-md px-2 py-1"
        >
          <option value="score">By Score</option>
          <option value="giving">By Giving</option>
          <option value="recent">Recently Contacted</option>
        </select>
      </div>

      {sortedDonors.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No aligned donors found</p>
          <p className="text-sm text-gray-400 mt-1">
            Add donors and run alignment analysis to see matches
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDonors.map((donor, index) => (
            <div
              key={donor.id}
              className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex-shrink-0 w-8 text-center">
                <span className="text-lg font-bold text-gray-400">
                  #{index + 1}
                </span>
              </div>

              <AlignmentScore score={donor.alignment_score} size="sm" showLabel={false} />

              <div className="flex-1 min-w-0">
                <Link
                  href={`/donors/${donor.donor_id}`}
                  className="font-medium text-gray-900 hover:text-blue-600"
                >
                  {donor.donor_name}
                </Link>
                {donor.total_giving && (
                  <p className="text-sm text-gray-500">
                    Total Giving: ${donor.total_giving.toLocaleString()}
                  </p>
                )}
                {donor.alignment_reasons.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {donor.alignment_reasons.slice(0, 2).map((reason, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {reason}
                      </Badge>
                    ))}
                    {donor.alignment_reasons.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{donor.alignment_reasons.length - 2} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {showActions && (
                <div className="flex gap-2">
                  <Link
                    href={`/donors/${donor.donor_id}?tab=alignment&project=${projectId}`}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    View Details
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {donors.length >= limit && (
        <Link
          href={`/projects/${projectId}/alignments`}
          className="block text-center text-sm text-blue-600 hover:text-blue-800 mt-4"
        >
          View all aligned donors
        </Link>
      )}
    </Card>
  );
}
