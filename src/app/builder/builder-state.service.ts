import { Injectable, signal, computed } from '@angular/core';
import {
  CanvasState,
  ConditionGroup,
  ConditionRule,
  ContentComponent,
  LearningPath,
  PathEdge,
  PathNode,
  Selection,
} from '../models/learning-path.models';
import { applyCenteredPathLayout } from './path-layout.util';
import { normalizeSatAdaptivePath } from './sat-adaptive.seed';

@Injectable()
export class BuilderStateService {
  readonly pathId = signal<string | undefined>('lp-sat-adaptive-001');
  readonly pathName = signal('SAT Adaptive Path');
  readonly pathDescription = signal('Routes learners based on math and reading performance.');
  readonly pathStatus = signal<'draft' | 'published'>('draft');
  readonly pathVersion = signal(1);
  readonly canvas = signal<CanvasState>({ zoom: 1, offsetX: 0, offsetY: 0 });
  readonly nodes = signal<PathNode[]>([]);
  readonly edges = signal<PathEdge[]>([]);
  readonly selection = signal<Selection>(null);
  readonly connectFromNodeId = signal<string | null>(null);
  readonly saveMessage = signal<string | null>(null);
  readonly viewMode = signal<'builder' | 'preview'>('builder');

  readonly selectedNode = computed(() => {
    const sel = this.selection();
    if (!sel || sel.kind !== 'node') return null;
    return this.nodes().find((n) => n.id === sel.id) ?? null;
  });

  readonly selectedEdge = computed(() => {
    const sel = this.selection();
    if (!sel || sel.kind !== 'edge') return null;
    return this.edges().find((e) => e.id === sel.id) ?? null;
  });

  loadPath(path: LearningPath): void {
    const normalized = normalizeSatAdaptivePath(path);
    this.pathId.set(normalized.id);
    this.pathName.set(normalized.name);
    this.pathDescription.set(normalized.description ?? '');
    this.pathStatus.set(normalized.status);
    this.pathVersion.set(normalized.version ?? 1);
    this.canvas.set({
      zoom: normalized.canvas?.zoom ?? 0.7,
      offsetX: normalized.canvas?.offsetX ?? 0,
      offsetY: normalized.canvas?.offsetY ?? 0,
    });
    const nodes =
      normalized.id === 'lp-sat-adaptive-001'
        ? applyCenteredPathLayout([...normalized.nodes], [...normalized.edges])
        : [...normalized.nodes];
    this.nodes.set(nodes);
    this.edges.set([...normalized.edges]);
    this.selection.set(null);
  }

  toPayload(): LearningPath {
    return {
      id: this.pathId(),
      name: this.pathName(),
      description: this.pathDescription(),
      status: this.pathStatus(),
      version: this.pathVersion(),
      canvas: this.canvas(),
      nodes: this.nodes(),
      edges: this.edges(),
    };
  }

  addSectionNode(position: { x: number; y: number }, label = 'New Section'): void {
    const id = `node-section-${Date.now()}`;
    const node: PathNode = {
      id,
      componentId: 'system-section',
      type: 'assessment',
      label,
      position,
      config: {
        questionCount: 0,
        approximateDurationMinutes: 0,
        difficulty: 'medium',
      },
    };
    this.nodes.update((n) => [...n, node]);
    this.selection.set({ kind: 'node', id });
  }

  addGroupNode(position: { x: number; y: number }, label = 'New Group'): void {
    const id = `node-group-${Date.now()}`;
    const node: PathNode = {
      id,
      componentId: 'system-group',
      type: 'unit',
      label,
      description: 'Group sections for conditional routing',
      position,
      config: { isGroup: true },
    };
    this.nodes.update((n) => [...n, node]);
    this.selection.set({ kind: 'node', id });
  }

  addNodeFromComponent(component: ContentComponent, position: { x: number; y: number }): void {
    const id = `node-${component.id}-${Date.now()}`;
    const questionCount =
      component.type === 'assessment'
        ? Math.max(10, Math.round((component.metadata?.assessment?.maxScore ?? 100) / 4.5))
        : undefined;
    const node: PathNode = {
      id,
      componentId: component.id,
      type: component.type,
      label: component.title,
      position,
      config: {
        approximateDurationMinutes: component.approximateDurationMinutes,
        assessment: component.metadata?.assessment,
        questionCount,
        difficulty: component.title.toLowerCase().includes('easy')
          ? 'easy'
          : component.title.toLowerCase().includes('advanced')
            ? 'hard'
            : 'medium',
      },
    };
    this.nodes.update((n) => [...n, node]);
    this.selection.set({ kind: 'node', id });
  }

  addStartNode(): void {
    if (this.nodes().some((n) => n.type === 'start')) return;
    const node: PathNode = {
      id: 'node-start',
      componentId: 'system-start',
      type: 'start',
      label: 'Start Assessment',
      position: { x: 420, y: 80 },
    };
    this.nodes.update((n) => [node, ...n]);
  }

  addEndNode(): void {
    if (this.nodes().some((n) => n.type === 'end')) return;
    const node: PathNode = {
      id: 'node-end',
      componentId: 'system-end',
      type: 'end',
      label: 'Complete Assessment',
      position: { x: 420, y: 480 },
    };
    this.nodes.update((n) => [...n, node]);
  }

