/**
 * Warm Path Discovery Algorithm
 *
 * Analyzes relationship networks to find connection paths between donors
 * and new prospects, identifying "warm" introduction opportunities.
 */

export interface RelationshipNode {
  id: string;
  name: string;
  type: 'donor' | 'prospect' | 'board_member' | 'staff' | 'contact';
  connectionStrength?: number;
  metadata?: Record<string, unknown>;
}

export interface RelationshipEdge {
  source: string;
  target: string;
  type: 'professional' | 'personal' | 'board' | 'family' | 'alumni' | 'other';
  strength: number; // 0-100
  metadata?: Record<string, unknown>;
}

export interface WarmPath {
  path: RelationshipNode[];
  totalStrength: number;
  averageStrength: number;
  connectionTypes: string[];
  suggestedApproach: string;
}

export interface WarmPathResult {
  fromNode: RelationshipNode;
  toNode: RelationshipNode;
  paths: WarmPath[];
  bestPath: WarmPath | null;
  directConnection: boolean;
}

/**
 * Graph representation for path finding
 */
class RelationshipGraph {
  private nodes: Map<string, RelationshipNode> = new Map();
  private adjacencyList: Map<string, Map<string, RelationshipEdge>> = new Map();

  addNode(node: RelationshipNode): void {
    this.nodes.set(node.id, node);
    if (!this.adjacencyList.has(node.id)) {
      this.adjacencyList.set(node.id, new Map());
    }
  }

  addEdge(edge: RelationshipEdge): void {
    // Ensure nodes exist
    if (!this.adjacencyList.has(edge.source)) {
      this.adjacencyList.set(edge.source, new Map());
    }
    if (!this.adjacencyList.has(edge.target)) {
      this.adjacencyList.set(edge.target, new Map());
    }

    // Add bidirectional edges
    this.adjacencyList.get(edge.source)!.set(edge.target, edge);
    this.adjacencyList.get(edge.target)!.set(edge.source, {
      ...edge,
      source: edge.target,
      target: edge.source,
    });
  }

  getNode(id: string): RelationshipNode | undefined {
    return this.nodes.get(id);
  }

  getNeighbors(id: string): Array<{ node: RelationshipNode; edge: RelationshipEdge }> {
    const edges = this.adjacencyList.get(id);
    if (!edges) return [];

    const neighbors: Array<{ node: RelationshipNode; edge: RelationshipEdge }> = [];
    edges.forEach((edge, targetId) => {
      const node = this.nodes.get(targetId);
      if (node) {
        neighbors.push({ node, edge });
      }
    });

    return neighbors;
  }

  hasDirectConnection(fromId: string, toId: string): boolean {
    const edges = this.adjacencyList.get(fromId);
    return edges?.has(toId) ?? false;
  }
}

/**
 * Find all paths between two nodes using BFS with path tracking
 */
function findAllPaths(
  graph: RelationshipGraph,
  startId: string,
  endId: string,
  maxDepth: number = 4,
  minStrength: number = 20
): Array<{ nodeIds: string[]; edges: RelationshipEdge[] }> {
  const paths: Array<{ nodeIds: string[]; edges: RelationshipEdge[] }> = [];

  interface QueueItem {
    nodeId: string;
    path: string[];
    edges: RelationshipEdge[];
  }

  const queue: QueueItem[] = [{ nodeId: startId, path: [startId], edges: [] }];

  while (queue.length > 0) {
    const { nodeId, path, edges } = queue.shift()!;

    if (nodeId === endId && path.length > 1) {
      paths.push({ nodeIds: path, edges });
      continue;
    }

    if (path.length >= maxDepth + 1) continue;

    const neighbors = graph.getNeighbors(nodeId);
    for (const { node, edge } of neighbors) {
      // Skip if already in path (avoid cycles)
      if (path.includes(node.id)) continue;

      // Skip weak connections
      if (edge.strength < minStrength) continue;

      queue.push({
        nodeId: node.id,
        path: [...path, node.id],
        edges: [...edges, edge],
      });
    }
  }

  return paths;
}

/**
 * Calculate path strength metrics
 */
function calculatePathStrength(edges: RelationshipEdge[]): {
  total: number;
  average: number;
  min: number;
} {
  if (edges.length === 0) {
    return { total: 0, average: 0, min: 0 };
  }

  const strengths = edges.map((e) => e.strength);
  const total = strengths.reduce((sum, s) => sum + s, 0);
  const average = total / strengths.length;
  const min = Math.min(...strengths);

  // Weighted score that penalizes weak links
  const weightedTotal = total * (min / 100);

  return { total: weightedTotal, average, min };
}

/**
 * Generate approach suggestion based on path characteristics
 */
