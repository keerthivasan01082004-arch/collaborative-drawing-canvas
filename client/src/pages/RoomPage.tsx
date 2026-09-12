import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TopBar } from '../components/TopBar';
import { Toolbar } from '../components/Toolbar';
import { RemoteCursors } from '../components/RemoteCursors';
import { useCanvasEngine } from '../hooks/useCanvasEngine';
import { ConnectionManager } from '../collaboration/ConnectionManager';
import { OperationLogClient } from '../collaboration/OperationLogClient';
import { useRoomStore } from '../state/roomStore';
import { useToolStore } from '../state/toolStore';
import { useToast } from '../components/Toast';
import { Point, Stroke } from '@shared/index';

interface RoomPageProps {
  roomId: string;
  userName: string;
  onLeave: () => void;
}

export const RoomPage: React.FC<RoomPageProps> = ({ roomId, userName, onLeave }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useCanvasEngine(canvasRef);
  const { showToast } = useToast();

  const setStatus = useRoomStore((state) => state.setStatus);
  const addUser = useRoomStore((state) => state.addUser);
  const removeUser = useRoomStore((state) => state.removeUser);
  const setTool = useToolStore((state) => state.setTool);

  const connectionRef = useRef<ConnectionManager | null>(null);
  const opLogClientRef = useRef<OperationLogClient>(new OperationLogClient());
  const localHistoryRef = useRef<{ operationId: string; strokeId?: string }[]>([]);

  const [remoteCursors, setRemoteCursors] = useState<Map<string, Point>>(new Map());
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  // Update container dimensions for remote cursor overlay scaling
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Connection & protocol event handlers
  useEffect(() => {
    let wsUrl: string;
    const envWsUrl = (import.meta as any).env?.VITE_WS_URL;
    if (envWsUrl) {
      if (envWsUrl.startsWith('http://')) {
        wsUrl = envWsUrl.replace('http://', 'ws://');
      } else if (envWsUrl.startsWith('https://')) {
        wsUrl = envWsUrl.replace('https://', 'wss://');
      } else {
        wsUrl = envWsUrl;
      }
    } else {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.host;
      const isLocalVite = window.location.port === '5173';
      const targetHost = isLocalVite ? `${window.location.hostname}:3000` : wsHost;
      wsUrl = `${wsProtocol}//${targetHost}`;
    }

    const conn = new ConnectionManager({
      onStatusChange: (status) => {
        setStatus(status);
        if (status === 'reconnecting') {
          showToast('Connection lost. Reconnecting...', 'warning');
        } else if (status === 'connected') {
          showToast('Connected to studio room', 'success');
        }
      },
      onSyncState: (baselineSeq, operations) => {
        opLogClientRef.current.setLastAppliedSeq(baselineSeq);
        if (engineRef.current) {
          engineRef.current.clear();
          for (const op of operations) {
            opLogClientRef.current.processOperation(op, (appliedOp) => {
              engineRef.current?.applyRemoteOperation(appliedOp);
            });
          }
        }
      },
      onUserJoined: (uId, uName) => {
        addUser(uId, uName);
        showToast(`${uName || 'A new artist'} joined the room`, 'info');
      },
      onUserLeft: (uId) => {
        removeUser(uId);
        setRemoteCursors((prev) => {
          const next = new Map(prev);
          next.delete(uId);
          return next;
        });
      },
      onStrokeBegin: (_uId, strokeId, tool, color, width, point) => {
        engineRef.current?.renderRemoteStrokeBegin(strokeId, tool, color, width, point);
      },
      onStrokeAppend: (_uId, strokeId, points) => {
        engineRef.current?.renderRemoteStrokeAppend(strokeId, points);
      },
      onStrokeEnd: (_uId, operation) => {
        opLogClientRef.current.processOperation(operation, (op) => {
          engineRef.current?.applyRemoteOperation(op);
        });
      },
      onUndoApplied: (_uId, operation) => {
        opLogClientRef.current.processOperation(operation, () => {
          engineRef.current?.redraw();
        });
      },
      onRedoApplied: (_uId, operation) => {
        opLogClientRef.current.processOperation(operation, () => {
          engineRef.current?.redraw();
        });
      },
      onClearApplied: (_uId, operation) => {
        opLogClientRef.current.processOperation(operation, () => {
          engineRef.current?.clear();
        });
      },
      onCursorMove: (userId, position) => {
        setRemoteCursors((prev) => {
          const next = new Map(prev);
          next.set(userId, position);
          return next;
        });
      },
      onError: (code, msg) => {
        showToast(`${code}: ${msg}`, 'error');
      },
    });

    connectionRef.current = conn;
    conn.connect(wsUrl, roomId, userName);

    return () => {
      conn.leaveRoom();
      conn.disconnect();
    };
  }, [roomId, userName, setStatus, addUser, removeUser, engineRef, showToast]);

  // Connect local CanvasEngine events to ConnectionManager
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    engine.setOnLocalStrokeBegin((strokeId, point) => {
      connectionRef.current?.sendStrokeBegin(
        strokeId,
        engine.getToolConfig().tool,
        engine.getToolConfig().color,
        engine.getToolConfig().width,
        point
      );
    });

    engine.setOnLocalStrokeAppend((strokeId, points) => {
      connectionRef.current?.queueStrokeAppend(strokeId, points);
    });

    engine.setOnLocalStrokeEnd((completedStroke: Stroke) => {
      const opId = `op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      localHistoryRef.current.push({ operationId: opId, strokeId: completedStroke.strokeId });
      connectionRef.current?.sendStrokeEnd(opId, completedStroke);
    });
  }, [engineRef]);

  const handleUndo = useCallback(() => {
    const lastOp = localHistoryRef.current.pop();
    if (!lastOp) return;
    const undoOpId = `undo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    connectionRef.current?.sendUndo(undoOpId, lastOp.operationId);
  }, []);

  const handleRedo = useCallback(() => {
    // Redo handler placeholder
  }, []);

  const handleClear = useCallback(() => {
    const clearOpId = `clear_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    connectionRef.current?.sendClear(clearOpId);
    engineRef.current?.clear();
  }, [engineRef]);

  const handleExportPNG = useCallback(() => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `collabdraw_${roomId}.png`;
    link.href = dataUrl;
    link.click();
  }, [roomId]);

  // Keyboard Shortcuts (B = Brush, E = Eraser, Ctrl+Z = Undo, Ctrl+Shift+Z = Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (!e.ctrlKey && !e.metaKey) {
        if (e.key.toLowerCase() === 'b') {
          setTool('brush');
        } else if (e.key.toLowerCase() === 'e') {
          setTool('eraser');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setTool, handleUndo, handleRedo]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
      <TopBar onLeave={onLeave} />

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex' }}>
        <Toolbar onUndo={handleUndo} onRedo={handleRedo} onClear={handleClear} onExport={handleExportPNG} />

        {/* Centered Canvas Container */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            position: 'relative',
            margin: '16px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.02)',
            overflow: 'hidden',
            border: '1px solid #cbd5e1',
          }}
        >
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

          <RemoteCursors cursors={remoteCursors} containerWidth={containerSize.width} containerHeight={containerSize.height} />
        </div>
      </div>

      {/* Bottom Status / Zoom Indicator Area */}
      <footer
        style={{
          height: '32px',
          backgroundColor: '#0f172a',
          color: '#94a3b8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          fontSize: '0.75rem',
          fontWeight: 600,
          borderTop: '1px solid #1e293b',
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>Shortcuts: [B] Brush &nbsp; [E] Eraser &nbsp; [Ctrl+Z] Undo</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Zoom: 100%</span>
        </div>
      </footer>
    </div>
  );
};
