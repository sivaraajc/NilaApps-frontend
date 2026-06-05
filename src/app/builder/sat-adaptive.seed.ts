import { LearningPath, PathNode } from '../models/learning-path.models';

/** Exact canvas coordinates matching the UI mockup center spine. */
export const SAT_ADAPTIVE_POSITIONS: Record<string, { x: number; y: number }> = {
  'node-start': { x: 400, y: 30 },
  'node-math-1': { x: 390, y: 120 },
  'node-math-2-group': { x: 380, y: 240 },
  'node-math-2-easy': { x: 170, y: 390 },
  'node-math-2-advanced': { x: 610, y: 390 },
  'node-reading-1': { x: 390, y: 540 },
  'node-reading-2-group': { x: 380, y: 660 },
  'node-reading-2-easy': { x: 170, y: 810 },
  'node-reading-2-advanced': { x: 610, y: 810 },
  'node-end': { x: 400, y: 960 },
};

export const SAT_ADAPTIVE_NODE_IDS = Object.keys(SAT_ADAPTIVE_POSITIONS);

export const SAT_ADAPTIVE_SEED: LearningPath = {
  id: 'lp-sat-adaptive-001',
  name: 'SAT Adaptive Path',
  description: 'Routes learners based on math and reading performance.',
  status: 'draft',
  version: 1,
  canvas: { zoom: 0.7, offsetX: 0, offsetY: 0 },
  nodes: [
    {
      id: 'node-start',
      componentId: 'system-start',
      type: 'start',
      label: 'Start Assessment',
      position: SAT_ADAPTIVE_POSITIONS['node-start'],
    },
    {
      id: 'node-math-1',
      componentId: 'cmp-assess-math-1',
      type: 'assessment',
      label: 'Math Module 1',
      position: SAT_ADAPTIVE_POSITIONS['node-math-1'],
      config: {
        questionCount: 22,
        approximateDurationMinutes: 35,
        difficulty: 'medium',
        assessment: { maxScore: 100, passingScore: 50 },
      },
    },
    {
      id: 'node-math-2-group',
      componentId: 'system-group',
      type: 'unit',
      label: 'Math Module 2',
      description: 'Adaptive based on Module 1 performance',
      position: SAT_ADAPTIVE_POSITIONS['node-math-2-group'],
      config: { isGroup: true },
    },
    {
      id: 'node-math-2-easy',
      componentId: 'cmp-unit-math-2-easy',
      type: 'unit',
      label: 'Math Module 2 - Easy',
      position: SAT_ADAPTIVE_POSITIONS['node-math-2-easy'],
      config: {
        questionCount: 22,
        approximateDurationMinutes: 35,
        difficulty: 'easy',
      },
    },
    {
      id: 'node-math-2-advanced',
      componentId: 'cmp-unit-math-2-advanced',
      type: 'unit',
      label: 'Math Module 2 - Advanced',
      position: SAT_ADAPTIVE_POSITIONS['node-math-2-advanced'],
      config: {
        questionCount: 22,
        approximateDurationMinutes: 35,
        difficulty: 'hard',
      },
    },
    {
      id: 'node-reading-1',
      componentId: 'cmp-assess-reading-1',
      type: 'assessment',
      label: 'Reading & Comp Module 1',
      position: SAT_ADAPTIVE_POSITIONS['node-reading-1'],
      config: {
        questionCount: 27,
        approximateDurationMinutes: 32,
        difficulty: 'medium',
        assessment: { maxScore: 100, passingScore: 50 },
      },
    },
    {
      id: 'node-reading-2-group',
      componentId: 'system-group',
      type: 'unit',
      label: 'Reading & Comp Module 2',
      description: 'Adaptive based on Module 1 performance',
      position: SAT_ADAPTIVE_POSITIONS['node-reading-2-group'],
      config: { isGroup: true },
    },
    {
      id: 'node-reading-2-easy',
      componentId: 'cmp-unit-reading-remediation',
      type: 'unit',
      label: 'R&C Module 2 - Easy',
      position: SAT_ADAPTIVE_POSITIONS['node-reading-2-easy'],
      config: {
        questionCount: 27,
        approximateDurationMinutes: 32,
        difficulty: 'easy',
      },
    },
    {
      id: 'node-reading-2-advanced',
      componentId: 'cmp-unit-reading-advanced',
      type: 'unit',
      label: 'R&C Module 2 - Advanced',
      position: SAT_ADAPTIVE_POSITIONS['node-reading-2-advanced'],
      config: {
        questionCount: 27,
        approximateDurationMinutes: 32,
        difficulty: 'hard',
      },
    },
    {
      id: 'node-end',
      componentId: 'system-end',
      type: 'end',
      label: 'Complete Assessment',
      position: SAT_ADAPTIVE_POSITIONS['node-end'],
    },
  ],
  edges: [
    {
      id: 'edge-start-math1',
      sourceNodeId: 'node-start',
      targetNodeId: 'node-math-1',
      label: 'Begin',
      priority: 1,
      isDefault: true,
      conditions: { operator: 'AND', rules: [] },
    },
    {
      id: 'edge-math1-group',
      sourceNodeId: 'node-math-1',
      targetNodeId: 'node-math-2-group',
      label: 'Continue',
      priority: 1,
      isDefault: true,
      conditions: { operator: 'AND', rules: [] },
    },
    {
      id: 'edge-group-math-easy',
      sourceNodeId: 'node-math-2-group',
      targetNodeId: 'node-math-2-easy',
      label: 'Score below 50%',
      priority: 1,
      isDefault: false,
      conditions: {
        operator: 'AND',
        rules: [
          {
            id: 'rule-math-easy',
            sourceType: 'assessment',
            sourceNodeId: 'node-math-1',
            metric: 'score',
            operator: 'lt',
            value: 50,
          },
        ],
      },
    },
    {
      id: 'edge-group-math-advanced',
      sourceNodeId: 'node-math-2-group',
      targetNodeId: 'node-math-2-advanced',
      label: 'Score 50% or above',
      priority: 2,
      isDefault: false,
      conditions: {
        operator: 'AND',
        rules: [
          {
            id: 'rule-math-advanced',
            sourceType: 'assessment',
            sourceNodeId: 'node-math-1',
            metric: 'score',
            operator: 'gte',
            value: 50,
          },
        ],
      },
    },
    {
      id: 'edge-math-easy-reading',
      sourceNodeId: 'node-math-2-easy',
      targetNodeId: 'node-reading-1',
      priority: 1,
      isDefault: true,
      conditions: { operator: 'AND', rules: [] },
    },
    {
      id: 'edge-math-advanced-reading',
      sourceNodeId: 'node-math-2-advanced',
      targetNodeId: 'node-reading-1',
      priority: 1,
      isDefault: true,
      conditions: { operator: 'AND', rules: [] },
    },
    {
      id: 'edge-reading1-group',
      sourceNodeId: 'node-reading-1',
      targetNodeId: 'node-reading-2-group',
      priority: 1,
      isDefault: true,
      conditions: { operator: 'AND', rules: [] },
    },
    {
      id: 'edge-group-reading-easy',
      sourceNodeId: 'node-reading-2-group',
      targetNodeId: 'node-reading-2-easy',
      priority: 1,
      isDefault: false,
      conditions: {
        operator: 'AND',
        rules: [
          {
            id: 'rule-reading-easy',
            sourceType: 'assessment',
            sourceNodeId: 'node-reading-1',
            metric: 'score',
            operator: 'lt',
            value: 50,
          },
        ],
      },
    },
    {
      id: 'edge-group-reading-advanced',
      sourceNodeId: 'node-reading-2-group',
      targetNodeId: 'node-reading-2-advanced',
      priority: 2,
      isDefault: false,
      conditions: {
        operator: 'AND',
        rules: [
          {
            id: 'rule-reading-advanced',
            sourceType: 'assessment',
            sourceNodeId: 'node-reading-1',
            metric: 'score',
            operator: 'gte',
            value: 50,
          },
        ],
      },
    },
    {
      id: 'edge-reading-easy-end',
      sourceNodeId: 'node-reading-2-easy',
      targetNodeId: 'node-end',
      priority: 1,
      isDefault: true,
      conditions: { operator: 'AND', rules: [] },
    },
    {
      id: 'edge-reading-advanced-end',
      sourceNodeId: 'node-reading-2-advanced',
      targetNodeId: 'node-end',
      priority: 1,
      isDefault: true,
      conditions: { operator: 'AND', rules: [] },
    },
  ],
};

