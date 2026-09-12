import { Point, Stroke, ToolConfig, Operation } from '@shared/index';
import { PointerController } from './PointerController';
import { StrokeRenderer } from './StrokeRenderer';

export interface RemoteStrokeState {
  strokeId: string;
  tool: 'brush' | 'eraser';
  color: string;
  width: number;
  points: Point[];
}

export class CanvasEngine {
  private ctx: CanvasRenderingContext2D;
  private pointerController: PointerController;
  private strokeRenderer: StrokeRenderer;
  private resizeObserver: ResizeObserver | null = null;

  private cssWidth = 800;
  private cssHeight = 600;
  private dpr = 1;

  private currentConfig: ToolConfig = {
    tool: 'brush',
    color: '#000000',
    width: 4,
  };

  private retainedStrokes: Stroke[] = [];
  private activeStroke: Stroke | null = null;
  private remoteInflightStrokes = new Map<string, RemoteStrokeState>();

  private onLocalStrokeEndCallback: ((stroke: Stroke) => void) | null = null;
  private onLocalStrokeBeginCallback: ((strokeId: string, point: Point) => void) | null = null;
  private onLocalStrokeAppendCallback: ((strokeId: string, points: Point[]) => void) | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context from canvas');
    }
    this.ctx = ctx;
    this.strokeRenderer = new StrokeRenderer(this.ctx);

    this.pointerController = new PointerController(this.canvas, {
      onPointerDown: (pt) => this.handlePointerDown(pt),
      onPointerMove: (pt) => this.handlePointerMove(pt),
      onPointerUp: () => this.handlePointerUp(),
      onPointerCancel: () => this.handlePointerCancel(),
    });

    this.initCanvasSize();
    this.setupResizeObserver();
  }

  public setOnLocalStrokeEnd(cb: (stroke: Stroke) => void): void {
    this.onLocalStrokeEndCallback = cb;
  }

  public setOnLocalStrokeBegin(cb: (strokeId: string, point: Point) => void): void {
    this.onLocalStrokeBeginCallback = cb;
  }

  public setOnLocalStrokeAppend(cb: (strokeId: string, points: Point[]) => void): void {
    this.onLocalStrokeAppendCallback = cb;
  }

  public setToolConfig(config: Partial<ToolConfig>): void {
    this.currentConfig = {
      ...this.currentConfig,
      ...config,
    };
  }

  public getToolConfig(): ToolConfig {
    return { ...this.currentConfig };
  }

  public getRetainedStrokes(): Stroke[] {
    return [...this.retainedStrokes];
  }

  public clear(): void {
    this.retainedStrokes = [];
    this.activeStroke = null;
    this.remoteInflightStrokes.clear();
    this.redraw();
  }

  public applyRemoteOperation(op: Operation): void {
    if (op.type === 'STROKE') {
      const stroke = op.payload as Stroke;
      if (stroke.strokeId) {
        this.remoteInflightStrokes.delete(stroke.strokeId);
      }
      this.retainedStrokes.push(stroke);
      this.redraw();
    }
  }

  public renderRemoteStrokeBegin(
    strokeId: string,
    tool: 'brush' | 'eraser',
    color: string,
    width: number,
    point: Point
  ): void {
    this.remoteInflightStrokes.set(strokeId, {
      strokeId,
      tool,
      color,
      width,
      points: [point],
    });
    this.strokeRenderer.renderDot(point, tool, color, width, this.cssWidth, this.cssHeight);
  }

  public renderRemoteStrokeAppend(strokeId: string, points: Point[]): void {
    const remote = this.remoteInflightStrokes.get(strokeId);
    if (!remote || points.length === 0) return;

    let lastPt = remote.points[remote.points.length - 1];
    for (const pt of points) {
      remote.points.push(pt);
      this.strokeRenderer.renderSegment(
        lastPt,
        pt,
        remote.tool,
        remote.color,
        remote.width,
        this.cssWidth,
        this.cssHeight
      );
      lastPt = pt;
    }
  }

  public redraw(): void {
    this.ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);

    for (const stroke of this.retainedStrokes) {
      this.strokeRenderer.renderStroke(stroke, this.cssWidth, this.cssHeight);
    }

    if (this.activeStroke) {
      this.strokeRenderer.renderStroke(this.activeStroke, this.cssWidth, this.cssHeight);
    }

    for (const remote of this.remoteInflightStrokes.values()) {
      if (remote.points.length > 0) {
        this.strokeRenderer.renderStroke(
          {
            strokeId: remote.strokeId,
            tool: remote.tool,
            color: remote.color,
            width: remote.width,
            points: remote.points,
          },
          this.cssWidth,
          this.cssHeight
        );
      }
    }
  }

  public destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.pointerController.destroy();
  }

  private initCanvasSize(): void {
    const parent = this.canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : this.canvas.getBoundingClientRect();
    
    this.cssWidth = Math.max(1, Math.floor(rect.width || 800));
    this.cssHeight = Math.max(1, Math.floor(rect.height || 600));
    this.dpr = window.devicePixelRatio || 1;

    this.canvas.width = Math.floor(this.cssWidth * this.dpr);
    this.canvas.height = Math.floor(this.cssHeight * this.dpr);
    this.canvas.style.width = `${this.cssWidth}px`;
    this.canvas.style.height = `${this.cssHeight}px`;

    this.ctx.scale(this.dpr, this.dpr);

    this.redraw();
  }

  private setupResizeObserver(): void {
    const parent = this.canvas.parentElement;
    if (!parent || typeof ResizeObserver === 'undefined') return;

    this.resizeObserver = new ResizeObserver(() => {
      this.initCanvasSize();
    });
    this.resizeObserver.observe(parent);
  }

  private handlePointerDown(point: Point): void {
    const strokeId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.activeStroke = {
      strokeId,
      tool: this.currentConfig.tool,
      color: this.currentConfig.color,
      width: this.currentConfig.width,
      points: [point],
    };

    this.strokeRenderer.renderDot(
      point,
      this.activeStroke.tool,
      this.activeStroke.color,
      this.activeStroke.width,
      this.cssWidth,
      this.cssHeight
    );

    if (this.onLocalStrokeBeginCallback) {
      this.onLocalStrokeBeginCallback(strokeId, point);
    }
  }

  private handlePointerMove(point: Point): void {
    if (!this.activeStroke) return;

    const points = this.activeStroke.points;
    const lastPt = points[points.length - 1];
    points.push(point);

    this.strokeRenderer.renderSegment(
      lastPt,
      point,
      this.activeStroke.tool,
      this.activeStroke.color,
      this.activeStroke.width,
      this.cssWidth,
      this.cssHeight
    );

    if (this.onLocalStrokeAppendCallback) {
      this.onLocalStrokeAppendCallback(this.activeStroke.strokeId, [point]);
    }
  }

  private handlePointerUp(): void {
    if (!this.activeStroke) return;

    const completedStroke = this.activeStroke;
    this.retainedStrokes.push(completedStroke);
    this.activeStroke = null;

    if (this.onLocalStrokeEndCallback) {
      this.onLocalStrokeEndCallback(completedStroke);
    }
  }

  private handlePointerCancel(): void {
    this.activeStroke = null;
  }
}
