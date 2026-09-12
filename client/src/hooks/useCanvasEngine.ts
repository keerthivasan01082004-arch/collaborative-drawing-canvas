import { useEffect, useRef } from 'react';
import { CanvasEngine } from '../canvas/CanvasEngine';
import { useToolStore } from '../state/toolStore';

export const useCanvasEngine = (canvasRef: React.RefObject<HTMLCanvasElement | null>) => {
  const engineRef = useRef<CanvasEngine | null>(null);
  const tool = useToolStore((state) => state.tool);
  const color = useToolStore((state) => state.color);
  const width = useToolStore((state) => state.width);

  useEffect(() => {
    if (canvasRef.current && !engineRef.current) {
      engineRef.current = new CanvasEngine(canvasRef.current);
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [canvasRef]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setToolConfig({ tool, color, width });
    }
  }, [tool, color, width]);

  return engineRef;
};
