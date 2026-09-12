import { Point, Stroke, ToolConfig, ToolType } from '@shared/index';

export type { Point, Stroke, ToolConfig, ToolType };

export interface CanvasPoint {
  /** CSS pixel X relative to canvas bounding rect */
  x: number;
  /** CSS pixel Y relative to canvas bounding rect */
  y: number;
}

export function cssToNormalized(
  cssPt: CanvasPoint,
  cssWidth: number,
  cssHeight: number
): Point {
  const safeW = Math.max(1, cssWidth);
  const safeH = Math.max(1, cssHeight);
  return {
    x: Math.min(1, Math.max(0, cssPt.x / safeW)),
    y: Math.min(1, Math.max(0, cssPt.y / safeH)),
  };
}

export function normalizedToCss(
  normPt: Point,
  cssWidth: number,
  cssHeight: number
): CanvasPoint {
  return {
    x: normPt.x * cssWidth,
    y: normPt.y * cssHeight,
  };
}