function isGroupNode(node: PathNode): boolean {
  return !!node.config?.isGroup || node.componentId === 'system-group';
}

export function isValidSatAdaptivePath(path: LearningPath): boolean {
  if (path.id !== 'lp-sat-adaptive-001') return true;
  const ids = new Set(path.nodes.map((n) => n.id));
  const hasSpine =
    SAT_ADAPTIVE_NODE_IDS.every((id) => ids.has(id)) &&
    path.nodes.length === SAT_ADAPTIVE_NODE_IDS.length;
  const hasGroups = path.nodes.filter(isGroupNode).length >= 2;
  return hasSpine && hasGroups && path.edges.length >= 11;
}

export function normalizeSatAdaptivePath(path: LearningPath): LearningPath {
  if (path.id !== 'lp-sat-adaptive-001') return path;
  if (!isValidSatAdaptivePath(path)) {
    return {
      ...SAT_ADAPTIVE_SEED,
      status: path.status,
      version: path.version ?? 1,
    };
  }
  return {
    ...path,
    canvas: { zoom: 0.7, offsetX: 0, offsetY: 0, ...path.canvas },
    nodes: path.nodes.map((n) => ({
      ...n,
      position: SAT_ADAPTIVE_POSITIONS[n.id] ?? n.position,
    })),
  };
}
