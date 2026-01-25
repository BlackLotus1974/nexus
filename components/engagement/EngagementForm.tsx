'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createClient } from '@/lib/supabase/client';

interface EngagementFormData {
  type: 'email' | 'call' | 'meeting' | 'event' | 'letter' | 'other';
  status: 'planned' | 'completed';
  scheduled_date?: string;
  completed_date?: string;
  notes: string;
  outcome?: string;
  follow_up_date?: string;
}

interface EngagementFormProps {
  donorId: string;
  donorName: string;
  projectId?: string;
  projectName?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * Engagement Form Component
 *
 * Form for logging donor engagements.
 */
export function EngagementForm({
  donorId,
  donorName,
  projectId,
  projectName,
  onSuccess,
  onCancel,
}: EngagementFormProps) {
  const [formData, setFormData] = useState<EngagementFormData>({
    type: 'call',
    status: 'completed',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const engagementTypes = [
    { value: 'email', label: 'Email', icon: '📧' },
    { value: 'call', label: 'Phone Call', icon: '📞' },
    { value: 'meeting', label: 'Meeting', icon: '🤝' },
    { value: 'event', label: 'Event', icon: '🎉' },
    { value: 'letter', label: 'Letter', icon: '✉️' },
    { value: 'other', label: 'Other', icon: '📌' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();

      // Get current user's profile for organization_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) throw new Error('No organization found');

      // Log engagement as activity
      const { error: insertError } = await supabase
        .from('activity_log')
        .insert({
          organization_id: profile.organization_id,
          actor_id: user.id,
          activity_type: 'engagement_created',
          entity_type: 'donor',
          entity_id: donorId,
          metadata: {
            donor_name: donorName,
            project_id: projectId,
            project_name: projectName,
            engagement_type: formData.type,
            status: formData.status,
            scheduled_date: formData.scheduled_date,
            completed_date: formData.completed_date || new Date().toISOString(),
            notes: formData.notes,
            outcome: formData.outcome,
            follow_up_date: formData.follow_up_date,
          },
        });

      if (insertError) throw insertError;

      onSuccess?.();
    } catch (err) {
      console.error('Error logging engagement:', err);
      setError(err instanceof Error ? err.message : 'Failed to log engagement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Log Engagement
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Donor Info */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500">Donor</p>
          <p className="font-medium text-gray-900">{donorName}</p>
          {projectName && (
            <>
              <p className="text-sm text-gray-500 mt-2">Project</p>
              <p className="font-medium text-gray-900">{projectName}</p>
            </>
          )}
        </div>

        {/* Engagement Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type of Engagement
          </label>
          <div className="grid grid-cols-3 gap-2">
            {engagementTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setFormData({ ...formData, type: type.value as EngagementFormData['type'] })}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                  formData.type === type.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span>{type.icon}</span>
                <span className="text-sm">{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, status: 'completed' })}
              className={`flex-1 p-3 rounded-lg border transition-colors ${
                formData.status === 'completed'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              Completed
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, status: 'planned' })}
              className={`flex-1 p-3 rounded-lg border transition-colors ${
                formData.status === 'planned'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              Planned
            </button>
          </div>
        </div>

        {/* Date Fields */}
        {formData.status === 'planned' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scheduled Date
            </label>
            <Input
              type="datetime-local"
              value={formData.scheduled_date || ''}
              onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Completed
            </label>
            <Input
              type="datetime-local"
              value={formData.completed_date || ''}
              onChange={(e) => setFormData({ ...formData, completed_date: e.target.value })}
            />
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Describe the engagement, key discussion points, etc."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            required
          />
        </div>

        {/* Outcome (for completed engagements) */}
        {formData.status === 'completed' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Outcome (Optional)
            </label>
            <Input
              type="text"
              value={formData.outcome || ''}
              onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
              placeholder="e.g., Committed to $5,000 gift, Requested proposal"
            />
          </div>
        )}

        {/* Follow-up Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Follow-up Date (Optional)
          </label>
          <Input
            type="date"
            value={formData.follow_up_date || ''}
            onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Saving...' : 'Log Engagement'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