  setZoom(zoom: number): void {
    const z = Math.min(1.5, Math.max(0.4, zoom));
    this.canvas.update((c) => ({ ...c, zoom: z }));
  }

  publish(): void {
    this.pathStatus.set('published');
  }

  saveDraft(): void {
    this.pathStatus.set('draft');
  }

  updateNode(node: PathNode): void {
    this.nodes.update((list) => list.map((n) => (n.id === node.id ? { ...node } : n)));
  }

  updateNodePosition(id: string, x: number, y: number): void {
    this.nodes.update((list) =>
      list.map((n) => (n.id === id ? { ...n, position: { x, y } } : n)),
    );
  }

  removeNode(id: string): void {
    const type = this.nodes().find((n) => n.id === id)?.type;
    if (type === 'start' || type === 'end') return;    this.nodes.update((list) => list.filter((n) => n.id !== id));
    this.edges.update((list) =>
      list.filter((e) => e.sourceNodeId !== id && e.targetNodeId !== id),
    );
    this.selection.set(null);
  }

  addEdge(sourceNodeId: string, targetNodeId: string): void {
    if (sourceNodeId === targetNodeId) return;
    const exists = this.edges().some(
      (e) => e.sourceNodeId === sourceNodeId && e.targetNodeId === targetNodeId,
    );
    if (exists) return;
    const edge: PathEdge = {
      id: `edge-${sourceNodeId}-${targetNodeId}-${Date.now()}`,
      sourceNodeId,
      targetNodeId,
      label: 'New connection',
      priority: this.edges().filter((e) => e.sourceNodeId === sourceNodeId).length + 1,
      isDefault: false,
      conditions: { operator: 'AND', rules: [] },
    };
    this.edges.update((e) => [...e, edge]);
    this.selection.set({ kind: 'edge', id: edge.id });
    this.connectFromNodeId.set(null);
  }

  updateEdge(edge: PathEdge): void {
    this.edges.update((list) => list.map((e) => (e.id === edge.id ? { ...edge } : e)));
  }

  removeEdge(id: string): void {
    this.edges.update((list) => list.filter((e) => e.id !== id));
    this.selection.set(null);
  }

  addRuleToEdge(edgeId: string, rule: ConditionRule): void {
    this.edges.update((list) =>
      list.map((e) => {
        if (e.id !== edgeId) return e;
        return {
          ...e,
          conditions: {
            ...e.conditions,
            rules: [...e.conditions.rules, rule],
          },
        };
      }),
    );
  }

  updateRule(edgeId: string, rule: ConditionRule): void {
    this.edges.update((list) =>
      list.map((e) => {
        if (e.id !== edgeId) return e;
        return {
          ...e,
          conditions: {
            ...e.conditions,
            rules: e.conditions.rules.map((r) => (r.id === rule.id ? rule : r)),
          },
        };
      }),
    );
  }

  removeRule(edgeId: string, ruleId: string): void {
    this.edges.update((list) =>
      list.map((e) => {
        if (e.id !== edgeId) return e;
        return {
          ...e,
          conditions: {
            ...e.conditions,
            rules: e.conditions.rules.filter((r) => r.id !== ruleId),
          },
        };
      }),
    );
  }

  selectNode(id: string): void {
    this.selection.set({ kind: 'node', id });
    this.connectFromNodeId.set(null);
  }

  selectEdge(id: string): void {
    this.selection.set({ kind: 'edge', id });
    this.connectFromNodeId.set(null);
  }

  clearSelection(): void {
    this.selection.set(null);
  }

  beginConnection(nodeId: string): void {
    this.connectFromNodeId.set(nodeId);
    this.selection.set({ kind: 'node', id: nodeId });
  }

  completeConnection(targetNodeId: string): void {
    const source = this.connectFromNodeId();
    if (source) {
      this.addEdge(source, targetNodeId);
    }
    this.connectFromNodeId.set(null);
  }

  upstreamNodes(edge: PathEdge): PathNode[] {
    const target = this.nodes().find((n) => n.id === edge.targetNodeId);
    if (!target) return [];
    return this.nodes().filter(
      (n) =>
        n.type !== 'start' &&
        n.type !== 'end' &&
        n.id !== target.id &&
        !n.config?.isGroup &&
        n.componentId !== 'system-group' &&
        (n.type === 'assessment' || n.type === 'unit'),
    );
  }

  incomingConditionalEdge(nodeId: string): PathEdge | null {
    const edges = this.edges().filter((e) => e.targetNodeId === nodeId);
    return edges.find((e) => !e.isDefault && (e.conditions?.rules?.length ?? 0) > 0) ?? null;
  }

  upstreamSectionsForNode(nodeId: string): PathNode[] {
    return this.nodes().filter(
      (n) =>
        n.id !== nodeId &&
        n.type !== 'start' &&
        n.type !== 'end' &&
        !n.config?.isGroup &&
        n.componentId !== 'system-group' &&
        (n.type === 'assessment' || n.type === 'unit'),
    );
  }
}
