'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';

interface EngagementStrategy {
  id: string;
  type: 'email' | 'call' | 'meeting' | 'event' | 'letter';
  timing: string;
  approach: string;
  talking_points: string[];
  expected_outcome: string;
  risk_factors?: string[];
  follow_up_actions?: string[];
}

interface EngagementStrategyGeneratorProps {
  donorId: string;
  projectId?: string;
  donorName: string;
  projectName?: string;
  onStrategyGenerated?: (strategy: EngagementStrategy[]) => void;
}

/**
 * Engagement Strategy Generator
 *
 * AI-powered component to generate personalized engagement strategies.
 */
export function EngagementStrategyGenerator({
  donorId,
  projectId,
  donorName,
  projectName,
  onStrategyGenerated,
}: EngagementStrategyGeneratorProps) {
  const [strategies, setStrategies] = useState<EngagementStrategy[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);

  const generateStrategies = async () => {
    setIsGenerating(true);

    try {
      // In production, this would call the AI orchestrator
      // For now, generate mock strategies based on inputs
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const mockStrategies: EngagementStrategy[] = [
        {
          id: '1',
          type: 'meeting',
          timing: 'Within the next 2 weeks',
          approach: `Schedule a personal meeting with ${donorName} to discuss ${projectName || 'funding opportunities'}. Focus on their interests and how they align with organizational goals.`,
          talking_points: [
            'Recent organizational achievements',
            'Specific impact of their previous contributions',
            'Vision for the project and their role in it',
            'Flexible giving options',
          ],
          expected_outcome: 'Commitment to major gift or multi-year pledge',
          risk_factors: ['Calendar availability', 'Economic concerns'],
          follow_up_actions: ['Send meeting recap within 24 hours', 'Provide requested information'],
        },
        {
          id: '2',
          type: 'email',
          timing: 'This week',
          approach: 'Send a personalized email with impact report and upcoming opportunities.',
          talking_points: [
            'Thank them for past support',
            'Share specific outcomes from their giving',
            'Introduce new project aligned with their interests',
          ],
          expected_outcome: 'Open dialogue and schedule follow-up call',
          follow_up_actions: ['Call within 3 days if no response'],
        },
        {
          id: '3',
          type: 'event',
          timing: 'Next month',
          approach: 'Invite to exclusive donor appreciation event or site visit.',
          talking_points: [
            'VIP experience',
            'Meet beneficiaries and leadership',
            'Preview upcoming initiatives',
          ],
          expected_outcome: 'Deepen relationship and emotional connection',
          risk_factors: ['Event logistics', 'Travel requirements'],
        },
      ];

      setStrategies(mockStrategies);
      onStrategyGenerated?.(mockStrategies);
    } catch (error) {
      console.error('Error generating strategies:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getTypeIcon = (type: EngagementStrategy['type']) => {
    const icons: Record<EngagementStrategy['type'], string> = {
      email: '📧',
      call: '📞',
      meeting: '🤝',
      event: '🎉',
      letter: '✉️',
    };
    return icons[type];
  };

  const getTypeColor = (type: EngagementStrategy['type']) => {
    const colors: Record<EngagementStrategy['type'], string> = {
      email: 'bg-blue-100 text-blue-800',
      call: 'bg-green-100 text-green-800',
      meeting: 'bg-purple-100 text-purple-800',
      event: 'bg-amber-100 text-amber-800',
      letter: 'bg-gray-100 text-gray-800',
    };
    return colors[type];
  };

  if (isGenerating) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generating personalized strategies...</p>
          <p className="text-sm text-gray-400 mt-1">
            Analyzing donor history and preferences
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Engagement Strategy
          </h3>
          <p className="text-sm text-gray-500">
            AI-recommended approaches for {donorName}
          </p>
        </div>
        <Button
          variant={strategies.length > 0 ? 'secondary' : 'primary'}
          onClick={generateStrategies}
        >
          {strategies.length > 0 ? 'Regenerate' : 'Generate Strategies'}
        </Button>
      </div>

      {strategies.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          <span className="text-4xl mb-4 block">🎯</span>
          <p className="text-gray-500">
            Click Generate to create personalized engagement strategies
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Based on donor profile, giving history, and project alignment
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {strategies.map((strategy) => (
            <div
              key={strategy.id}
              className={`border rounded-lg transition-all ${
                selectedStrategy === strategy.id
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <button
                onClick={() =>
                  setSelectedStrategy(
                    selectedStrategy === strategy.id ? null : strategy.id
                  )
                }
                className="w-full p-4 text-left"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getTypeIcon(strategy.type)}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getTypeColor(strategy.type)}>
                        {strategy.type.charAt(0).toUpperCase() + strategy.type.slice(1)}
                      </Badge>
                      <span className="text-sm text-gray-500">{strategy.timing}</span>
                    </div>
                    <p className="text-gray-900">{strategy.approach}</p>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      selectedStrategy === strategy.id ? 'rotate-180' : ''
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
                </div>
              </button>

              {selectedStrategy === strategy.id && (
                <div className="px-4 pb-4 border-t border-gray-100 mt-2 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Talking Points
                      </h4>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        {strategy.talking_points.map((point, i) => (
                          <li key={i}>{point}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Expected Outcome
                      </h4>
                      <p className="text-sm text-gray-600 mb-4">
                        {strategy.expected_outcome}
                      </p>

                      {strategy.risk_factors && strategy.risk_factors.length > 0 && (
                        <>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">
                            Risk Factors
                          </h4>
                          <ul className="list-disc list-inside text-sm text-amber-600 space-y-1">
                            {strategy.risk_factors.map((risk, i) => (
                              <li key={i}>{risk}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  </div>

                  {strategy.follow_up_actions && strategy.follow_up_actions.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Follow-up Actions
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {strategy.follow_up_actions.map((action, i) => (
                          <Badge key={i} variant="secondary">
                            {action}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <Button variant="primary" size="sm">
                      Use This Strategy
                    </Button>
                    <Button variant="secondary" size="sm">
                      Create Engagement
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
