export type ContentType = 'unit' | 'assessment';
export type NodeType = 'start' | 'unit' | 'assessment' | 'end';
export type PathStatus = 'draft' | 'published';

export interface AssessmentMetadata {
  maxScore: number;
  passingScore: number;
}

export interface UnitMetadata {
  recommendedMinutes?: number;
}

export interface ComponentMetadata {
  assessment?: AssessmentMetadata;
  unit?: UnitMetadata;
}

export interface ContentComponent {
  id: string;
  title: string;
  shortDescription: string;
  type: ContentType;
  approximateDurationMinutes: number;
  metadata?: ComponentMetadata;
}

export interface AvailableContentResponse {
  items: ContentComponent[];
  totalCount: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface CanvasState {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export interface NodeConfig {
  approximateDurationMinutes?: number;
  assessment?: AssessmentMetadata;
  questionCount?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'adaptive';
  isGroup?: boolean;
}

export interface PaletteItem {
  kind: 'section' | 'group';
  label: string;
  description: string;
}

export interface PathNode {
  id: string;
  componentId: string;
  type: NodeType;
  label: string;
  description?: string;
  position: Position;
  config?: NodeConfig;
}

export interface ScoreRange {
  min: number;
  max: number;
  minInclusive?: boolean;
  maxInclusive?: boolean;
}

export interface ConditionRule {
  id: string;
  sourceType: 'assessment' | 'unit';
  sourceNodeId: string;
  metric: string;
  operator: string;
  value?: boolean | number | string;
  range?: ScoreRange;
}

export interface ConditionGroup {
  operator: 'AND' | 'OR';
  rules: ConditionRule[];
}

export interface PathEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  label?: string;
  priority?: number;
  isDefault?: boolean;
  conditions: ConditionGroup;
}

export interface LearningPath {
  id?: string;
  name: string;
  description?: string;
  status: PathStatus;
  version?: number;
  canvas?: CanvasState;
  nodes: PathNode[];
  edges: PathEdge[];
}

export type Selection =
  | { kind: 'node'; id: string }
  | { kind: 'edge'; id: string }
  | null;
