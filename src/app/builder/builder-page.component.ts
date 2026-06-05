import { CommonModule } from '@angular/common';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDragEnd,
  CdkDropList,
  DragDropModule,
} from '@angular/cdk/drag-drop';
import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import {
  ConditionRule,
  ContentComponent,
  PaletteItem,
  PathEdge,
  PathNode,
} from '../models/learning-path.models';
import { BuilderStateService } from './builder-state.service';
import { buildEdgePath, getNodeDimensions } from './path-layout.util';

@Component({
  selector: 'app-builder-page',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, CdkDrag, CdkDropList],
  providers: [BuilderStateService],
  templateUrl: './builder-page.component.html',
  styleUrl: './builder-page.component.scss',
})
export class BuilderPageComponent implements OnInit {
  @ViewChild('canvasEl') canvasRef!: ElementRef<HTMLElement>;

  private readonly api = inject(ApiService);
  readonly state = inject(BuilderStateService);

  readonly paletteItems: PaletteItem[] = [
    {
      kind: 'section',
      label: 'Section',
      description: 'Add a quiz/assessment section',
    },
    {
      kind: 'group',
      label: 'Group',
      description: 'Group sections for conditional routing',
    },
  ];

  components: ContentComponent[] = [];
  filteredComponents: ContentComponent[] = [];
  contentSearch = '';
  loading = true;
  loadError: string | null = null;

