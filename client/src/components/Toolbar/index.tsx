import React, { useState, useRef, useEffect } from 'react';
import { useToolStore } from '../../state/toolStore';
import { useToast } from '../Toast';
import {
  BrushIcon,
  EraserIcon,
  PaletteIcon,
  SizeIcon,
  UndoIcon,
  RedoIcon,
  TrashIcon,
  DownloadIcon,
} from '../Icons';

interface ToolbarProps {
  onUndo?: () => void;
  onRedo?: () => void;
  onClear?: () => void;
  onExport?: () => void;
}

const PRESET_COLORS = [
  '#000000',
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
];

export const Toolbar: React.FC<ToolbarProps> = ({ onUndo, onRedo, onClear, onExport }) => {
  const tool = useToolStore((state) => state.tool);
  const color = useToolStore((state) => state.color);
  const width = useToolStore((state) => state.width);

  const setTool = useToolStore((state) => state.setTool);
  const setColor = useToolStore((state) => state.setColor);
  const setWidth = useToolStore((state) => state.setWidth);

  const { showToast } = useToast();

  const [activePopover, setActivePopover] = useState<'color' | 'size' | null>(null);
  const colorPopoverRef = useRef<HTMLDivElement | null>(null);
  const sizePopoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        colorPopoverRef.current &&
        !colorPopoverRef.current.contains(e.target as Node) &&
        sizePopoverRef.current &&
        !sizePopoverRef.current.contains(e.target as Node)
      ) {
        setActivePopover(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClearClick = () => {
    if (window.confirm('Clear Canvas?\n\nThis will clear the entire drawing surface for all participants in the room.')) {
      if (onClear) {
        onClear();
        showToast('Canvas cleared', 'info');
      }
    }
  };

  const handleExportClick = () => {
    if (onExport) {
      onExport();
      showToast('Exported canvas as PNG', 'success');
    }
  };

  return (
    <aside
      className="tool-rail"
      aria-label="Drawing Tools"
      style={{
        position: 'absolute',
        top: '72px',
        left: '20px',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        padding: '8px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.04)',
        border: '1px solid #e2e8f0',
      }}
    >
      {/* Brush Tool */}
      <button
        type="button"
        title="Brush Tool (B)"
        aria-label="Brush Tool"
        onClick={() => {
          setTool('brush');
          setActivePopover(null);
        }}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: tool === 'brush' ? '#eff6ff' : 'transparent',
          color: tool === 'brush' ? '#2563eb' : '#475569',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s ease',
          outline: tool === 'brush' ? '2px solid #2563eb' : 'none',
        }}
      >
        <BrushIcon color={tool === 'brush' ? '#2563eb' : '#475569'} />
      </button>

      {/* Eraser Tool */}
      <button
        type="button"
        title="Eraser Tool (E)"
        aria-label="Eraser Tool"
        onClick={() => {
          setTool('eraser');
          setActivePopover(null);
        }}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: tool === 'eraser' ? '#eff6ff' : 'transparent',
          color: tool === 'eraser' ? '#2563eb' : '#475569',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s ease',
          outline: tool === 'eraser' ? '2px solid #2563eb' : 'none',
        }}
      >
        <EraserIcon color={tool === 'eraser' ? '#2563eb' : '#475569'} />
      </button>

      <div style={{ width: '28px', height: '1px', backgroundColor: '#e2e8f0', margin: '2px 0' }} />

      {/* Color Palette Popover Trigger */}
      <div style={{ position: 'relative' }} ref={colorPopoverRef}>
        <button
          type="button"
          title="Color Palette"
          aria-label="Color Palette"
          onClick={() => setActivePopover(activePopover === 'color' ? null : 'color')}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activePopover === 'color' ? '#f1f5f9' : 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <PaletteIcon color="#475569" />
          <span
            style={{
              position: 'absolute',
              bottom: '6px',
              right: '6px',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: color,
              border: '1px solid #cbd5e1',
            }}
          />
        </button>

        {activePopover === 'color' && (
          <div
            style={{
              position: 'absolute',
              top: '0',
              left: '52px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.05)',
              border: '1px solid #e2e8f0',
              padding: '12px',
              width: '180px',
              zIndex: 100,
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>
              COLOR PALETTE
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginBottom: '10px' }}>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setColor(c);
                    setTool('brush');
                  }}
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    backgroundColor: c,
                    border: color === c ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="color"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  setTool('brush');
                }}
                style={{ width: '28px', height: '28px', border: 'none', background: 'none', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#334155' }}>
                {color.toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Brush Size Popover Trigger */}
      <div style={{ position: 'relative' }} ref={sizePopoverRef}>
        <button
          type="button"
          title="Stroke Width"
          aria-label="Stroke Width"
          onClick={() => setActivePopover(activePopover === 'size' ? null : 'size')}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activePopover === 'size' ? '#f1f5f9' : 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SizeIcon color="#475569" />
        </button>

        {activePopover === 'size' && (
          <div
            style={{
              position: 'absolute',
              top: '0',
              left: '52px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.05)',
              border: '1px solid #e2e8f0',
              padding: '12px',
              width: '180px',
              zIndex: 100,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>STROKE SIZE</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>{width}px</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              value={width}
              onChange={(e) => setWidth(parseInt(e.target.value, 10))}
              style={{ width: '100%', cursor: 'pointer', marginBottom: '12px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40px', background: '#f8fafc', borderRadius: '8px' }}>
              <div
                style={{
                  width: `${Math.min(36, Math.max(2, width))}px`,
                  height: `${Math.min(36, Math.max(2, width))}px`,
                  borderRadius: '50%',
                  backgroundColor: tool === 'eraser' ? '#94a3b8' : color,
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div style={{ width: '28px', height: '1px', backgroundColor: '#e2e8f0', margin: '2px 0' }} />

      {/* Undo Button */}
      <button
        type="button"
        title="Undo (Ctrl+Z)"
        aria-label="Undo"
        onClick={onUndo}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: 'transparent',
          color: '#475569',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <UndoIcon color="#475569" />
      </button>

      {/* Redo Button */}
      <button
        type="button"
        title="Redo (Ctrl+Shift+Z)"
        aria-label="Redo"
        onClick={onRedo}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: 'transparent',
          color: '#475569',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <RedoIcon color="#475569" />
      </button>

      <div style={{ width: '28px', height: '1px', backgroundColor: '#e2e8f0', margin: '2px 0' }} />

      {/* Clear Canvas */}
      <button
        type="button"
        title="Clear Canvas"
        aria-label="Clear Canvas"
        onClick={handleClearClick}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: 'transparent',
          color: '#ef4444',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <TrashIcon color="#ef4444" />
      </button>

      {/* Export PNG */}
      <button
        type="button"
        title="Export PNG"
        aria-label="Export PNG"
        onClick={handleExportClick}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: 'transparent',
          color: '#059669',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <DownloadIcon color="#059669" />
      </button>
    </aside>
  );
};
