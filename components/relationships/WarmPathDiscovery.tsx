'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { createClient } from '@/lib/supabase/client';
import {
  discoverWarmPaths,
  type RelationshipNode,
  type RelationshipEdge,
  type WarmPathResult,
} from '@/lib/algorithms/warm-path';

interface WarmPathDiscoveryProps {
  fromDonorId: string;
  toDonorId?: string;
  fromDonorName: string;
  toDonorName?: string;
}

/**
 * Warm Path Discovery Component
 *
 * Visualizes relationship paths between donors/prospects.
 */
export function WarmPathDiscovery({
  fromDonorId,
  toDonorId,
  fromDonorName,
  toDonorName,
}: WarmPathDiscoveryProps) {
  const [result, setResult] = useState<WarmPathResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<string | null>(toDonorId || null);
  const [prospects, setProspects] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    // Fetch available prospects/donors to connect to
    async function fetchProspects() {
      const supabase = createClient();
      const { data } = await supabase
        .from('donors')
        .select('id, name')
        .neq('id', fromDonorId)
        .limit(20);

      if (data) {
        setProspects(data);
      }
    }

    if (!toDonorId) {
      fetchProspects();
    }
  }, [fromDonorId, toDonorId]);

  const discoverPaths = async () => {
    if (!selectedProspect) return;

    setIsLoading(true);

    try {
      const supabase = createClient();

      // Fetch relationships (using type assertion due to schema variations)
      const { data: relationships } = await supabase
        .from('relationships')
        .select('*') as { data: Array<{
          id: string;
          source_donor_id?: string;
          target_donor_id?: string;
          donor_id?: string;
          related_donor_id?: string;
          relationship_type?: string;
          strength_score?: number;
          metadata?: Record<string, unknown>;
        }> | null };

      // Fetch donors for node data
      const { data: donors } = await supabase
        .from('donors')
        .select('id, name') as { data: Array<{
          id: string;
          name: string;
        }> | null };

      if (!relationships || !donors) {
        throw new Error('Failed to fetch relationship data');
      }

      // Build nodes
      const nodes: RelationshipNode[] = donors.map((d) => ({
        id: d.id,
        name: d.name,
        type: 'donor' as const,
      }));

      // Build edges (handle different column naming conventions)
      const edges: RelationshipEdge[] = relationships.map((r) => ({
        source: r.source_donor_id || r.donor_id || '',
        target: r.target_donor_id || r.related_donor_id || '',
        type: (r.relationship_type as RelationshipEdge['type']) || 'other',
        strength: r.strength_score || 50,
        metadata: r.metadata,
      })).filter(e => e.source && e.target);

      // Find warm paths
      const pathResult = discoverWarmPaths(nodes, edges, fromDonorId, selectedProspect);
      setResult(pathResult);
    } catch (error) {
      console.error('Error discovering warm paths:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getConnectionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      board: 'bg-purple-100 text-purple-800',
      professional: 'bg-blue-100 text-blue-800',
      personal: 'bg-green-100 text-green-800',
      family: 'bg-pink-100 text-pink-800',
      alumni: 'bg-amber-100 text-amber-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[type] || colors.other;
  };

  const getStrengthColor = (strength: number) => {
    if (strength >= 80) return 'text-green-600';
    if (strength >= 60) return 'text-yellow-600';
    if (strength >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Warm Path Discovery
          </h3>
          <p className="text-sm text-gray-500">
            Find connection paths from {fromDonorName}
          </p>
        </div>
        <span className="text-2xl">🔗</span>
      </div>

      {/* Prospect Selection */}
      {!toDonorId && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Connect to:
          </label>
          <select
            value={selectedProspect || ''}
            onChange={(e) => setSelectedProspect(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="">Select a prospect or donor</option>
            {prospects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <Button
        variant="primary"
        onClick={discoverPaths}
        disabled={!selectedProspect || isLoading}
        className="mb-4"
      >
        {isLoading ? 'Analyzing Network...' : 'Discover Paths'}
      </Button>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="p-4 border rounded-lg">
              <Skeleton className="h-4 w-32 mb-2" />
              <div className="flex gap-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-8 w-24" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {result && !isLoading && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {result.directConnection ? (
                <Badge className="bg-green-100 text-green-800">
                  Direct Connection
                </Badge>
              ) : result.paths.length > 0 ? (
                <Badge className="bg-blue-100 text-blue-800">
                  {result.paths.length} Path{result.paths.length !== 1 ? 's' : ''} Found
                </Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-800">
                  No Paths Found
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600">
              {result.directConnection
                ? `You have a direct relationship with ${result.toNode.name}.`
                : result.paths.length > 0
                ? `Found ${result.paths.length} connection path(s) to ${result.toNode.name}.`
                : `No warm paths found to ${result.toNode.name}. Consider cold outreach or expanding your network.`}
            </p>
          </div>

          {/* Path List */}
          {result.paths.map((path, index) => (
            <div
              key={index}
              className={`p-4 border rounded-lg ${
                index === 0 ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
              }`}
            >
              {index === 0 && (
                <Badge className="bg-blue-600 text-white mb-2">
                  Recommended Path
                </Badge>
              )}

              {/* Path Visualization */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                {path.path.map((node, nodeIndex) => (
                  <div key={node.id} className="flex items-center gap-2">
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        nodeIndex === 0 || nodeIndex === path.path.length - 1
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {node.name}
                    </div>
                    {nodeIndex < path.path.length - 1 && (
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    )}
                  </div>
                ))}
              </div>

              {/* Path Metrics */}
              <div className="flex items-center gap-4 text-sm mb-3">
                <span className={getStrengthColor(path.averageStrength)}>
                  Avg Strength: {Math.round(path.averageStrength)}%
                </span>
                <span className="text-gray-500">
                  {path.path.length - 1} hop{path.path.length - 1 !== 1 ? 's' : ''}
                </span>
                <div className="flex gap-1">
                  {path.connectionTypes.map((type) => (
                    <Badge key={type} className={getConnectionTypeColor(type)}>
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Suggested Approach */}
              <div className="p-3 bg-white rounded border border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Suggested Approach:
                </p>
                <p className="text-sm text-gray-600">{path.suggestedApproach}</p>
              </div>

              {index === 0 && (
                <div className="mt-3 flex gap-2">
                  <Button variant="primary" size="sm">
                    Request Introduction
                  </Button>
                  <Button variant="secondary" size="sm">
                    Create Engagement Plan
                  </Button>
                </div>
              )}
            </div>
          ))}

          {result.paths.length === 0 && !result.directConnection && (
            <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
              <span className="text-3xl mb-2 block">🤔</span>
              <p className="text-gray-500">No warm introduction paths found</p>
              <p className="text-sm text-gray-400 mt-1">
                Consider adding more relationship data or using a cold outreach strategy
              </p>
              <Button variant="secondary" size="sm" className="mt-4">
                Try Cold Outreach
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
