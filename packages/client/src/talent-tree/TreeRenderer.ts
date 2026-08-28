import { buildAdjacency, edgeKey, pathEdgeKeys, shortestPathFromActive, type TreeEdge } from './TreePathing';

export type TalentVisualType = 'minor' | 'notable' | 'mastery' | 'keystone';

export interface TalentVisualNode {
    id: string;
    name: string;
    desc: string;
    x: number;
    y: number;
    type: TalentVisualType;
    cluster: string;
    tags: string[];
    icon: string;
}

export interface TalentClusterDecoration {
    id: string;
    cx: number;
    cy: number;
    radius: number;
    color: string;
}

export interface TalentNodeVisualState {
    active: boolean;
    available: boolean;
    masterySelected?: boolean;
    visible?: boolean;
}

export interface TalentTreeRendererOptions {
    host: HTMLElement;
    nodes: readonly TalentVisualNode[];
    edges: readonly TreeEdge[];
    clusters: readonly TalentClusterDecoration[];
    center: { x: number; y: number };
    getNodeState: (node: TalentVisualNode) => TalentNodeVisualState;
    isActiveId: (id: string) => boolean;
    clusterColor: (node: TalentVisualNode) => string;
    onNodeClick: (node: TalentVisualNode) => void;
    onNodeHover?: (node: TalentVisualNode, clientX: number, clientY: number, previewPath: readonly string[] | null) => void;
    onNodeLeave?: () => void;
}

type PointerInfo = { x: number; y: number };

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.15;

/**
 * Lightweight canvas renderer for the Warrior passive tree.
 *
 * It deliberately keeps gameplay/state outside the renderer. The class only
 * owns camera gestures, hit testing and painting, borrowing the same separation
 * of concerns used by large passive-tree viewers without importing PoE data or
 * assets into Kaetram.
 */
export default class TreeRenderer {
    private readonly host: HTMLElement;
    private readonly canvas: HTMLCanvasElement;
    private readonly ctx: CanvasRenderingContext2D;
    private readonly nodes: readonly TalentVisualNode[];
    private readonly nodeById = new Map<string, TalentVisualNode>();
    private readonly edges: readonly TreeEdge[];
    private readonly clusters: readonly TalentClusterDecoration[];
    private readonly center: { x: number; y: number };
    private readonly getNodeState: TalentTreeRendererOptions['getNodeState'];
    private readonly isActiveId: TalentTreeRendererOptions['isActiveId'];
    private readonly clusterColor: TalentTreeRendererOptions['clusterColor'];
    private readonly onNodeClick: TalentTreeRendererOptions['onNodeClick'];
    private readonly onNodeHover?: TalentTreeRendererOptions['onNodeHover'];
    private readonly onNodeLeave?: TalentTreeRendererOptions['onNodeLeave'];
    private readonly adjacency: Map<string, Set<string>>;
    private readonly resizeObserver: ResizeObserver;

    private width = 1;
    private height = 1;
    private dpr = 1;
    private scale = 0.72;
    private panX = 0;
    private panY = 0;
    private hoveredId: string | null = null;
    private previewPath: string[] | null = null;
    private filter: ((node: TalentVisualNode) => boolean) | null = null;
    private destroyed = false;

    private pointers = new Map<number, PointerInfo>();
    private dragging = false;
    private movedDuringGesture = false;
    private lastPointer = { x: 0, y: 0 };
    private pinchDistance = 0;
    private pinchScale = 1;
    private pinchWorld = { x: 0, y: 0 };

