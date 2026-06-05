import { PathEdge, PathNode } from '../models/learning-path.models';
import { SAT_ADAPTIVE_POSITIONS } from './sat-adaptive.seed';

export const SPINE_CENTER_X = 500;

function isGroupNode(node: PathNode): boolean {
  return !!node.config?.isGroup || node.componentId === 'system-group';
}

export function applyCenteredPathLayout(
  nodes: PathNode[],
  _edges: PathEdge[],
): PathNode[] {
  return nodes.map((n) => ({
    ...n,
    position: SAT_ADAPTIVE_POSITIONS[n.id] ?? n.position,
  }));
}

export function getNodeDimensions(node: PathNode): { width: number; height: number } {
  if (node.type === 'start' || node.type === 'end') {
    return { width: 200, height: 48 };
  }
  if (isGroupNode(node)) {
    return { width: 240, height: 96 };
  }
  return { width: 220, height: 92 };
}

export function buildEdgePath(
  edge: PathEdge,
  nodes: PathNode[],
  edges: PathEdge[],
): string {
  const source = nodes.find((n) => n.id === edge.sourceNodeId);
  const target = nodes.find((n) => n.id === edge.targetNodeId);
  if (!source || !target) return '';

  const sDim = getNodeDimensions(source);
  const tDim = getNodeDimensions(target);
  const sx = source.position.x + sDim.width / 2;
  const sy = source.position.y + sDim.height;
  const tx = target.position.x + tDim.width / 2;
  const ty = target.position.y;

  const isConditional = !edge.isDefault && (edge.conditions?.rules?.length ?? 0) > 0;
  const branchFromGroup = isGroupNode(source) && isConditional;
  const incomingCount = edges.filter((e) => e.targetNodeId === target.id).length;
  const mergeIntoSpine = incomingCount > 1 && Math.abs(tx - SPINE_CENTER_X) < 60;

  if (branchFromGroup) {
    const dropY = sy + 30;
    const fanY = dropY + 50;
    return `M ${sx} ${sy} L ${sx} ${dropY} C ${sx} ${fanY}, ${tx} ${fanY}, ${tx} ${ty}`;
  }

  if (mergeIntoSpine && Math.abs(sx - tx) > 50) {
    const mergeY = ty - 30;
    return `M ${sx} ${sy} C ${sx} ${mergeY}, ${tx} ${mergeY}, ${tx} ${ty}`;
  }

  if (Math.abs(sx - tx) < 6) {
    return `M ${sx} ${sy} L ${tx} ${ty}`;
  }

  const midY = (sy + ty) / 2;
  return `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`;
}