  assessmentMetrics = ['completion', 'passed', 'score', 'score_range'];
  unitMetrics = ['completion', 'time_spent_minutes', 'percentage_completion'];
  operators = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'between'];
  operatorLabels: Record<string, string> = {
    eq: 'Equals (=)',
    ne: 'Not equal (≠)',
    gt: 'Greater than (>)',
    gte: 'Greater or equal (≥)',
    lt: 'Less than (<)',
    lte: 'Less or equal (≤)',
    between: 'Between',
  };
  metricLabels: Record<string, string> = {
    completion: 'Completion',
    passed: 'Passed',
    score: 'Score',
    score_range: 'Score range',
    time_spent_minutes: 'Time spent (min)',
    percentage_completion: 'Percentage completion',
  };
  difficulties = ['easy', 'medium', 'hard', 'adaptive'] as const;

  ngOnInit(): void {
    this.loading = true;
    let pathReady = false;
    let componentsReady = false;
    const finish = () => {
      if (pathReady && componentsReady) {
        this.loading = false;
      }
    };

    this.api.getComponents().subscribe({
      next: (res) => {
        this.components = res.items;
        this.filteredComponents = res.items;
        componentsReady = true;
        finish();
      },
      error: () => {
        this.bootstrapOfflineComponents();
        componentsReady = true;
        finish();
      },
    });

    this.loadDefaultPath(() => {
      pathReady = true;
      finish();
    });
  }

  private loadDefaultPath(onComplete: () => void): void {
    const id = this.state.pathId();
    if (!id) {
      this.state.addStartNode();
      this.state.addEndNode();
      onComplete();
      return;
    }
    this.api.getLearningPath(id).subscribe({
      next: (path) => {
        this.state.loadPath(path);
        if (!path.nodes.some((n) => n.type === 'end')) {
          this.state.addEndNode();
        }
        onComplete();
        setTimeout(() => this.scrollToFlow(), 50);
      },
      error: () => {
        this.loadError = 'Could not load path. Start the backend on port 8080.';
        this.state.addStartNode();
        this.state.addEndNode();
        onComplete();
      },
    });
  }

  private bootstrapOfflineComponents(): void {
    this.components = [
      {
        id: 'cmp-assess-math-1',
        title: 'Math Module 1 Assessment',
        shortDescription: 'Baseline math diagnostic used to route learners.',
        type: 'assessment',
        approximateDurationMinutes: 35,
        metadata: { assessment: { maxScore: 100, passingScore: 50 } },
      },
      {
        id: 'cmp-unit-math-2-easy',
        title: 'Math Module 2 - Easy',
        shortDescription: 'Foundational math remediation unit.',
        type: 'unit',
        approximateDurationMinutes: 35,
        metadata: { unit: { recommendedMinutes: 30 } },
      },
    ];
    this.filteredComponents = this.components;
  }

  filterComponents(): void {
    const q = this.contentSearch.trim().toLowerCase();
    this.filteredComponents = q
      ? this.components.filter(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            c.shortDescription.toLowerCase().includes(q) ||
            c.type.includes(q),
        )
      : this.components;
  }

  isPaletteItem(data: unknown): data is PaletteItem {
    return !!data && typeof data === 'object' && 'kind' in data;
  }

  isContentComponent(data: unknown): data is ContentComponent {
    return !!data && typeof data === 'object' && 'type' in data && 'title' in data;
  }

  onCanvasDrop(event: CdkDragDrop<unknown>): void {
    if (!event.item.data || !this.canvasRef) return;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const zoom = this.state.canvas().zoom ?? 1;
    const x = (event.dropPoint.x - rect.left) / zoom - 110;
    const y = (event.dropPoint.y - rect.top) / zoom - 44;
    const position = { x: Math.max(20, x), y: Math.max(20, y) };
    const data = event.item.data;

    if (this.isPaletteItem(data)) {
      if (data.kind === 'section') {
        this.state.addSectionNode(position);
      } else {
        this.state.addGroupNode(position);
      }
      return;
    }

    if (this.isContentComponent(data)) {
      this.state.addNodeFromComponent(data, position);
    }
  }

  nodeTransform(node: PathNode): string {
    return `translate3d(${node.position.x}px, ${node.position.y}px, 0)`;
  }

  onNodeDragEnd(node: PathNode, event: CdkDragEnd): void {
    const zoom = this.state.canvas().zoom ?? 1;
    this.state.updateNodePosition(
      node.id,
      node.position.x + event.distance.x / zoom,
      node.position.y + event.distance.y / zoom,
    );
    event.source.reset();
  }

  isEdgeSelected(edgeId: string): boolean {
    const sel = this.state.selection();
    return sel?.kind === 'edge' && sel.id === edgeId;
  }

  isNodeSelected(nodeId: string): boolean {
    const sel = this.state.selection();
    return sel?.kind === 'node' && sel.id === nodeId;
  }

  onCanvasClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('canvas-surface')) {
      this.state.clearSelection();
      this.state.connectFromNodeId.set(null);
    }
  }

  onNodeClick(event: MouseEvent, node: PathNode): void {
    event.stopPropagation();
    if (this.state.connectFromNodeId()) {
      this.state.completeConnection(node.id);
    } else {
      this.state.selectNode(node.id);
    }
  }

  onEdgeClick(event: MouseEvent, edgeId: string): void {
    event.stopPropagation();
    this.state.selectEdge(edgeId);
  }

  startConnection(event: MouseEvent, nodeId: string): void {
    event.stopPropagation();
    this.state.beginConnection(nodeId);
  }

  isGroupNode(node: PathNode): boolean {
    return !!node.config?.isGroup || node.componentId === 'system-group';
  }

  isSectionNode(node: PathNode): boolean {
    return (
      (node.type === 'assessment' || node.type === 'unit') &&
      !this.isGroupNode(node)
    );
  }

  getNodeDimensions(node: PathNode): { width: number; height: number } {
    return getNodeDimensions(node);
  }

  getEdgePath(edge: PathEdge): string {
    return buildEdgePath(edge, this.state.nodes(), this.state.edges());
  }

  scrollToFlow(): void {
    if (!this.canvasRef) return;
    const nodes = this.state.nodes();
    if (nodes.length === 0) return;
    const el = this.canvasRef.nativeElement;
    const zoom = this.state.canvas().zoom ?? 1;
    const minX = Math.min(...nodes.map((n) => n.position.x));
    const maxX = Math.max(...nodes.map((n) => n.position.x + 240));
    const minY = Math.min(...nodes.map((n) => n.position.y));
    const centerX = ((minX + maxX) / 2) * zoom - el.clientWidth / 2;
    el.scrollLeft = Math.max(0, centerX);
    el.scrollTop = Math.max(0, minY * zoom - 24);
  }

  save(): void {
    this.state.saveMessage.set(null);
    const payload = this.state.toPayload();
    if (payload.nodes.length < 2) {
      this.state.saveMessage.set('Add at least two nodes (including Start) before saving.');
      return;
    }
    if (payload.edges.length < 1) {
      this.state.saveMessage.set('Add at least one connection before saving.');
      return;
    }
    this.api.saveLearningPath(payload).subscribe({
      next: (saved) => {
        this.state.loadPath(saved);
        this.state.saveMessage.set('Learning path saved successfully.');
      },
      error: () => this.state.saveMessage.set('Save failed. Is the backend running?'),
    });
  }

  reload(): void {
    const id = this.state.pathId();
    if (!id) return;
    this.api.getLearningPath(id).subscribe({
      next: (path) => {
        this.state.loadPath(path);
        this.state.saveMessage.set('Path reloaded from server.');
      },
      error: () => this.state.saveMessage.set('Reload failed.'),
    });
  }

  addRule(edge: PathEdge, preferredSourceId?: string): void {
    const upstream = this.state.upstreamSectionsForNode(edge.targetNodeId);
    const sourceNode =
      this.state.nodes().find((n) => n.id === preferredSourceId) ??
      upstream[0] ??
      this.state.nodes().find((n) => n.id === edge.sourceNodeId);
    const sourceType = sourceNode?.type === 'assessment' ? 'assessment' : 'unit';
    const metric = sourceType === 'assessment' ? 'score' : 'completion';
    const rule: ConditionRule = {
      id: `rule-${Date.now()}`,
      sourceType,
      sourceNodeId: sourceNode?.id ?? edge.sourceNodeId,
      metric,
      operator: metric === 'score' ? 'lt' : 'eq',
      value: metric === 'score' ? 50 : true,
    };
    this.state.addRuleToEdge(edge.id, rule);
  }

  addRuleForNode(node: PathNode): void {
    const edge = this.incomingEdgeForNode(node);
    if (!edge) return;
    const upstream = this.sourceSectionsForNode(node);
    this.addRule(edge, upstream[0]?.id);
  }

  updateSelectedNodeLabel(value: string): void {
    const node = this.state.selectedNode();
    if (!node) return;
    this.state.updateNode({ ...node, label: value });
  }

  updateSelectedNodeDescription(value: string): void {
    const node = this.state.selectedNode();
    if (!node) return;
    this.state.updateNode({ ...node, description: value });
  }

  updateSelectedEdgeLabel(value: string): void {
    const edge = this.state.selectedEdge();
    if (!edge) return;
    this.state.updateEdge({ ...edge, label: value });
  }

  updateSelectedEdgePriority(value: number): void {
    const edge = this.state.selectedEdge();
    if (!edge) return;
    this.state.updateEdge({ ...edge, priority: value });
  }

  updateSelectedEdgeDefault(value: boolean): void {
    const edge = this.state.selectedEdge();
    if (!edge) return;
    this.state.updateEdge({ ...edge, isDefault: value });
  }

  updateEdgeOperator(operator: 'AND' | 'OR'): void {
    const edge = this.state.selectedEdge();
    if (!edge) return;
    this.state.updateEdge({
      ...edge,
      conditions: { ...edge.conditions, operator },
    });
  }

  updateRuleRangeMin(rule: ConditionRule, min: number): void {
    const edge = this.state.selectedEdge();
    if (!edge) return;
    this.state.updateRule(edge.id, {
      ...rule,
      range: {
        min,
        max: rule.range?.max ?? 100,
        minInclusive: rule.range?.minInclusive ?? true,
        maxInclusive: rule.range?.maxInclusive ?? true,
      },
    });
  }

  updateRuleRangeMax(rule: ConditionRule, max: number): void {
    const edge = this.state.selectedEdge();
    if (!edge) return;
    this.state.updateRule(edge.id, {
      ...rule,
      range: {
        min: rule.range?.min ?? 0,
        max,
        minInclusive: rule.range?.minInclusive ?? true,
        maxInclusive: rule.range?.maxInclusive ?? true,
      },
    });
  }

  updateRuleMetric(rule: ConditionRule, metric: string): void {
    const edge = this.state.selectedEdge();
    if (!edge) return;
    const updated: ConditionRule = {
      ...rule,
      metric,
      value: metric === 'score_range' ? undefined : rule.value,
      range: metric === 'score_range' ? rule.range ?? { min: 0, max: 49, minInclusive: true, maxInclusive: true } : undefined,
    };
    this.state.updateRule(edge.id, updated);
  }

  updateRuleOperator(rule: ConditionRule, operator: string): void {
    const edge = this.state.selectedEdge();
    if (!edge) return;
    this.state.updateRule(edge.id, { ...rule, operator });
  }

  updateRuleValue(rule: ConditionRule, raw: string): void {
    const edge = this.state.selectedEdge();
    if (!edge) return;
    let value: boolean | number | string = raw;
    if (rule.metric === 'completion' || rule.metric === 'passed') {
      value = raw === 'true';
    } else if (rule.metric !== 'score_range') {
      value = Number(raw);
    }
    this.state.updateRule(edge.id, { ...rule, value });
  }

  metricsForEdge(edge: PathEdge): string[] {
    const source = this.state.nodes().find((n) => n.id === edge.sourceNodeId);
    return source?.type === 'assessment' ? this.assessmentMetrics : this.unitMetrics;
  }

  typeLabel(type: string): string {
    const labels: Record<string, string> = {
      start: 'Start',
      end: 'End',
      unit: 'Unit',
      assessment: 'Assessment',
    };
    return labels[type] ?? type;
  }

  panelTypeLabel(node: PathNode | string): string {
    if (typeof node === 'string') {
      return this.typeLabel(node);
    }
    if (this.isGroupNode(node)) return 'Group';
    if (this.isSectionNode(node)) return 'Section';
    return this.typeLabel(node.type);
  }

  isPreview(): boolean {
    return this.state.viewMode() === 'preview';
  }

  zoomPercent(): number {
    return Math.round((this.state.canvas().zoom ?? 1) * 100);
  }

  zoomIn(): void {
    this.state.setZoom((this.state.canvas().zoom ?? 1) + 0.1);
  }

  zoomOut(): void {
    this.state.setZoom((this.state.canvas().zoom ?? 1) - 0.1);
  }

  fitCanvas(): void {
    const nodes = this.state.nodes();
    if (nodes.length === 0) {
      this.state.setZoom(1);
      return;
    }
    const maxY = Math.max(...nodes.map((n) => n.position.y)) + 140;
    const maxX = Math.max(...nodes.map((n) => n.position.x)) + 260;
    if (!this.canvasRef) return;
    const h = this.canvasRef.nativeElement.clientHeight;
    const w = this.canvasRef.nativeElement.clientWidth;
    const scaleY = h / maxY;
    const scaleX = w / maxX;
    this.state.setZoom(Math.min(1, Math.min(scaleX, scaleY) * 0.88));
    setTimeout(() => this.scrollToFlow(), 30);
  }

  canvasTransform(): string {
    const z = this.state.canvas().zoom ?? 1;
    return `scale(${z})`;
  }

  isConditionalEdge(edge: PathEdge): boolean {
    return !edge.isDefault && (edge.conditions?.rules?.length ?? 0) > 0;
  }

  ruleSummary(rule: ConditionRule): string {
    const src = this.state.nodes().find((n) => n.id === rule.sourceNodeId);
    const name = src?.label ?? 'source';
    if (rule.metric === 'score' || rule.metric === 'score_range') {
      const op = rule.operator === 'gte' ? '≥' : rule.operator === 'lt' ? '<' : rule.operator;
      const val =
        rule.metric === 'score_range' && rule.range
          ? `${rule.range.max}%`
          : `${rule.value ?? ''}%`;
      return `Show if score ${op} ${val}`;
    }
    if (rule.metric === 'score_range' && rule.range) {
      return `Show if ${name} score ${rule.range.min}–${rule.range.max}%`;
    }
    const op = rule.operator === 'gte' ? '≥' : rule.operator === 'lt' ? '<' : rule.operator;
    return `Show if ${rule.metric.replace(/_/g, ' ')} ${op} ${rule.value ?? ''}`;
  }

  saveDraft(): void {
    this.state.saveDraft();
    this.save();
  }

  publish(): void {
    this.state.publish();
    this.save();
  }

  updateRuleSourceNode(rule: ConditionRule, nodeId: string): void {
    const edge = this.state.selectedEdge();
    if (!edge) return;
    const node = this.state.nodes().find((n) => n.id === nodeId);
    const sourceType = node?.type === 'assessment' ? 'assessment' : 'unit';
    this.state.updateRule(edge.id, { ...rule, sourceNodeId: nodeId, sourceType });
  }

  sourceNodeLabel(nodeId: string): string {
    return this.state.nodes().find((n) => n.id === nodeId)?.label ?? nodeId;
  }

  nodeMetaLine(node: PathNode): string | null {
    if (this.isGroupNode(node)) return null;
    const mins = node.config?.approximateDurationMinutes;
    const questions = node.config?.questionCount;
    if (questions != null && mins != null) {
      return `${questions} questions • ${mins} minutes`;
    }
    if (mins) {
      return `${mins} minutes`;
    }
    return null;
  }

  updateSelectedNodeQuestionCount(value: number): void {
    const node = this.state.selectedNode();
    if (!node) return;
    this.state.updateNode({
      ...node,
      config: { ...node.config, questionCount: value },
    });
  }

  updateSelectedNodeDuration(value: number): void {
    const node = this.state.selectedNode();
    if (!node) return;
    this.state.updateNode({
      ...node,
      config: { ...node.config, approximateDurationMinutes: value },
    });
  }

  updateSelectedNodeDifficulty(value: string): void {
    const node = this.state.selectedNode();
    if (!node) return;
    this.state.updateNode({
      ...node,
      config: {
        ...node.config,
        difficulty: value as 'easy' | 'medium' | 'hard' | 'adaptive',
      },
    });
  }

  parentGroupLabel(node: PathNode): string | null {
    const incoming = this.state.edges().filter((e) => e.targetNodeId === node.id);
    if (incoming.length === 0) return null;
    const source = this.state.nodes().find((n) => n.id === incoming[0].sourceNodeId);
    if (!source || source.type === 'start' || !this.isGroupNode(source)) return null;
    return source.label;
  }

  incomingEdgeForNode(node: PathNode): PathEdge | null {
    return (
      this.state.incomingConditionalEdge(node.id) ??
      this.state.edges().find((e) => e.targetNodeId === node.id && !e.isDefault) ??
      null
    );
  }

  metricsForNode(node: PathNode): string[] {
    const edge = this.incomingEdgeForNode(node);
    if (!edge) return this.assessmentMetrics;
    return this.metricsForEdge(edge);
  }

  sourceSectionsForNode(node: PathNode): PathNode[] {
    return this.state.upstreamSectionsForNode(node.id);
  }

  updateNodeRuleSourceNode(node: PathNode, rule: ConditionRule, nodeId: string): void {
    const edge = this.incomingEdgeForNode(node);
    if (!edge) return;
    const sourceNode = this.state.nodes().find((n) => n.id === nodeId);
    const sourceType = sourceNode?.type === 'assessment' ? 'assessment' : 'unit';
    const metric = sourceType === 'assessment' ? 'score' : rule.metric;
    this.state.updateRule(edge.id, { ...rule, sourceNodeId: nodeId, sourceType, metric });
  }

  updateNodeRuleMetric(node: PathNode, rule: ConditionRule, metric: string): void {
    const edge = this.incomingEdgeForNode(node);
    if (!edge) return;
    const updated: ConditionRule = {
      ...rule,
      metric,
      value: metric === 'score_range' ? undefined : metric === 'score' ? 50 : rule.value,
      range:
        metric === 'score_range'
          ? (rule.range ?? { min: 0, max: 49, minInclusive: true, maxInclusive: true })
          : undefined,
    };
    this.state.updateRule(edge.id, updated);
  }

  updateNodeRuleOperator(node: PathNode, rule: ConditionRule, operator: string): void {
    const edge = this.incomingEdgeForNode(node);
    if (!edge) return;
    this.state.updateRule(edge.id, { ...rule, operator });
  }

  updateNodeRuleValue(node: PathNode, rule: ConditionRule, raw: string): void {
    const edge = this.incomingEdgeForNode(node);
    if (!edge) return;
    let value: boolean | number | string = raw.replace('%', '').trim();
    if (rule.metric === 'completion' || rule.metric === 'passed') {
      value = raw === 'true';
    } else if (rule.metric !== 'score_range') {
      value = Number(value);
    }
    this.state.updateRule(edge.id, { ...rule, value });
  }

  removeNodeRule(node: PathNode, ruleId: string): void {
    const edge = this.incomingEdgeForNode(node);
    if (!edge) return;
    this.state.removeRule(edge.id, ruleId);
  }

  formatOperator(op: string): string {
    return this.operatorLabels[op] ?? op;
  }

  formatMetric(metric: string): string {
    return this.metricLabels[metric] ?? metric.replace(/_/g, ' ');
  }
}