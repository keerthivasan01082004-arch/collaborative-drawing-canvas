import React, { useRef } from 'react';
import { useCanvasEngine } from '../hooks/useCanvasEngine';

export const CanvasSurface: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useCanvasEngine(canvasRef);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#ffffff' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          touchAction: 'none',
          cursor: 'crosshair',
        }}
      />
    </div>
  );
};
