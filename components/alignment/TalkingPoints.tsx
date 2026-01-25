'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

interface TalkingPoint {
  id: string;
  category: string;
  point: string;
  supporting_facts?: string[];
}

interface TalkingPointsProps {
  donorId: string;
  projectId: string;
  points?: TalkingPoint[];
  isLoading?: boolean;
  onGenerate?: () => void;
}

/**
 * Talking Points Component
 *
 * Displays AI-generated talking points for donor-project conversations.
 */
export function TalkingPoints({
  donorId,
  projectId,
  points = [],
  isLoading = false,
  onGenerate,
}: TalkingPointsProps) {
  const [expandedPoint, setExpandedPoint] = useState<string | null>(null);

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'shared_values': '💡',
      'impact': '🎯',
      'connection': '🤝',
      'history': '📜',
      'opportunity': '⭐',
      'ask': '💬',
    };
    return icons[category.toLowerCase()] || '📌';
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'shared_values': 'Shared Values',
      'impact': 'Impact Potential',
      'connection': 'Personal Connection',
      'history': 'Giving History',
      'opportunity': 'Opportunity',
      'ask': 'The Ask',
    };
    return labels[category.toLowerCase()] || category;
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Talking Points</h3>
        {onGenerate && (
          <Button variant="secondary" size="sm" onClick={onGenerate}>
            Regenerate
          </Button>
        )}
      </div>

      {points.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-gray-500 mb-4">No talking points generated yet</p>
          {onGenerate && (
            <Button variant="primary" onClick={onGenerate}>
              Generate Talking Points
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {points.map((point) => (
            <div
              key={point.id}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <button
                onClick={() =>
                  setExpandedPoint(expandedPoint === point.id ? null : point.id)
                }
                className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-xl flex-shrink-0">
                  {getCategoryIcon(point.category)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    {getCategoryLabel(point.category)}
                  </p>
                  <p className="text-gray-900">{point.point}</p>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    expandedPoint === point.id ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {expandedPoint === point.id && point.supporting_facts && (
                <div className="px-4 pb-4 pl-14">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Supporting Facts:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    {point.supporting_facts.map((fact, i) => (
                      <li key={i}>{fact}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <span className="font-medium">Tip:</span> These talking points are
          AI-generated based on donor interests and project goals. Personalize
          them for your conversation.
        </p>
      </div>
    </Card>
  );
}
