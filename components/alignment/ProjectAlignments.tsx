'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { AlignmentScore } from './AlignmentScore';
import { createClient } from '@/lib/supabase/client';

interface ProjectAlignment {
  id: string;
  project_id: string;
  project_name: string;
  project_description?: string;
  alignment_score: number;
  alignment_reasons: string[];
  funding_goal?: number;
  current_funding?: number;
}

interface ProjectAlignmentsProps {
  donorId: string;
  limit?: number;
  showProgress?: boolean;
}

/**
 * Project Alignments Component
 *
 * Shows projects ranked by their alignment with a specific donor.
 */
export function ProjectAlignments({
  donorId,
  limit = 5,
  showProgress = true,
}: ProjectAlignmentsProps) {
  const [projects, setProjects] = useState<ProjectAlignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProjectAlignments() {
      try {
        const supabase = createClient();

        // Use type assertion due to potential schema variations
        const { data, error } = await supabase
          .from('donor_project_alignments')
          .select(`
            id,
            project_id,
            alignment_score,
            projects!inner(
              name,
              description,
              funding_goal,
              current_funding
            )
          `)
          .eq('donor_id', donorId)
          .order('alignment_score', { ascending: false })
          .limit(limit) as { data: Array<Record<string, unknown>> | null; error: Error | null };

        if (error) throw error;

        const mapped = (data || []).map((item) => {
          const project = item.projects as {
            name: string;
            description?: string;
            funding_goal?: number;
            current_funding?: number;
          } | undefined;
          return {
            id: item.id as string,
            project_id: item.project_id as string,
            project_name: project?.name || 'Unknown',
            project_description: project?.description,
            alignment_score: item.alignment_score as number,
            alignment_reasons: [] as string[], // Column may not exist yet
            funding_goal: project?.funding_goal,
            current_funding: project?.current_funding,
          };
        });

        setProjects(mapped);
      } catch (error) {
        console.error('Error fetching project alignments:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProjectAlignments();
  }, [donorId, limit]);

  const getFundingProgress = (current?: number, goal?: number) => {
    if (!current || !goal) return 0;
    return Math.min(Math.round((current / goal) * 100), 100);
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 border rounded-lg">
              <Skeleton className="h-5 w-40 mb-2" />
              <Skeleton className="h-4 w-full mb-3" />
              <Skeleton className="h-2 w-full" />
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
          Recommended Projects
        </h3>
        <span className="text-2xl">🎯</span>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No project alignments found</p>
          <p className="text-sm text-gray-400 mt-1">
            Create projects to generate alignment recommendations
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => {
            const progress = getFundingProgress(
              project.current_funding,
              project.funding_goal
            );

            return (
              <div
                key={project.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <AlignmentScore
                    score={project.alignment_score}
                    size="sm"
                    showLabel={false}
                  />

                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/projects/${project.project_id}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {project.project_name}
                    </Link>

                    {project.project_description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {project.project_description}
                      </p>
                    )}

                    {project.alignment_reasons.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {project.alignment_reasons.slice(0, 3).map((reason, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {reason}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {showProgress && project.funding_goal && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>
                            ${(project.current_funding || 0).toLocaleString()} raised
                          </span>
                          <span>
                            ${project.funding_goal.toLocaleString()} goal
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                  <Link href={`/projects/${project.project_id}?donor=${donorId}`}>
                    <Button variant="secondary" size="sm">
                      View Talking Points
                    </Button>
                  </Link>
                  <Link href={`/engagements/new?donor=${donorId}&project=${project.project_id}`}>
                    <Button variant="primary" size="sm">
                      Create Engagement
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {projects.length >= limit && (
        <Link
          href={`/donors/${donorId}/alignments`}
          className="block text-center text-sm text-blue-600 hover:text-blue-800 mt-4"
        >
          View all project alignments
        </Link>
      )}
    </Card>
  );
}
