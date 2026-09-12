import { describe, it, expect, vi } from 'vitest';
import { StrokeRenderer } from '../StrokeRenderer';
import { Stroke } from '../types';

describe('StrokeRenderer', () => {
  function createMockContext(): CanvasRenderingContext2D {
    return {
      globalCompositeOperation: 'source-over',
      strokeStyle: '#000000',
      fillStyle: '#000000',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
  }

  it('configures source-over for brush tool', () => {
    const ctx = createMockContext();
    const renderer = new StrokeRenderer(ctx);

    renderer.setToolStyle('brush', '#ff0000', 8);

    expect(ctx.globalCompositeOperation).toBe('source-over');
    expect(ctx.strokeStyle).toBe('#ff0000');
    expect(ctx.lineWidth).toBe(8);
    expect(ctx.lineCap).toBe('round');
    expect(ctx.lineJoin).toBe('round');
  });

  it('configures destination-out for eraser tool', () => {
    const ctx = createMockContext();
    const renderer = new StrokeRenderer(ctx);

    renderer.setToolStyle('eraser', '#000000', 12);

    expect(ctx.globalCompositeOperation).toBe('destination-out');
    expect(ctx.lineWidth).toBe(12);
    expect(ctx.lineCap).toBe('round');
    expect(ctx.lineJoin).toBe('round');
  });

  it('renders a multi-point stroke correctly', () => {
    const ctx = createMockContext();
    const renderer = new StrokeRenderer(ctx);

    const stroke: Stroke = {
      strokeId: 'test_stroke',
      tool: 'brush',
      color: '#00ff00',
      width: 4,
      points: [
        { x: 0.1, y: 0.1 },
        { x: 0.5, y: 0.5 },
      ],
    };

    renderer.renderStroke(stroke, 800, 600);

    expect(ctx.save).toHaveBeenCalledTimes(1);
    expect(ctx.beginPath).toHaveBeenCalledTimes(1);
    expect(ctx.moveTo).toHaveBeenCalledWith(80, 60);
    expect(ctx.lineTo).toHaveBeenCalledWith(400, 300);
    expect(ctx.stroke).toHaveBeenCalledTimes(1);
    expect(ctx.restore).toHaveBeenCalledTimes(1);
  });
});
