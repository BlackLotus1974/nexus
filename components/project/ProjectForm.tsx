'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import type { Project } from '@/types';

export interface ProjectFormData {
  name: string;
  description: string;
  conceptNote: string;
  fundingGoal: string;
  status: 'active' | 'completed' | 'archived';
}

export interface ProjectFormProps {
  project?: Project;
  onSubmit: (data: ProjectFormData) => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: string | null;
  mode?: 'create' | 'edit';
}

interface FormErrors {
  name?: string;
  fundingGoal?: string;
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

function validateForm(data: ProjectFormData): FormErrors {
  const errors: FormErrors = {};

  if (!data.name.trim()) {
    errors.name = 'Project name is required';
  } else if (data.name.trim().length < 3) {
    errors.name = 'Project name must be at least 3 characters';
  } else if (data.name.trim().length > 100) {
    errors.name = 'Project name must be less than 100 characters';
  }

  if (data.fundingGoal) {
    const amount = parseFloat(data.fundingGoal);
    if (isNaN(amount)) {
      errors.fundingGoal = 'Funding goal must be a valid number';
    } else if (amount < 0) {
      errors.fundingGoal = 'Funding goal cannot be negative';
    } else if (amount > 1000000000) {
      errors.fundingGoal = 'Funding goal seems too large';
    }
  }

  return errors;
}

export function ProjectForm({
  project,
  onSubmit,
  onCancel,
  isLoading = false,
  error,
  mode = 'create',
}: ProjectFormProps) {
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    conceptNote: '',
    fundingGoal: '',
    status: 'active',
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Initialize form with project data when editing
  useEffect(() => {
    if (project && mode === 'edit') {
      setFormData({
        name: project.name,
        description: project.description || '',
        conceptNote: project.conceptNote || '',
        fundingGoal: project.fundingGoal?.toString() || '',
        status: project.status,
      });
    }
  }, [project, mode]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (formErrors[name as keyof FormErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));

    // Validate on blur
    const errors = validateForm(formData);
    if (errors[name as keyof FormErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: errors[name as keyof FormErrors] }));
    }
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      status: e.target.value as 'active' | 'completed' | 'archived',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      name: true,
      description: true,
      conceptNote: true,
      fundingGoal: true,
    });

    // Validate
    const errors = validateForm(formData);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="error">
          {error}
        </Alert>
      )}

      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Project Name <span className="text-red-500">*</span>
        </label>
        <Input
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Enter project name"
          error={touched.name ? formErrors.name : undefined}
          disabled={isLoading}
        />
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Describe your fundraising project..."
          rows={4}
          disabled={isLoading}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Brief description of the project goals and impact
        </p>
      </div>

      <div>
        <label
          htmlFor="fundingGoal"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Funding Goal ($)
        </label>
        <Input
          id="fundingGoal"
          name="fundingGoal"
          type="number"
          value={formData.fundingGoal}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="e.g., 50000"
          error={touched.fundingGoal ? formErrors.fundingGoal : undefined}
          disabled={isLoading}
          min="0"
          step="1"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Target amount to raise for this project
        </p>
      </div>

      <div>
        <label
          htmlFor="conceptNote"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Concept Note
        </label>
        <textarea
          id="conceptNote"
          name="conceptNote"
          value={formData.conceptNote}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Paste or type your concept note here..."
          rows={8}
          disabled={isLoading}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Detailed project proposal used for AI-powered donor matching
        </p>
      </div>

      {mode === 'edit' && (
        <div>
          <label
            htmlFor="status"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Status
          </label>
          <Select
            options={STATUS_OPTIONS}
            value={formData.status}
            onChange={handleStatusChange}
            disabled={isLoading}
          />
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" loading={isLoading}>
          {mode === 'create' ? 'Create Project' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}

export default ProjectForm;