function generateApproachSuggestion(
  path: RelationshipNode[],
  edges: RelationshipEdge[]
): string {
  if (path.length === 2) {
    return `Direct outreach is recommended. You have an existing relationship with ${path[1].name}.`;
  }

  const intermediaries = path.slice(1, -1);
  const primaryConnection = intermediaries[0];
  const connectionTypes = [...new Set(edges.map((e) => e.type))];

  let approach = `Request an introduction through ${primaryConnection.name}`;

  if (connectionTypes.includes('board')) {
    approach += ' (board connection - high credibility)';
  } else if (connectionTypes.includes('professional')) {
    approach += ' (professional network)';
  } else if (connectionTypes.includes('personal')) {
    approach += ' (personal relationship - approach with care)';
  }

  if (intermediaries.length > 1) {
    approach += `. Note: This requires ${intermediaries.length} introductions in sequence.`;
  }

  return approach;
}

/**
 * Main function to discover warm paths between two individuals
 */
export function discoverWarmPaths(
  nodes: RelationshipNode[],
  edges: RelationshipEdge[],
  fromId: string,
  toId: string,
  options: {
    maxDepth?: number;
    minStrength?: number;
    maxPaths?: number;
  } = {}
): WarmPathResult {
  const { maxDepth = 4, minStrength = 20, maxPaths = 5 } = options;

  // Build graph
  const graph = new RelationshipGraph();
  nodes.forEach((node) => graph.addNode(node));
  edges.forEach((edge) => graph.addEdge(edge));

  const fromNode = graph.getNode(fromId);
  const toNode = graph.getNode(toId);

  if (!fromNode || !toNode) {
    throw new Error('Source or target node not found');
  }

  // Check for direct connection
  const directConnection = graph.hasDirectConnection(fromId, toId);

  // Find all paths
  const rawPaths = findAllPaths(graph, fromId, toId, maxDepth, minStrength);

  // Convert to WarmPath format and calculate metrics
  const warmPaths: WarmPath[] = rawPaths.map(({ nodeIds, edges: pathEdges }) => {
    const pathNodes = nodeIds
      .map((id) => graph.getNode(id)!)
      .filter(Boolean);
    const strength = calculatePathStrength(pathEdges);
    const connectionTypes = [...new Set(pathEdges.map((e) => e.type))];

    return {
      path: pathNodes,
      totalStrength: strength.total,
      averageStrength: strength.average,
      connectionTypes,
      suggestedApproach: generateApproachSuggestion(pathNodes, pathEdges),
    };
  });

  // Sort by total strength (descending) and limit results
  warmPaths.sort((a, b) => b.totalStrength - a.totalStrength);
  const limitedPaths = warmPaths.slice(0, maxPaths);

  return {
    fromNode,
    toNode,
    paths: limitedPaths,
    bestPath: limitedPaths[0] || null,
    directConnection,
  };
}

/**
 * Analyze network to find best introduction opportunities for a prospect
 */
export function findBestIntroducers(
  nodes: RelationshipNode[],
  edges: RelationshipEdge[],
  prospectId: string,
  options: {
    minStrength?: number;
    preferredTypes?: RelationshipEdge['type'][];
  } = {}
): Array<{
  introducer: RelationshipNode;
  connectionToProspect: RelationshipEdge;
  score: number;
}> {
  const { minStrength = 30, preferredTypes = ['board', 'professional'] } = options;

  // Find all direct connections to the prospect
  const prospectEdges = edges.filter(
    (e) =>
      (e.source === prospectId || e.target === prospectId) &&
      e.strength >= minStrength
  );

  const introducers: Array<{
    introducer: RelationshipNode;
    connectionToProspect: RelationshipEdge;
    score: number;
  }> = [];

  for (const edge of prospectEdges) {
    const introducerId = edge.source === prospectId ? edge.target : edge.source;
    const introducer = nodes.find((n) => n.id === introducerId);

    if (!introducer) continue;

    // Calculate score based on strength and type preference
    let score = edge.strength;
    if (preferredTypes.includes(edge.type)) {
      score *= 1.5;
    }
    if (introducer.type === 'board_member') {
      score *= 1.3;
    }
    if (introducer.type === 'donor') {
      score *= 1.2;
    }

    introducers.push({
      introducer,
      connectionToProspect: edge,
      score,
    });
  }

  // Sort by score descending
  introducers.sort((a, b) => b.score - a.score);

  return introducers;
}

/**
 * Calculate network centrality for relationship mapping
 * Identifies key connectors in the network
 */
export function calculateNetworkCentrality(
  nodes: RelationshipNode[],
  edges: RelationshipEdge[]
): Map<string, number> {
  const centralityScores = new Map<string, number>();

  // Initialize scores
  nodes.forEach((node) => centralityScores.set(node.id, 0));

  // Count weighted connections for each node
  edges.forEach((edge) => {
    const sourceScore = centralityScores.get(edge.source) || 0;
    const targetScore = centralityScores.get(edge.target) || 0;

    centralityScores.set(edge.source, sourceScore + edge.strength);
    centralityScores.set(edge.target, targetScore + edge.strength);
  });

  // Normalize scores
  const maxScore = Math.max(...centralityScores.values());
  if (maxScore > 0) {
    centralityScores.forEach((score, id) => {
      centralityScores.set(id, Math.round((score / maxScore) * 100));
    });
  }

  return centralityScores;
}