    public constructor(options: TalentTreeRendererOptions) {
        this.host = options.host;
        this.nodes = options.nodes;
        this.edges = options.edges;
        this.clusters = options.clusters;
        this.center = options.center;
        this.getNodeState = options.getNodeState;
        this.isActiveId = options.isActiveId;
        this.clusterColor = options.clusterColor;
        this.onNodeClick = options.onNodeClick;
        this.onNodeHover = options.onNodeHover;
        this.onNodeLeave = options.onNodeLeave;
        this.adjacency = buildAdjacency(this.edges);

        for (const node of this.nodes) this.nodeById.set(node.id, node);

        this.canvas = document.createElement('canvas');
        this.canvas.setAttribute('aria-label', 'Árvore passiva do Guerreiro');
        Object.assign(this.canvas.style, {
            position: 'absolute',
            inset: '0',
            width: '100%',
            height: '100%',
            display: 'block',
            touchAction: 'none',
            cursor: 'grab',
            outline: 'none'
        });
        this.canvas.tabIndex = 0;

        const ctx = this.canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D indisponível para a árvore de talentos.');
        this.ctx = ctx;
        this.host.appendChild(this.canvas);

        this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
        this.canvas.addEventListener('pointerdown', this.onPointerDown);
        this.canvas.addEventListener('pointermove', this.onPointerMove);
        this.canvas.addEventListener('pointerup', this.onPointerUp);
        this.canvas.addEventListener('pointercancel', this.onPointerUp);
        this.canvas.addEventListener('pointerleave', this.onPointerLeave);
        this.canvas.addEventListener('dblclick', this.onDoubleClick);

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.host);
        this.resize();
        requestAnimationFrame(() => this.fitToTree());
    }

    public destroy(): void {
        if (this.destroyed) return;
        this.destroyed = true;
        this.resizeObserver.disconnect();
        this.canvas.removeEventListener('wheel', this.onWheel);
        this.canvas.removeEventListener('pointerdown', this.onPointerDown);
        this.canvas.removeEventListener('pointermove', this.onPointerMove);
        this.canvas.removeEventListener('pointerup', this.onPointerUp);
        this.canvas.removeEventListener('pointercancel', this.onPointerUp);
        this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
        this.canvas.removeEventListener('dblclick', this.onDoubleClick);
        this.canvas.remove();
    }

    public refresh(): void {
        this.updatePreviewPath();
        this.draw();
    }

    public setFilter(filter: ((node: TalentVisualNode) => boolean) | null): void {
        this.filter = filter;
        this.draw();
    }

    public fitToTree(): void {
        if (!this.width || !this.height) return;
        const bounds = this.computeBounds();
        const padding = Math.min(130, Math.max(70, this.width * 0.07));
        const fitX = (this.width - padding * 2) / Math.max(1, bounds.maxX - bounds.minX);
        const fitY = (this.height - padding * 2) / Math.max(1, bounds.maxY - bounds.minY);
        this.scale = clamp(Math.min(fitX, fitY) * 0.98, MIN_ZOOM, 1.15);
        const cx = (bounds.minX + bounds.maxX) / 2;
        const cy = (bounds.minY + bounds.maxY) / 2;
        this.panX = this.width / 2 - cx * this.scale;
        this.panY = this.height / 2 - cy * this.scale;
        this.draw();
    }

    public centerOnWarrior(): void {
        const targetScale = clamp(Math.max(this.scale, 0.72), MIN_ZOOM, MAX_ZOOM);
        this.scale = targetScale;
        this.panX = this.width / 2 - this.center.x * this.scale;
        this.panY = this.height / 2 - this.center.y * this.scale;
        this.draw();
    }

    public zoomBy(factor: number): void {
        this.zoomAt(this.width / 2, this.height / 2, this.scale * factor);
    }

    private resize(): void {
        const rect = this.host.getBoundingClientRect();
        this.width = Math.max(1, Math.round(rect.width));
        this.height = Math.max(1, Math.round(rect.height));
        this.dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
        this.canvas.width = Math.round(this.width * this.dpr);
        this.canvas.height = Math.round(this.height * this.dpr);
        this.draw();
    }

    private computeBounds() {
        let minX = this.center.x;
        let minY = this.center.y;
        let maxX = this.center.x;
        let maxY = this.center.y;
        for (const node of this.nodes) {
            minX = Math.min(minX, node.x - 80);
            minY = Math.min(minY, node.y - 80);
            maxX = Math.max(maxX, node.x + 80);
            maxY = Math.max(maxY, node.y + 80);
        }
        return { minX, minY, maxX, maxY };
    }

    private draw(): void {
        if (this.destroyed) return;
        const ctx = this.ctx;
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        ctx.clearRect(0, 0, this.width, this.height);

        this.drawBackground(ctx);

        ctx.save();
        ctx.translate(this.panX, this.panY);
        ctx.scale(this.scale, this.scale);
        this.drawWorldOrnaments(ctx);
        this.drawClusters(ctx);
        this.drawEdges(ctx);
        this.drawCenter(ctx);
        this.drawNodes(ctx);
        ctx.restore();
    }

    private drawBackground(ctx: CanvasRenderingContext2D): void {
        const gradient = ctx.createRadialGradient(this.width * 0.52, this.height * 0.46, 20, this.width * 0.52, this.height * 0.46, Math.max(this.width, this.height) * 0.72);
        gradient.addColorStop(0, '#13120f');
        gradient.addColorStop(0.34, '#090b0f');
        gradient.addColorStop(1, '#030509');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.save();
        ctx.globalAlpha = 0.08;
        ctx.strokeStyle = '#a98b55';
        ctx.lineWidth = 1;
        const spacing = 42;
        for (let x = 0; x < this.width; x += spacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
            ctx.stroke();
        }
        for (let y = 0; y < this.height; y += spacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }
        ctx.restore();
    }

    private drawWorldOrnaments(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.translate(this.center.x, this.center.y);
        ctx.lineWidth = 1.1;
        for (const radius of [260, 520, 790, 1040]) {
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(188, 151, 87, ${radius === 260 ? 0.13 : 0.065})`;
            ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(188, 151, 87, .045)';
        for (let deg = 0; deg < 360; deg += 30) {
            const r = deg * Math.PI / 180;
            ctx.beginPath();
            ctx.moveTo(Math.cos(r) * 210, Math.sin(r) * 210);
            ctx.lineTo(Math.cos(r) * 1120, Math.sin(r) * 1120);
            ctx.stroke();
        }
        ctx.restore();
    }

    private drawClusters(ctx: CanvasRenderingContext2D): void {
        for (const cluster of this.clusters) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(cluster.cx, cluster.cy, cluster.radius + 25, 0, Math.PI * 2);
            ctx.setLineDash([4, 9]);
            ctx.lineWidth = 1.4;
            ctx.strokeStyle = withAlpha(cluster.color, 0.18);
            ctx.stroke();
            ctx.setLineDash([]);
            const fill = ctx.createRadialGradient(cluster.cx, cluster.cy, 4, cluster.cx, cluster.cy, cluster.radius + 32);
            fill.addColorStop(0, withAlpha(cluster.color, 0.055));
            fill.addColorStop(1, withAlpha(cluster.color, 0));
            ctx.fillStyle = fill;
            ctx.fill();
            ctx.restore();
        }
    }

    private drawEdges(ctx: CanvasRenderingContext2D): void {
        const previewEdges = pathEdgeKeys(this.previewPath);

        for (const [a, b] of this.edges) {
            const pa = this.pointFor(a);
            const pb = this.pointFor(b);
            if (!pa || !pb) continue;

            const aNode = a === 'center' ? null : this.nodeById.get(a) || null;
            const bNode = b === 'center' ? null : this.nodeById.get(b) || null;
            const visible = (!aNode || this.isVisible(aNode)) || (!bNode || this.isVisible(bNode));
            const bothActive = this.isActiveId(a) && this.isActiveId(b);
            const oneActive = this.isActiveId(a) || this.isActiveId(b);
            const preview = previewEdges.has(edgeKey(a, b));

            const distance = Math.hypot(pb.x - pa.x, pb.y - pa.y);
            const curve = distance > 250 ? Math.min(26, distance * 0.035) * curveSign(a, b) : 0;
            const mx = (pa.x + pb.x) / 2;
            const my = (pa.y + pb.y) / 2;
            const dx = pb.x - pa.x;
            const dy = pb.y - pa.y;
            const len = Math.max(1, Math.hypot(dx, dy));
            const cx = mx - dy / len * curve;
            const cy = my + dx / len * curve;

            ctx.save();
            ctx.globalAlpha = visible ? 1 : 0.08;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(pa.x, pa.y);
            if (curve) ctx.quadraticCurveTo(cx, cy, pb.x, pb.y);
            else ctx.lineTo(pb.x, pb.y);
            ctx.strokeStyle = '#0a0805';
            ctx.lineWidth = preview ? 7 : bothActive ? 6 : 4.4;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(pa.x, pa.y);
            if (curve) ctx.quadraticCurveTo(cx, cy, pb.x, pb.y);
            else ctx.lineTo(pb.x, pb.y);
            ctx.strokeStyle = preview ? '#f2ca69' : bothActive ? '#d8ac55' : oneActive ? '#977841' : '#5c513e';
            ctx.lineWidth = preview ? 3.6 : bothActive ? 3 : oneActive ? 2.15 : 1.5;
            ctx.globalAlpha *= preview ? 1 : bothActive ? 0.96 : oneActive ? 0.68 : 0.45;
            ctx.stroke();
            ctx.restore();
        }
    }

    private drawCenter(ctx: CanvasRenderingContext2D): void {
        const x = this.center.x;
        const y = this.center.y;
        ctx.save();
        ctx.shadowColor = 'rgba(232, 181, 77, .72)';
        ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.arc(x, y, 52, 0, Math.PI * 2);
        ctx.fillStyle = '#181006';
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#d7ad58';
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(x, y, 43, 0, Math.PI * 2);
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = 'rgba(255, 225, 153, .62)';
        ctx.stroke();
        ctx.font = '34px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#f2cf82';
        ctx.fillText('⚔', x, y + 1);
        ctx.font = '700 12px Georgia, serif';
        ctx.fillStyle = '#d9bd7b';
        ctx.fillText('GUERREIRO', x, y + 76);
        ctx.restore();
    }

    private drawNodes(ctx: CanvasRenderingContext2D): void {
        // Large nodes last so they stay visually dominant when wheels overlap.
        const ordered = [...this.nodes].sort((a, b) => typeOrder(a.type) - typeOrder(b.type));
        for (const node of ordered) this.drawNode(ctx, node);
    }

    private drawNode(ctx: CanvasRenderingContext2D, node: TalentVisualNode): void {
        const state = this.getNodeState(node);
        const visible = this.isVisible(node) && state.visible !== false;
        const active = state.active || !!state.masterySelected;
        const hovered = this.hoveredId === node.id;
        const inPreview = !!this.previewPath?.includes(node.id);
        const color = this.clusterColor(node);
        const radius = nodeRadius(node.type);

        ctx.save();
        ctx.globalAlpha = visible ? 1 : 0.11;
        ctx.translate(node.x, node.y);
        const hoverScale = hovered ? 1.13 : 1;
        ctx.scale(hoverScale, hoverScale);

        const outer = active ? '#e3b85f' : inPreview ? '#f1c966' : state.available ? color : '#655a47';
        ctx.shadowColor = active || inPreview || state.available ? withAlpha(outer, 0.72) : 'transparent';
        ctx.shadowBlur = active ? 18 : inPreview ? 15 : state.available ? 9 : 0;

        this.traceNodeShape(ctx, node.type, radius + (node.type === 'minor' ? 1 : 2));
        ctx.fillStyle = '#08090b';
        ctx.fill();
        ctx.lineWidth = active ? 3.4 : inPreview ? 3 : state.available ? 2.4 : 1.8;
        ctx.strokeStyle = outer;
        ctx.stroke();

        ctx.shadowBlur = 0;
        this.traceNodeShape(ctx, node.type, Math.max(5, radius - 5));
        const inner = ctx.createRadialGradient(-radius * 0.2, -radius * 0.22, 1, 0, 0, radius);
        inner.addColorStop(0, active ? '#4b3415' : node.type === 'mastery' ? '#2c1b3a' : '#241b10');
        inner.addColorStop(1, '#09090a');
        ctx.fillStyle = inner;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = withAlpha(outer, active ? 0.7 : 0.35);
        ctx.stroke();

        if (node.type === 'mastery') {
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = state.masterySelected ? '#e0bdff' : '#a982c8';
            ctx.fillRect(-8, -8, 16, 16);
            ctx.rotate(-Math.PI / 4);
        } else {
            const fontSize = node.type === 'minor' ? 14 : node.type === 'notable' ? 20 : 24;
            ctx.font = `${fontSize}px "Segoe UI Emoji", Georgia, serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = active ? '#ffe5a2' : '#d6c398';
            ctx.fillText(node.icon || '•', 0, 1);
        }

        // PoE-like distinction without permanent text labels: notables get a
        // thin halo, keystones get an extra orbit and masteries a violet dot.
        if (node.type === 'notable' || node.type === 'keystone') {
            ctx.beginPath();
            ctx.arc(0, 0, radius + (node.type === 'keystone' ? 10 : 6), 0, Math.PI * 2);
            ctx.lineWidth = 1;
            ctx.strokeStyle = withAlpha(outer, active ? 0.55 : 0.3);
            ctx.stroke();
        }

        ctx.restore();
    }

    private traceNodeShape(ctx: CanvasRenderingContext2D, type: TalentVisualType, radius: number): void {
        if (type === 'minor' || type === 'mastery') {
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            return;
        }

        const points = type === 'keystone' ? 16 : 12;
        const inset = type === 'keystone' ? 0.77 : 0.88;
        ctx.beginPath();
        for (let i = 0; i < points; i++) {
            const r = i % 2 === 0 ? radius : radius * inset;
            const angle = -Math.PI / 2 + i * Math.PI * 2 / points;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
    }

    private isVisible(node: TalentVisualNode): boolean {
        return this.filter ? this.filter(node) : true;
    }

    private pointFor(id: string): { x: number; y: number } | null {
        if (id === 'center') return this.center;
        const node = this.nodeById.get(id);
        return node ? { x: node.x, y: node.y } : null;
    }

    private screenToWorld(clientX: number, clientY: number): { x: number; y: number; sx: number; sy: number } {
        const rect = this.canvas.getBoundingClientRect();
        const sx = clientX - rect.left;
        const sy = clientY - rect.top;
        return {
            x: (sx - this.panX) / this.scale,
            y: (sy - this.panY) / this.scale,
            sx,
            sy
        };
    }

    private hitTest(clientX: number, clientY: number): TalentVisualNode | null {
        const p = this.screenToWorld(clientX, clientY);
        let best: TalentVisualNode | null = null;
        let bestDistance = Number.POSITIVE_INFINITY;

        for (const node of this.nodes) {
            if (!this.isVisible(node)) continue;
            const dx = p.x - node.x;
            const dy = p.y - node.y;
            const distance = Math.hypot(dx, dy);
            const radius = nodeRadius(node.type) + 6 / Math.max(0.4, this.scale);
            if (distance <= radius && distance < bestDistance) {
                best = node;
                bestDistance = distance;
            }
        }

        return best;
    }

    private updateHover(clientX?: number, clientY?: number): void {
        if (clientX === undefined || clientY === undefined || this.dragging || this.pointers.size > 1) {
            if (this.hoveredId) {
                this.hoveredId = null;
                this.previewPath = null;
                this.onNodeLeave?.();
                this.draw();
            }
            return;
        }

        const hit = this.hitTest(clientX, clientY);
        const nextId = hit?.id || null;
        if (nextId !== this.hoveredId) {
            this.hoveredId = nextId;
            this.updatePreviewPath();
            this.draw();
        }

        if (hit) this.onNodeHover?.(hit, clientX, clientY, this.previewPath);
        else this.onNodeLeave?.();
    }

    private updatePreviewPath(): void {
        if (!this.hoveredId) {
            this.previewPath = null;
            return;
        }
        const node = this.nodeById.get(this.hoveredId);
        if (!node || node.type === 'mastery' || this.isActiveId(node.id)) {
            this.previewPath = null;
            return;
        }
        const active = new Set<string>(['center']);
        for (const candidate of this.nodes) {
            if (candidate.type !== 'mastery' && this.isActiveId(candidate.id)) active.add(candidate.id);
        }
        this.previewPath = shortestPathFromActive(node.id, active, this.adjacency);
    }

    private zoomAt(screenX: number, screenY: number, targetScale: number): void {
        const oldScale = this.scale;
        const nextScale = clamp(targetScale, MIN_ZOOM, MAX_ZOOM);
        if (Math.abs(nextScale - oldScale) < 0.0001) return;
        const worldX = (screenX - this.panX) / oldScale;
        const worldY = (screenY - this.panY) / oldScale;
        this.scale = nextScale;
        this.panX = screenX - worldX * nextScale;
        this.panY = screenY - worldY * nextScale;
        this.draw();
    }

    private readonly onWheel = (event: WheelEvent) => {
        event.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const factor = event.deltaY < 0 ? 1.12 : 0.89;
        this.zoomAt(x, y, this.scale * factor);
    };

    private readonly onPointerDown = (event: PointerEvent) => {
        this.canvas.setPointerCapture(event.pointerId);
        this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        this.movedDuringGesture = false;
        this.lastPointer = { x: event.clientX, y: event.clientY };
        this.canvas.style.cursor = 'grabbing';

        if (this.pointers.size === 2) {
            const [a, b] = [...this.pointers.values()];
            this.pinchDistance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
            this.pinchScale = this.scale;
            const midX = (a.x + b.x) / 2;
            const midY = (a.y + b.y) / 2;
            const p = this.screenToWorld(midX, midY);
            this.pinchWorld = { x: p.x, y: p.y };
        } else {
            const hit = this.hitTest(event.clientX, event.clientY);
            this.dragging = !hit;
        }
    };

    private readonly onPointerMove = (event: PointerEvent) => {
        if (this.pointers.has(event.pointerId)) {
            const previous = this.pointers.get(event.pointerId)!;
            this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

            if (this.pointers.size >= 2) {
                const [a, b] = [...this.pointers.values()].slice(0, 2);
                const distance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
                const midClientX = (a.x + b.x) / 2;
                const midClientY = (a.y + b.y) / 2;
                const rect = this.canvas.getBoundingClientRect();
                const midX = midClientX - rect.left;
                const midY = midClientY - rect.top;
                this.scale = clamp(this.pinchScale * (distance / this.pinchDistance), MIN_ZOOM, MAX_ZOOM);
                this.panX = midX - this.pinchWorld.x * this.scale;
                this.panY = midY - this.pinchWorld.y * this.scale;
                this.movedDuringGesture = true;
                this.draw();
                return;
            }

            if (!this.dragging) {
                const totalMove = Math.hypot(event.clientX - this.lastPointer.x, event.clientY - this.lastPointer.y);
                if (totalMove > 5) {
                    this.dragging = true;
                    this.movedDuringGesture = true;
                }
            }

            if (this.dragging) {
                const dx = event.clientX - previous.x;
                const dy = event.clientY - previous.y;
                if (Math.abs(dx) + Math.abs(dy) > 1.5) this.movedDuringGesture = true;
                this.panX += dx;
                this.panY += dy;
                this.draw();
                return;
            }
        }

        this.updateHover(event.clientX, event.clientY);
    };

    private readonly onPointerUp = (event: PointerEvent) => {
        const wasTracked = this.pointers.has(event.pointerId);
        this.pointers.delete(event.pointerId);
        if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);

        const shouldClick = wasTracked && !this.dragging && !this.movedDuringGesture && this.pointers.size === 0;
        this.dragging = false;
        this.canvas.style.cursor = 'grab';

        if (this.pointers.size === 1) {
            const remaining = [...this.pointers.values()][0];
            this.lastPointer = remaining;
            this.dragging = true;
        }

        if (shouldClick) {
            const hit = this.hitTest(event.clientX, event.clientY);
            if (hit) this.onNodeClick(hit);
        }

        this.updateHover(event.clientX, event.clientY);
    };

    private readonly onPointerLeave = () => {
        if (this.pointers.size === 0) this.updateHover();
    };

    private readonly onDoubleClick = (event: MouseEvent) => {
        if (this.hitTest(event.clientX, event.clientY)) return;
        this.centerOnWarrior();
    };
}

function nodeRadius(type: TalentVisualType): number {
    if (type === 'minor') return 18;
    if (type === 'notable') return 29;
    if (type === 'mastery') return 31;
    return 38;
}

function typeOrder(type: TalentVisualType): number {
    if (type === 'minor') return 0;
    if (type === 'mastery') return 1;
    if (type === 'notable') return 2;
    return 3;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function curveSign(a: string, b: string): number {
    let hash = 0;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    for (let i = 0; i < key.length; i++) hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
    return hash % 2 === 0 ? 1 : -1;
}

function withAlpha(hex: string, alpha: number): string {
    const normalized = hex.replace('#', '');
    if (!/^[0-9a-f]{6}$/i.test(normalized)) return `rgba(180, 150, 95, ${alpha})`;
    const value = Number.parseInt(normalized, 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
