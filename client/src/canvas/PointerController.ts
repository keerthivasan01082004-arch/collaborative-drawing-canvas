import { Point, cssToNormalized } from './types';

export interface PointerControllerCallbacks {
  onPointerDown: (point: Point) => void;
  onPointerMove: (point: Point) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
}

export class PointerController {
  private activePointerId: number | null = null;
  private isPointerDown = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private callbacks: PointerControllerCallbacks
  ) {
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handlePointerCancel = this.handlePointerCancel.bind(this);

    this.attach();
  }

  private attach(): void {
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.canvas.addEventListener('pointermove', this.handlePointerMove);
    this.canvas.addEventListener('pointerup', this.handlePointerUp);
    this.canvas.addEventListener('pointercancel', this.handlePointerCancel);
  }

  public destroy(): void {
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
    this.canvas.removeEventListener('pointercancel', this.handlePointerCancel);
    if (this.activePointerId !== null && this.canvas.hasPointerCapture(this.activePointerId)) {
      try {
        this.canvas.releasePointerCapture(this.activePointerId);
      } catch {
        // Ignore if unsupported in test envs
      }
    }
    this.activePointerId = null;
    this.isPointerDown = false;
  }

  private getNormalizedPoint(e: PointerEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    return cssToNormalized({ x: cssX, y: cssY }, rect.width, rect.height);
  }

  private handlePointerDown(e: PointerEvent): void {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    this.isPointerDown = true;
    this.activePointerId = e.pointerId;

    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if setPointerCapture fails in test envs
    }

    const normPoint = this.getNormalizedPoint(e);
    this.callbacks.onPointerDown(normPoint);
  }

  private handlePointerMove(e: PointerEvent): void {
    if (!this.isPointerDown || (this.activePointerId !== null && e.pointerId !== this.activePointerId)) {
      return;
    }

    const normPoint = this.getNormalizedPoint(e);
    this.callbacks.onPointerMove(normPoint);
  }

  private handlePointerUp(e: PointerEvent): void {
    if (!this.isPointerDown || (this.activePointerId !== null && e.pointerId !== this.activePointerId)) {
      return;
    }

    if (this.activePointerId !== null && this.canvas.hasPointerCapture(this.activePointerId)) {
      try {
        this.canvas.releasePointerCapture(this.activePointerId);
      } catch {
        // Ignore in test envs
      }
    }

    this.isPointerDown = false;
    this.activePointerId = null;
    this.callbacks.onPointerUp();
  }

  private handlePointerCancel(e: PointerEvent): void {
    if (!this.isPointerDown || (this.activePointerId !== null && e.pointerId !== this.activePointerId)) {
      return;
    }

    if (this.activePointerId !== null && this.canvas.hasPointerCapture(this.activePointerId)) {
      try {
        this.canvas.releasePointerCapture(this.activePointerId);
      } catch {
        // Ignore in test envs
      }
    }

    this.isPointerDown = false;
    this.activePointerId = null;
    this.callbacks.onPointerCancel();
  }
}
