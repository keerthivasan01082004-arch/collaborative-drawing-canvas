import { describe, it, expect } from 'vitest';
import { cssToNormalized, normalizedToCss } from '../types';

describe('Coordinate Conversion Utilities', () => {
  it('converts CSS pixel coordinates to normalized [0, 1] coordinates', () => {
    const cssPt = { x: 400, y: 300 };
    const normPt = cssToNormalized(cssPt, 800, 600);
    expect(normPt.x).toBe(0.5);
    expect(normPt.y).toBe(0.5);
  });

  it('clamps coordinates strictly within [0, 1]', () => {
    const cssPt = { x: -100, y: 1000 };
    const normPt = cssToNormalized(cssPt, 800, 600);
    expect(normPt.x).toBe(0);
    expect(normPt.y).toBe(1);
  });

  it('converts normalized [0, 1] coordinates back to CSS pixel coordinates', () => {
    const normPt = { x: 0.25, y: 0.75 };
    const cssPt = normalizedToCss(normPt, 800, 600);
    expect(cssPt.x).toBe(200);
    expect(cssPt.y).toBe(450);
  });

  it('handles zero or negative width/height safely without division by zero', () => {
    const cssPt = { x: 50, y: 50 };
    const normPt = cssToNormalized(cssPt, 0, 0);
    expect(normPt.x).toBe(1);
    expect(normPt.y).toBe(1);
  });
});
