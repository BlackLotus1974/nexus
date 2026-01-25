'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { createClient } from '@/lib/supabase/client';

interface AlignmentData {
  id: string;
  donor_id: string;
  project_id: string;
  alignment_score: number;
  donor_name: string;
  project_name: string;
}

/**
 * Top Alignments Widget
 *
 * Shows best donor-project matches for quick action.
 */
export function TopAlignmentsWidget() {
  const [alignments, setAlignments] = useState<AlignmentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAlignments() {
      try {
        const supabase = createClient();

        // Fetch top alignments with donor and project names
        const { data, error } = await supabase
          .from('donor_project_alignments')
          .select(`
            id,
            donor_id,
            project_id,
            alignment_score,
            donors!inner(name),
            projects!inner(name)
          `)
          .order('alignment_score', { ascending: false })
          .limit(5);

        if (error) throw error;

        const mapped = (data || []).map((item: Record<string, unknown>) => ({
          id: item.id as string,
          donor_id: item.donor_id as string,
          project_id: item.project_id as string,
          alignment_score: item.alignment_score as number,
          donor_name: (item.donors as { name: string })?.name || 'Unknown',
          project_name: (item.projects as { name: string })?.name || 'Unknown',
        }));

        setAlignments(mapped);
      } catch (error) {
        console.error('Error fetching alignments:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAlignments();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center">
              <div>
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Top Alignments</h3>
        <span className="text-2xl">🎯</span>
      </div>

      {alignments.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-gray-500">No alignments calculated yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Upload project concept notes to generate alignments
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alignments.map((alignment) => (
            <Link
              key={alignment.id}
              href={`/donors/${alignment.donor_id}`}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {alignment.donor_name}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  → {alignment.project_name}
                </p>
              </div>
              <Badge className={getScoreColor(alignment.alignment_score)}>
                {alignment.alignment_score}%
              </Badge>
            </Link>
          ))}
        </div>
      )}

      <Link
        href="/alignments"
        className="block text-center text-sm text-blue-600 hover:text-blue-800 mt-4"
      >
        View all alignments →
      </Link>
    </Card>
  );
}
