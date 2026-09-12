import { z } from 'zod';

export const PointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export type Point = z.infer<typeof PointSchema>;

export const ToolTypeSchema = z.enum(['brush', 'eraser']);
export type ToolType = z.infer<typeof ToolTypeSchema>;

export const ToolConfigSchema = z.object({
  tool: ToolTypeSchema,
  color: z.string().min(1).max(32),
  width: z.number().positive().max(200),
});
export type ToolConfig = z.infer<typeof ToolConfigSchema>;

export const StrokeSchema = z.object({
  strokeId: z.string().min(1).max(64),
  tool: ToolTypeSchema,
  color: z.string().min(1).max(32),
  width: z.number().positive().max(200),
  points: z.array(PointSchema).min(1).max(5000),
});
export type Stroke = z.infer<typeof StrokeSchema>;

export const UndoRedoPayloadSchema = z.object({
  targetOperationId: z.string().min(1).max(64),
});
export type UndoRedoPayload = z.infer<typeof UndoRedoPayloadSchema>;

export const ClearPayloadSchema = z.object({});
export type ClearPayload = z.infer<typeof ClearPayloadSchema>;

export const OperationTypeSchema = z.enum(['STROKE', 'UNDO', 'REDO', 'CLEAR']);
export type OperationType = z.infer<typeof OperationTypeSchema>;

export const OperationSchema = z.object({
  operationId: z.string().min(1).max(64),
  roomId: z.string().min(1).max(64),
  userId: z.string().min(1).max(64),
  seq: z.number().int().nonnegative(),
  type: OperationTypeSchema,
  clientTimestamp: z.number().int().positive(),
  payload: z.union([StrokeSchema, UndoRedoPayloadSchema, ClearPayloadSchema]),
  isUndone: z.boolean().optional(),
});
export type Operation = z.infer<typeof OperationSchema>;
