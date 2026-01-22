'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProjectForm, ProjectFormData } from '@/components/project/ProjectForm';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/lib/auth/hooks';
import { useCreateProject } from '@/lib/hooks/useProjects';

export default function NewProjectPage() {
  const router = useRouter();
  const { organizationId, isAuthenticated, initialized } = useAuth();
  const createProject = useCreateProject();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: ProjectFormData) => {
    if (!organizationId) {
      setError('Organization not found. Please log in again.');
      return;
    }

    setError(null);

    try {
      const project = await createProject.mutateAsync({
        name: data.name.trim(),
        description: data.description.trim() || undefined,
        conceptNote: data.conceptNote.trim() || undefined,
        fundingGoal: data.fundingGoal ? parseFloat(data.fundingGoal) : undefined,
        organizationId,
      });

      // Navigate to the new project's detail page
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project. Please try again.');
    }
  };

  const handleCancel = () => {
    router.push('/projects');
  };

  // Loading state while checking auth
  if (!initialized) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
              <div className="space-y-3 pt-4">
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !organizationId) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Alert variant="warning">Please log in to create a project.</Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-3xl mx-auto">
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
          <span className="text-gray-900 dark:text-gray-100 font-medium">New Project</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Create New Project
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Add a new fundraising project to match with potential donors.
          </p>
        </div>

        {/* Form */}
        <Card>
          <ProjectForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={createProject.isPending}
            error={error}
            mode="create"
          />
        </Card>

        {/* Tips */}
        <Card className="mt-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            Tips for better donor matching
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
            <li>Include a detailed description of your project&apos;s goals and impact</li>
            <li>Add a concept note with specific outcomes and timeline</li>
            <li>Set a realistic funding goal to help prioritize donor outreach</li>
            <li>Use clear, compelling language that resonates with potential donors</li>
          </ul>
        </Card>
      </div>
    </DashboardLayout>
  );
}
