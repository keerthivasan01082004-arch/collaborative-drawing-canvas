import { Point, Stroke, ToolType, normalizedToCss } from './types';

export class StrokeRenderer {
  constructor(private ctx: CanvasRenderingContext2D) {}

  public getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  public setToolStyle(tool: ToolType, color: string, width: number): void {
    if (tool === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out';
    } else {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.strokeStyle = color;
      this.ctx.fillStyle = color;
    }
    this.ctx.lineWidth = width;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  public renderSegment(
    p1: Point,
    p2: Point,
    tool: ToolType,
    color: string,
    width: number,
    cssWidth: number,
    cssHeight: number
  ): void {
    this.ctx.save();
    this.setToolStyle(tool, color, width);

    const pt1 = normalizedToCss(p1, cssWidth, cssHeight);
    const pt2 = normalizedToCss(p2, cssWidth, cssHeight);

    this.ctx.beginPath();
    this.ctx.moveTo(pt1.x, pt1.y);
    this.ctx.lineTo(pt2.x, pt2.y);
    this.ctx.stroke();

    this.ctx.restore();
  }

  public renderDot(
    point: Point,
    tool: ToolType,
    color: string,
    width: number,
    cssWidth: number,
    cssHeight: number
  ): void {
    this.ctx.save();
    this.setToolStyle(tool, color, width);

    const pt = normalizedToCss(point, cssWidth, cssHeight);

    this.ctx.beginPath();
    this.ctx.arc(pt.x, pt.y, Math.max(0.5, width / 2), 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  public renderStroke(
    stroke: Stroke,
    cssWidth: number,
    cssHeight: number
  ): void {
    if (!stroke.points || stroke.points.length === 0) return;

    if (stroke.points.length === 1) {
      this.renderDot(
        stroke.points[0],
        stroke.tool,
        stroke.color,
        stroke.width,
        cssWidth,
        cssHeight
      );
      return;
    }

    this.ctx.save();
    this.setToolStyle(stroke.tool, stroke.color, stroke.width);

    const firstPt = normalizedToCss(stroke.points[0], cssWidth, cssHeight);
    this.ctx.beginPath();
    this.ctx.moveTo(firstPt.x, firstPt.y);

    for (let i = 1; i < stroke.points.length; i++) {
      const pt = normalizedToCss(stroke.points[i], cssWidth, cssHeight);
      this.ctx.lineTo(pt.x, pt.y);
    }
    this.ctx.stroke();

    this.ctx.restore();
  }
}
