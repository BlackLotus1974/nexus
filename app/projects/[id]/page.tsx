'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProjectForm, ProjectFormData } from '@/components/project/ProjectForm';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/lib/auth/hooks';
import { useProject, useUpdateProject, useDeleteProject } from '@/lib/hooks/useProjects';

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

function getStatusVariant(status: string): 'success' | 'warning' | 'default' {
  switch (status) {
    case 'active':
      return 'success';
    case 'completed':
      return 'default';
    case 'archived':
      return 'warning';
    default:
      return 'default';
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function ProjectDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <div className="animate-pulse space-y-4">
          <div className="flex items-start justify-between">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex gap-4 pt-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
      </Card>
      <Card>
        <Skeleton className="h-6 w-1/4 mb-4" />
        <Skeleton className="h-32 w-full" />
      </Card>
    </div>
  );
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { organizationId, isAuthenticated, initialized } = useAuth();

  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve params
  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  // Check for edit mode from URL
  useEffect(() => {
    if (searchParams.get('edit') === 'true') {
      setIsEditing(true);
    }
  }, [searchParams]);

  const projectId = resolvedParams?.id || '';

  // Fetch project
  const {
    data: project,
    isLoading,
    error: fetchError,
    refetch,
  } = useProject(projectId, organizationId || '', !!projectId && !!organizationId);

  // Mutations
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setError(null);
    // Remove edit param from URL
    router.replace(`/projects/${projectId}`);
  };

  const handleSubmit = async (data: ProjectFormData) => {
    if (!organizationId || !projectId) {
      setError('Invalid project or organization');
      return;
    }

    setError(null);

    try {
      await updateProject.mutateAsync({
        projectId,
        organizationId,
        updates: {
          name: data.name.trim(),
          description: data.description.trim() || undefined,
          conceptNote: data.conceptNote.trim() || undefined,
          fundingGoal: data.fundingGoal ? parseFloat(data.fundingGoal) : undefined,
          status: data.status,
        },
      });

      setIsEditing(false);
      router.replace(`/projects/${projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
    }
  };

  const handleDelete = async () => {
    if (!organizationId || !projectId) return;

    try {
      await deleteProject.mutateAsync({ projectId, organizationId });
      router.push('/projects');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
    }
  };

  // Loading state
  if (!initialized || !resolvedParams) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-4xl mx-auto">
          <ProjectDetailSkeleton />
        </div>
      </DashboardLayout>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !organizationId) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Alert variant="warning">Please log in to view this project.</Alert>
        </div>
      </DashboardLayout>
    );
  }

  // Loading project
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-4xl mx-auto">
          <ProjectDetailSkeleton />
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-4xl mx-auto">
          <Alert variant="error">
            Failed to load project. The project may not exist or you may not have access.
            <Button size="sm" variant="secondary" onClick={() => refetch()} className="ml-4">
              Retry
            </Button>
          </Alert>
          <Button variant="secondary" onClick={() => router.push('/projects')} className="mt-4">
            Back to Projects
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Project not found
  if (!project) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-4xl mx-auto">
          <Alert variant="warning">Project not found.</Alert>
          <Button variant="secondary" onClick={() => router.push('/projects')} className="mt-4">
            Back to Projects
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/projects')}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Projects
          </Button>
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900 dark:text-gray-100 font-medium truncate max-w-xs">
            {project.name}
          </span>
        </nav>

        {isEditing ? (
          /* Edit Mode */
          <div>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Project</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Update your project details and settings.
              </p>
            </div>

            <Card>
              <ProjectForm
                project={project}
                onSubmit={handleSubmit}
                onCancel={handleCancelEdit}
                isLoading={updateProject.isPending}
                error={error}
                mode="edit"
              />
            </Card>
          </div>
        ) : (
          /* View Mode */
          <div className="space-y-6">
            {/* Header Card */}
            <Card>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {project.name}
                    </h1>
                    <Badge variant={getStatusVariant(project.status)} size="sm">
                      {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                    </Badge>
                  </div>

                  {project.description && (
                    <p className="text-gray-600 dark:text-gray-400 mb-4">{project.description}</p>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm">
                    {project.fundingGoal && (
                      <div className="flex items-center text-gray-700 dark:text-gray-300">
                        <svg
                          className="h-5 w-5 mr-2 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="font-medium">Funding Goal:</span>
                        <span className="ml-1">{formatCurrency(project.fundingGoal)}</span>
                      </div>
                    )}

                    <div className="flex items-center text-gray-500 dark:text-gray-400">
                      <svg
                        className="h-5 w-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      Created {new Date(project.createdAt).toLocaleDateString()}
                    </div>

                    <div className="flex items-center text-gray-500 dark:text-gray-400">
                      <svg
                        className="h-5 w-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Updated {new Date(project.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="primary" onClick={handleEdit}>
                    <svg
                      className="h-4 w-4 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setDeleteModalOpen(true)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <svg
                      className="h-4 w-4 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Delete
                  </Button>
                </div>
              </div>
            </Card>

            {/* Concept Note Card */}
            {project.conceptNote && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                  <svg
                    className="h-5 w-5 mr-2 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Concept Note
                </h2>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg overflow-auto max-h-96">
                    {project.conceptNote}
                  </pre>
                </div>
              </Card>
            )}

            {/* Donor Alignments Placeholder */}
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <svg
                  className="h-5 w-5 mr-2 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                Donor Alignments
              </h2>
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <p className="text-sm">
                  Donor alignment analysis will appear here once the AI matching algorithm is implemented.
                </p>
                <p className="text-xs mt-2 text-gray-400">
                  Coming soon: Task 12 - Project-Donor Alignment Algorithm
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* Delete confirmation modal */}
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete Project"
        >
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Are you sure you want to delete &quot;{project.name}&quot;? This action cannot be undone
              and will remove all associated donor alignments.
            </p>
            {deleteProject.error && (
              <Alert variant="error">Failed to delete project. Please try again.</Alert>
            )}
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleteProject.isPending}
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDelete} loading={deleteProject.isPending}>
                Delete Project
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
