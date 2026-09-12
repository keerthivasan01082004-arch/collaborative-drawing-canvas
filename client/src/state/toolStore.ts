import { create } from 'zustand';

export type ToolType = 'brush' | 'eraser';

interface ToolStoreState {
  tool: ToolType;
  color: string;
  width: number;
  setTool: (tool: ToolType) => void;
  setColor: (color: string) => void;
  setWidth: (width: number) => void;
}

export const useToolStore = create<ToolStoreState>((set) => ({
  tool: 'brush',
  color: '#000000',
  width: 4,
  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color }),
  setWidth: (width) => set({ width }),
}));
