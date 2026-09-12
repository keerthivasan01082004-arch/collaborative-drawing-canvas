import { Operation } from '../../../shared/index.js';

export class OperationLog {
  private nextSeq = 1;
  private operations: Operation[] = [];
  private opIdIndex = new Map<string, Operation>();

  public append(opData: Omit<Operation, 'seq'>): Operation {
    const existing = this.opIdIndex.get(opData.operationId);
    if (existing) {
      return existing;
    }

    const seq = this.nextSeq++;
    const fullOp: Operation = {
      ...opData,
      seq,
    };

    this.operations.push(fullOp);
    this.opIdIndex.set(fullOp.operationId, fullOp);
    return fullOp;
  }

  public setUndoneStatus(operationId: string, isUndone: boolean): Operation | undefined {
    const op = this.opIdIndex.get(operationId);
    if (op) {
      op.isUndone = isUndone;
    }
    return op;
  }

  public getOperationsFrom(fromSeq: number): Operation[] {
    return this.operations.filter((op) => op.seq >= fromSeq);
  }

  public getOperationById(operationId: string): Operation | undefined {
    return this.opIdIndex.get(operationId);
  }

  public getNextSeq(): number {
    return this.nextSeq;
  }

  public getAllOperations(): Operation[] {
    return [...this.operations];
  }
}
