import { Operation } from '@shared/index';

export class OperationLogClient {
  private lastAppliedSeq = 0;
  private appliedOpIds = new Set<string>();
  private seqBuffer = new Map<number, Operation>();

  public getLastAppliedSeq(): number {
    return this.lastAppliedSeq;
  }

  public setLastAppliedSeq(seq: number): void {
    this.lastAppliedSeq = seq;
  }

  public isOperationApplied(operationId: string): boolean {
    return this.appliedOpIds.has(operationId);
  }

  public processOperation(op: Operation, applyFn: (op: Operation) => void): void {
    if (this.appliedOpIds.has(op.operationId)) {
      return;
    }

    if (op.seq <= this.lastAppliedSeq) {
      // Out of order or old duplicate seq
      this.appliedOpIds.add(op.operationId);
      return;
    }

    if (op.seq === this.lastAppliedSeq + 1) {
      this.applySingle(op, applyFn);
      this.flushBuffer(applyFn);
    } else if (op.seq > this.lastAppliedSeq + 1) {
      // Sequence gap detected, buffer operation
      this.seqBuffer.set(op.seq, op);
    }
  }

  public getBufferedCount(): number {
    return this.seqBuffer.size;
  }

  public reset(): void {
    this.lastAppliedSeq = 0;
    this.appliedOpIds.clear();
    this.seqBuffer.clear();
  }

  private applySingle(op: Operation, applyFn: (op: Operation) => void): void {
    this.appliedOpIds.add(op.operationId);
    this.lastAppliedSeq = op.seq;
    this.seqBuffer.delete(op.seq);
    applyFn(op);
  }

  private flushBuffer(applyFn: (op: Operation) => void): void {
    let nextSeq = this.lastAppliedSeq + 1;
    while (this.seqBuffer.has(nextSeq)) {
      const nextOp = this.seqBuffer.get(nextSeq)!;
      this.applySingle(nextOp, applyFn);
      nextSeq = this.lastAppliedSeq + 1;
    }
  }
}
