"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { 
  PenTool, 
  Eraser, 
  Type, 
  Trash2, 
  Undo2, 
  Redo2, 
  Download, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Edit3, 
  Check, 
  X, 
  Palette, 
  Monitor,
  HelpCircle,
  Save,
  Hand,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { cn } from "@/lib/utils";

// Define canvas actions types
interface DrawPoint {
  x: number;
  y: number;
}

interface DrawAction {
  type: 'draw' | 'erase';
  points: DrawPoint[];
  color: string;
  size: number;
}

interface TextAction {
  type: 'text';
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
}

type CanvasAction = DrawAction | TextAction;

interface SavedBoard {
  id: string;
  name: string;
  actions: CanvasAction[];
  bgMode: 'whiteboard' | 'blackboard';
  createdAt: string;
}

export default function WhiteboardPage() {
  // Canvas and workspace references
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentActionRef = useRef<CanvasAction | null>(null);

  // Core Whiteboard Settings state
  const [tool, setTool] = useState<'pen' | 'eraser' | 'text' | 'pan'>('pen');
  const [bgMode, setBgMode] = useState<'whiteboard' | 'blackboard'>('blackboard');
  const [strokeColor, setStrokeColor] = useState<string>('#ffffff');
  const [strokeSize, setStrokeSize] = useState<number>(5);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [actions, setActions] = useState<CanvasAction[]>([]);
  const [redoStack, setRedoStack] = useState<CanvasAction[]>([]);
  
  // High-performance actions reference to prevent stale closures inside global key handlers / resizes
  const actionsRef = useRef<CanvasAction[]>([]);
  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  // Grab panning state for Miro / Excalidraw scroll UX
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ scrollLeft: 0, scrollTop: 0, clientX: 0, clientY: 0 });

  // Custom direct text input state (persistent, mobile-optimized synchronous focus)
  const [typingState, setTypingState] = useState<{ x: number; y: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Zoom engine state (ranges from 0.5 to 2.0)
  const [zoom, setZoom] = useState<number>(1);

  // Multi-board state management
  const [boards, setBoards] = useState<SavedBoard[]>([]);
  const [currentBoardId, setCurrentBoardId] = useState<string>("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [mounted, setMounted] = useState(false);

  // Dynamically map colors based on the board background theme (Whiteboard/Blackboard)
  const colors = useMemo(() => {
    if (bgMode === 'whiteboard') {
      return [
        { name: 'Classic Slate', hex: '#0f172a' },
        { name: 'Royal Indigo', hex: '#4f46e5' },
        { name: 'Vibrant Violet', hex: '#8b5cf6' },
        { name: 'Emerald Green', hex: '#10b981' },
        { name: 'Crimson Red', hex: '#ef4444' },
        { name: 'Amber Gold', hex: '#f59e0b' },
        { name: 'Ocean Blue', hex: '#0ea5e9' },
      ];
    } else {
      return [
        { name: 'Neon White', hex: '#ffffff' },
        { name: 'Glow Cyan', hex: '#22d3ee' },
        { name: 'Neon Pink', hex: '#f472b6' },
        { name: 'Glow Green', hex: '#4ade80' },
        { name: 'Neon Yellow', hex: '#facc15' },
        { name: 'Electric Indigo', hex: '#818cf8' },
        { name: 'Soft Peach', hex: '#fca5a5' },
      ];
    }
  }, [bgMode]);

  // Adjust default colors when background mode toggles
  useEffect(() => {
    if (bgMode === 'whiteboard') {
      if (!colors.some(c => c.hex === strokeColor) || strokeColor === '#ffffff') {
        setStrokeColor('#0f172a'); // default dark slate for whiteboard
      }
    } else {
      if (!colors.some(c => c.hex === strokeColor) || strokeColor === '#0f172a') {
        setStrokeColor('#ffffff'); // default white for blackboard
      }
    }
  }, [bgMode, colors, strokeColor]);

  // 1. Initial Load & Setup (runs once on client mount)
  useEffect(() => {
    setMounted(true);
    
    // Load saved boards from localStorage
    const saved = localStorage.getItem("studyflow_boards");
    let loadedBoards: SavedBoard[] = [];
    
    if (saved) {
      try {
        loadedBoards = JSON.parse(saved);
        setBoards(loadedBoards);
      } catch (e) {
        console.error("Error parsing saved boards", e);
      }
    }

    // If no boards exist, create a default one
    if (loadedBoards.length === 0) {
      const defaultBoard: SavedBoard = {
        id: "default-board-1",
        name: "My First Canvas",
        actions: [],
        bgMode: 'blackboard',
        createdAt: new Date().toISOString()
      };
      const initialList = [defaultBoard];
      setBoards(initialList);
      setCurrentBoardId(defaultBoard.id);
      localStorage.setItem("studyflow_boards", JSON.stringify(initialList));
      setBgMode(defaultBoard.bgMode);
      setActions(defaultBoard.actions);
    } else {
      // Open the last saved or first board
      const lastBoard = loadedBoards[0];
      setCurrentBoardId(lastBoard.id);
      setBgMode(lastBoard.bgMode);
      setActions(lastBoard.actions);
    }

    // Setup responsive canvas resize listener
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Reset scroll container to top-left origin on mount or active board switch
  useEffect(() => {
    if (!mounted) return;
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollLeft = 0;
      container.scrollTop = 0;
    }
  }, [mounted, currentBoardId]);

  // 2. Automatically redraw canvas whenever actions update
  useEffect(() => {
    if (!mounted) return;
    redrawCanvas();
  }, [actions, mounted]);

  // Global hotkey manager (with proper dependency tracking to avoid stale state closures)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        return;
      }

      // Spacebar switches to Pan tool
      if (e.code === 'Space') {
        e.preventDefault();
        setTool('pan');
        return;
      }

      // Key shortcuts for tools: P (Pen), E (Eraser), H (Hand/Pan), T (Text)
      const key = e.key.toLowerCase();
      if (key === 'p') {
        setTool('pen');
      } else if (key === 'e') {
        setTool('eraser');
      } else if (key === 't') {
        setTool('text');
      } else if (key === 'h') {
        setTool('pan');
      }

      // Ctrl+Z (Undo) and Ctrl+Y (Redo)
      if ((e.ctrlKey || e.metaKey) && key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && key === 'y') {
        e.preventDefault();
        handleRedo();
      }

      // Ctrl + / = (Zoom In), Ctrl - (Zoom Out), Ctrl 0 (Reset Zoom)
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoomIn();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        handleZoomReset();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [actions, redoStack, tool, typingState, zoom]);

  // Redraw helper
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawActionsOnCanvas(ctx, actionsRef.current);
  };

  // Resize handler - set logical canvas coordinate bounds (3200x3200) for sharp retina rendering
  const handleResize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = 3200;
    const height = 3200;
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      drawActionsOnCanvas(ctx, actionsRef.current);
    }
  };

  // Draw operations
  const drawActionsOnCanvas = (ctx: CanvasRenderingContext2D, actionList: CanvasAction[]) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    actionList.forEach(action => {
      if (action.type === 'draw' || action.type === 'erase') {
        if (action.points.length === 0) return;
        
        ctx.beginPath();
        ctx.lineWidth = action.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (action.type === 'erase') {
          ctx.globalCompositeOperation = 'destination-out';
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = action.color;
        }
        
        if (action.points.length === 1) {
          ctx.arc(action.points[0].x, action.points[0].y, action.size / 2, 0, Math.PI * 2);
          ctx.fillStyle = action.type === 'erase' ? 'transparent' : action.color;
          ctx.fill();
        } else {
          ctx.moveTo(action.points[0].x, action.points[0].y);
          // Use quadratic curves for exceptionally smooth drawing (Excalidraw quality)
          let i;
          for (i = 1; i < action.points.length - 2; i++) {
            const xc = (action.points[i].x + action.points[i + 1].x) / 2;
            const yc = (action.points[i].y + action.points[i + 1].y) / 2;
            ctx.quadraticCurveTo(action.points[i].x, action.points[i].y, xc, yc);
          }
          // Curve to the last point
          if (action.points[i]) {
            ctx.quadraticCurveTo(action.points[i].x, action.points[i].y, action.points[i + 1].x, action.points[i + 1].y);
          }
          ctx.stroke();
        }
      } else if (action.type === 'text') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = action.color;
        
        // Match standard font sizes with smooth styling
        ctx.font = `600 ${action.size}px sans-serif`;
        ctx.textBaseline = 'top';
        
        const lines = action.text.split('\n');
        lines.forEach((line, index) => {
          ctx.fillText(line, action.x, action.y + (index * action.size * 1.25));
        });
      }
    });
  };

  // Panning grab-scroll logic for infinite board feeling
  const startPanning = (clientX: number, clientY: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    setIsPanning(true);
    panStartRef.current = {
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
      clientX,
      clientY
    };
  };

  const pan = (clientX: number, clientY: number) => {
    if (!isPanning) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const dx = clientX - panStartRef.current.clientX;
    const dy = clientY - panStartRef.current.clientY;

    container.scrollLeft = panStartRef.current.scrollLeft - dx;
    container.scrollTop = panStartRef.current.scrollTop - dy;
  };

  const stopPanning = () => {
    setIsPanning(false);
  };

  // Triggers canvas resize once element is in DOM
  useEffect(() => {
    if (mounted) {
      setTimeout(handleResize, 100);
    }
  }, [mounted, isSidebarOpen, currentBoardId]);

  // Coordinate capture relative to canvas client bounds
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const activeZoom = zoom || 1;
    
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      // Handle zoom / double tap scaling properly
      return {
        x: (e.touches[0].clientX - rect.left) / activeZoom,
        y: (e.touches[0].clientY - rect.top) / activeZoom
      };
    } else {
      return {
        x: (e.clientX - rect.left) / activeZoom,
        y: (e.clientY - rect.top) / activeZoom
      };
    }
  };

  // Drawing event handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (tool === 'pan') {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      startPanning(clientX, clientY);
      return;
    }

    const coords = getCoordinates(e);
    if (!coords) return;

    if (tool === 'text') {
      // Prevent browser default action from stealing focus on laptop mouse clicks
      if (!('touches' in e)) {
        e.preventDefault();
      }
      // Instant Text Spawn Mode
      handleTextSpawn(coords.x, coords.y);
      return;
    }

    setIsDrawing(true);
    const newAction: CanvasAction = {
      type: tool === 'eraser' ? 'erase' : 'draw',
      points: [coords],
      color: strokeColor,
      size: strokeSize,
    };
    
    currentActionRef.current = newAction;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (tool === 'pan') {
      if (isPanning) {
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        pan(clientX, clientY);
      }
      return;
    }

    if (!isDrawing || !currentActionRef.current) return;
    const coords = getCoordinates(e);
    if (!coords) return;

    const action = currentActionRef.current;
    if (action.type === 'draw' || action.type === 'erase') {
      action.points.push(coords);
      
      // Perform immediate drawing segment for lag-free performance
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
        const p1 = action.points[action.points.length - 2];
        const p2 = coords;
        
        ctx.beginPath();
        ctx.lineWidth = action.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (action.type === 'erase') {
          ctx.globalCompositeOperation = 'destination-out';
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = action.color;
        }
        
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    if (tool === 'pan') {
      stopPanning();
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentActionRef.current) {
      const updatedActions = [...actions, currentActionRef.current];
      setActions(updatedActions);
      setRedoStack([]); // reset redo history
      currentActionRef.current = null;
      
      // Auto save
      saveBoardState(updatedActions);
    }
  };

  // Direct Text Mode click-to-type SPAWN
  const handleTextSpawn = (x: number, y: number) => {
    // If already typing, commit the current text first!
    if (typingState && textareaRef.current && textareaRef.current.value.trim()) {
      commitText();
    }
    
    // Set active typing coordinates
    setTypingState({ x, y });
    
    // Focus and clear the persistent textarea synchronously
    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.left = `${x}px`;
      textareaRef.current.style.top = `${y}px`;
      textareaRef.current.focus({ preventScroll: true }); // Prevent browser from auto-scrolling the viewport away!
    }
  };

  // Commits text overlay value directly into canvas actions
  const commitText = () => {
    if (!typingState || !textareaRef.current) return;
    const rawValue = textareaRef.current.value;
    const trimmed = rawValue.trim();
    
    if (trimmed) {
      // Map stroke brush sizes to beautiful readable text font sizes
      let fontSize = 24;
      if (strokeSize === 2) fontSize = 16;
      else if (strokeSize === 5) fontSize = 24;
      else if (strokeSize === 10) fontSize = 36;
      else if (strokeSize === 18) fontSize = 48;

      const newTextAction: CanvasAction = {
        type: 'text',
        x: typingState.x,
        y: typingState.y,
        text: trimmed,
        color: strokeColor,
        size: fontSize,
      };

      const updatedActions = [...actions, newTextAction];
      setActions(updatedActions);
      setRedoStack([]);
      saveBoardState(updatedActions);
    }
    
    setTypingState(null);
    if (textareaRef.current) {
      textareaRef.current.value = "";
    }
  };

  // Undo/Redo logic
  const handleUndo = () => {
    if (actions.length === 0) return;
    const previousActions = [...actions];
    const undoneAction = previousActions.pop();
    
    if (undoneAction) {
      setActions(previousActions);
      setRedoStack([undoneAction, ...redoStack]);
      saveBoardState(previousActions);
    }
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextRedo = [...redoStack];
    const redoneAction = nextRedo.shift();
    
    if (redoneAction) {
      const updatedActions = [...actions, redoneAction];
      setActions(updatedActions);
      setRedoStack(nextRedo);
      saveBoardState(updatedActions);
    }
  };

  // Zoom engine handlers
  const handleZoomIn = () => {
    setZoom(prev => Math.min(2.0, parseFloat((prev + 0.1).toFixed(1))));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(0.5, parseFloat((prev - 0.1).toFixed(1))));
  };

  const handleZoomReset = () => {
    setZoom(1.0);
  };

  // Clear Canvas Board
  const clearBoard = () => {
    if (actions.length === 0) return;
    if (confirm("Are you sure you want to clear this entire canvas?")) {
      setActions([]);
      setRedoStack([]);
      saveBoardState([]);
      toast.success("Board cleared");
    }
  };

  // Multi-Board Manager Operations
  const saveBoardState = (updatedActions: CanvasAction[]) => {
    const list: SavedBoard[] = boards.map(b => {
      if (b.id === currentBoardId) {
        return { ...b, actions: updatedActions, bgMode };
      }
      return b;
    });
    setBoards(list);
    localStorage.setItem("studyflow_boards", JSON.stringify(list));
  };

  // Switch Active Boards
  const switchBoard = (boardId: string) => {
    if (typingState) {
      commitText();
    }
    
    const selected = boards.find(b => b.id === boardId);
    if (selected) {
      setCurrentBoardId(selected.id);
      setBgMode(selected.bgMode);
      setActions(selected.actions);
      setRedoStack([]);
      toast.success(`Switched to "${selected.name}"`);
    }
  };

  // Create new blank board
  const createNewBoard = () => {
    if (typingState) {
      commitText();
    }

    const newId = `board-${Date.now()}`;
    const name = `Sketch #${boards.length + 1}`;
    
    const newBoard: SavedBoard = {
      id: newId,
      name,
      actions: [],
      bgMode: 'blackboard',
      createdAt: new Date().toISOString()
    };
    
    const updated = [newBoard, ...boards];
    setBoards(updated);
    localStorage.setItem("studyflow_boards", JSON.stringify(updated));
    
    setCurrentBoardId(newId);
    setBgMode(newBoard.bgMode);
    setActions([]);
    setRedoStack([]);
    
    toast.success(`Created board: "${name}"`);
  };

  // Delete Board
  const deleteBoard = (boardId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent loading board
    
    if (boards.length <= 1) {
      toast.error("You must keep at least one active board!");
      return;
    }

    const target = boards.find(b => b.id === boardId);
    if (!target) return;

    if (confirm(`Are you sure you want to delete "${target.name}"?`)) {
      const remaining = boards.filter(b => b.id !== boardId);
      setBoards(remaining);
      localStorage.setItem("studyflow_boards", JSON.stringify(remaining));
      
      // If we deleted our currently open board, switch to the first remaining one
      if (currentBoardId === boardId) {
        const fallback = remaining[0];
        setCurrentBoardId(fallback.id);
        setBgMode(fallback.bgMode);
        setActions(fallback.actions);
        setRedoStack([]);
      }
      toast.success("Board deleted");
    }
  };

  // Start Rename Board Mode
  const startRename = (boardId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBoardId(boardId);
    setRenameValue(currentName);
  };

  // Save renamed board
  const saveRename = (boardId: string) => {
    const name = renameValue.trim();
    if (!name) {
      toast.error("Board name cannot be blank!");
      return;
    }
    
    const updated = boards.map(b => b.id === boardId ? { ...b, name } : b);
    setBoards(updated);
    localStorage.setItem("studyflow_boards", JSON.stringify(updated));
    setEditingBoardId(null);
    toast.success("Board renamed");
  };

  // Toggle Background Mode
  const toggleBgMode = () => {
    const nextMode: 'whiteboard' | 'blackboard' = bgMode === 'whiteboard' ? 'blackboard' : 'whiteboard';
    setBgMode(nextMode);
    
    // Save background mode setting directly to board state
    const list: SavedBoard[] = boards.map(b => {
      if (b.id === currentBoardId) {
        return { ...b, bgMode: nextMode };
      }
      return b;
    });
    setBoards(list);
    localStorage.setItem("studyflow_boards", JSON.stringify(list));
    toast.success(`Switched to ${nextMode === 'whiteboard' ? 'Whiteboard' : 'Blackboard'}`);
  };

  // Export board as standard PNG image
  const exportAsPng = () => {
    if (typingState) {
      commitText();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a temporary off-screen canvas to capture drawing WITH background filled in.
    // (This guarantees dark slate background for Blackboard PNGs and clean grids!)
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return;

    // Scale to matches device DPI
    const dpr = window.devicePixelRatio || 1;
    exportCtx.scale(dpr, dpr);

    // 1. Draw solid background color matching canvas setting
    const logicalWidth = canvas.width / dpr;
    const logicalHeight = canvas.height / dpr;
    
    exportCtx.fillStyle = bgMode === 'whiteboard' ? '#ffffff' : '#0b0f19';
    exportCtx.fillRect(0, 0, logicalWidth, logicalHeight);

    // 2. Re-draw subtle grid on exported image for premium feel
    exportCtx.fillStyle = bgMode === 'whiteboard' ? 'rgba(15, 23, 42, 0.08)' : 'rgba(99, 102, 241, 0.15)';
    for (let x = 0; x < logicalWidth; x += 24) {
      for (let y = 0; y < logicalHeight; y += 24) {
        exportCtx.beginPath();
        exportCtx.arc(x, y, 1.2, 0, Math.PI * 2);
        exportCtx.fill();
      }
    }

    // 3. Draw actual user whiteboard actions
    drawActionsOnCanvas(exportCtx, actions);

    // 4. Download png file trigger
    try {
      const dataUrl = exportCanvas.toDataURL('image/png');
      const activeBoard = boards.find(b => b.id === currentBoardId);
      const filename = activeBoard ? activeBoard.name.replace(/\s+/g, '-').toLowerCase() : 'whiteboard';
      
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = dataUrl;
      link.click();
      
      toast.success("Sketch exported successfully!");
    } catch (err) {
      toast.error("Could not export image.");
      console.error(err);
    }
  };

  // SSR loading placeholder
  if (!mounted) {
    return (
      <div className="h-[600px] w-full flex items-center justify-center rounded-3xl glass">
        <div className="text-center space-y-4">
          <Palette className="h-12 w-12 text-primary animate-pulse mx-auto" />
          <p className="text-muted-foreground font-semibold">Configuring Premium Canvas Studio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-500 font-sans">
            Canvas Workspace
          </h1>
          <p className="text-muted-foreground mt-1.5 text-base font-sans">
            Solve DSA algorithms, sketch flowcharts, outline essays, or draw notes freely.
          </p>
        </div>

        {/* Global Control Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick theme switcher for board style */}
          <button
            onClick={toggleBgMode}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/60 bg-card hover:bg-muted text-sm font-semibold shadow-sm transition-all cursor-pointer font-sans"
            title="Toggle Whiteboard / Blackboard Mode"
          >
            <Monitor className="h-4 w-4 text-indigo-500" />
            <span>Style: {bgMode === 'whiteboard' ? 'Whiteboard' : 'Blackboard'}</span>
          </button>

          {/* New board button */}
          <button
            onClick={createNewBoard}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 text-sm font-bold shadow-lg shadow-primary/15 transition-all cursor-pointer font-sans"
          >
            <Plus className="h-4 w-4" />
            <span>New Sketch</span>
          </button>

          {/* Export button */}
          <button
            onClick={exportAsPng}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/60 bg-card hover:bg-muted text-sm font-semibold shadow-sm transition-all cursor-pointer font-sans"
            title="Export Board as PNG"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export PNG</span>
          </button>
        </div>
      </div>

      {/* Main Dual Column Studio Area */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        
        {/* Left Side: Saved Sketches Drawer/Sidebar */}
        <AnimatePresence initial={false}>
          {isSidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="w-full lg:w-[280px] shrink-0 glass rounded-3xl p-5 border border-border/60 flex flex-col space-y-4 self-stretch bg-card/40 backdrop-blur-md"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-muted-foreground font-sans">My Canvas List</h3>
                <span className="text-xs font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-lg font-sans">
                  {boards.length}
                </span>
              </div>

              {/* List of Boards */}
              <div className="flex-1 overflow-y-auto space-y-2 max-h-[300px] lg:max-h-[500px] pr-1">
                {boards.map((b) => {
                  const isActive = b.id === currentBoardId;
                  const isEditing = b.id === editingBoardId;

                  return (
                    <div
                      key={b.id}
                      onClick={() => !isEditing && switchBoard(b.id)}
                      className={cn(
                        "group w-full text-left p-3.5 rounded-2xl flex items-center justify-between border cursor-pointer transition-all",
                        isActive 
                          ? "bg-primary/10 border-primary/20 text-primary" 
                          : "border-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <FileText className={cn("h-4.5 w-4.5 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                        
                        {isEditing ? (
                          <input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveRename(b.id);
                              if (e.key === 'Escape') setEditingBoardId(null);
                            }}
                            autoFocus
                            onClick={(e) => e.stopPropagation()} // prevent select click
                            className="bg-background border border-border rounded px-1.5 py-0.5 text-xs text-foreground outline-none w-full"
                          />
                        ) : (
                          <span className="text-sm font-bold truncate font-sans">{b.name}</span>
                        )}
                      </div>

                      {/* Board Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity ml-2 shrink-0">
                        {isEditing ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              saveRename(b.id);
                            }}
                            className="p-1 rounded-lg hover:bg-emerald-500/10 text-emerald-500 cursor-pointer"
                            title="Save"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => startRename(b.id, b.name, e)}
                            className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Rename board"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        )}

                        <button
                          onClick={(e) => deleteBoard(b.id, e)}
                          className="p-1 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 cursor-pointer"
                          title="Delete board"
                          disabled={boards.length <= 1}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Pro Study Tip */}
              <div className="p-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-xs text-indigo-500 flex items-start gap-2.5">
                <HelpCircle className="h-4.5 w-4.5 shrink-0 text-indigo-500 mt-0.5" />
                <div className="font-sans">
                  <p className="font-bold">Text Mode UX Tip</p>
                  <p className="mt-1 text-muted-foreground leading-relaxed">
                    Select <span className="font-bold">Text Mode</span> in the bottom toolbar, then click anywhere on the canvas to start writing instantly!
                  </p>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Right Side: Canvas Draw Studio Workspace */}
        <div className="flex-1 w-full flex flex-col items-stretch space-y-4">
          
          {/* Main Board Container */}
          <div className="relative w-full">
            
            {/* Sidebar toggle tab */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="absolute -left-3 top-5 z-20 h-7 w-7 rounded-full border border-border/80 bg-background hover:bg-muted flex items-center justify-center shadow-sm cursor-pointer"
              title={isSidebarOpen ? "Hide Sketches Panel" : "Show Sketches Panel"}
            >
              {isSidebarOpen ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>

            {/* Canvas Outer Card */}
            <div
              ref={containerRef}
              className={cn(
                "relative w-full h-[580px] md:h-[680px] rounded-[2.2rem] border overflow-hidden shadow-2xl transition-all duration-300",
                bgMode === 'whiteboard' 
                  ? "bg-white border-slate-200/80 shadow-slate-900/5 text-slate-900" 
                  : "bg-[#0b0f19] border-neutral-800 shadow-black/60 text-slate-100"
              )}
            >
              {/* This inner div is our scrollable viewport wrapper */}
              <div
                ref={scrollContainerRef}
                className="absolute inset-0 overflow-auto scroll-smooth"
                style={{
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                {/* Scroll boundaries adjusted wrapper */}
                <div
                  style={{
                    width: `${3200 * zoom}px`,
                    height: `${3200 * zoom}px`,
                    position: 'relative'
                  }}
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      width: '3200px',
                      height: '3200px',
                      backgroundImage: bgMode === 'whiteboard'
                        ? 'radial-gradient(rgba(15, 23, 42, 0.08) 1.5px, transparent 1.5px)'
                        : 'radial-gradient(rgba(99, 102, 241, 0.15) 1.5px, transparent 1.5px)',
                      backgroundSize: '24px 24px',
                      transform: `scale(${zoom})`,
                      transformOrigin: '0 0'
                    }}
                  >
                    {/* Drawing layer */}
                    <canvas
                      ref={canvasRef}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className={cn(
                        "absolute inset-0 z-10 touch-none",
                        tool === 'pan' 
                          ? isPanning ? "cursor-grabbing" : "cursor-grab" 
                          : tool === 'text' ? "cursor-text" : "cursor-crosshair"
                      )}
                    />

                    {/* Persistent absolute positioned textarea for mobile/desktop click-to-type */}
                    <textarea
                      ref={textareaRef}
                      placeholder="Type note..."
                      rows={1}
                      className={cn(
                        "absolute z-20 bg-transparent border border-dashed border-primary/60 outline-none rounded p-1 shadow-sm overflow-hidden resize-none font-bold font-sans transition-opacity duration-150",
                        typingState ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                      )}
                      style={{
                        left: typingState ? `${typingState.x}px` : '-9999px',
                        top: typingState ? `${typingState.y}px` : '-9999px',
                        color: strokeColor,
                        fontSize: strokeSize === 2 ? '16px' : strokeSize === 5 ? '24px' : strokeSize === 10 ? '36px' : '48px',
                        lineHeight: '1.2',
                        minWidth: '180px',
                        maxWidth: '350px',
                      }}
                      onBlur={() => commitText()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          textareaRef.current?.blur(); // Triggers onBlur logic
                        }
                        if (e.key === 'Escape') {
                          if (textareaRef.current) {
                            textareaRef.current.value = "";
                          }
                          setTypingState(null); // Cancel typing
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Active Board HUD Indicator */}
              <div className="absolute top-6 left-6 z-25 flex items-center gap-3 pointer-events-none select-none">
                <div className={cn(
                  "px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider backdrop-blur-xl border shadow-sm font-sans",
                  bgMode === 'whiteboard' 
                    ? "bg-white/80 border-slate-100 text-slate-800" 
                    : "bg-black/40 border-neutral-800 text-slate-300"
                )}>
                  {boards.find(b => b.id === currentBoardId)?.name || "Sketch Studio"}
                </div>
              </div>

              {/* Premium Zoom Control Widget */}
              <div className={cn(
                "absolute top-6 right-6 z-25 flex items-center gap-1 backdrop-blur-xl border p-1 rounded-2xl shadow-sm font-sans",
                bgMode === 'whiteboard'
                  ? "bg-white/80 border-slate-100 text-slate-800"
                  : "bg-black/40 border-neutral-800 text-slate-300"
              )}>
                <button
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                  className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer transition-all"
                  title="Zoom Out (Ctrl -)"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                
                <button
                  onClick={handleZoomReset}
                  className="px-2.5 h-8 rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-wider hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-all font-sans"
                  title="Reset Zoom to 100% (Ctrl 0)"
                >
                  {Math.round(zoom * 100)}%
                </button>

                <button
                  onClick={handleZoomIn}
                  disabled={zoom >= 2.0}
                  className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer transition-all"
                  title="Zoom In (Ctrl +)"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>

              {/* Floating control toolbar (collapsible & responsive) */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-[95%] max-w-[820px] flex items-center justify-center px-4">
                <div className={cn(
                  "w-full glass rounded-3xl py-3 px-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xl backdrop-blur-2xl border",
                  bgMode === 'whiteboard'
                    ? "bg-white/90 border-slate-200/60 shadow-slate-900/10 text-slate-900"
                    : "bg-[#0b0f19]/90 border-neutral-800/80 shadow-black/88 text-white"
                )}>
                  {/* Tool selectors (Pen, Eraser, Hand Pan, Text Mode) */}
                  <div className="flex items-center gap-1 shrink-0 bg-muted/20 p-1.5 rounded-2xl">
                    <button
                      onClick={() => setTool('pen')}
                      className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center transition-all cursor-pointer",
                        tool === 'pen'
                          ? "bg-primary text-primary-foreground shadow-md font-bold scale-105"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                      title="Pen tool"
                    >
                      <PenTool className="h-4.5 w-4.5" />
                    </button>
                    
                    <button
                      onClick={() => setTool('eraser')}
                      className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center transition-all cursor-pointer",
                        tool === 'eraser'
                          ? "bg-primary text-primary-foreground shadow-md font-bold scale-105"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                      title="Eraser tool"
                    >
                      <Eraser className="h-4.5 w-4.5" />
                    </button>

                    <button
                      onClick={() => setTool('pan')}
                      className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center transition-all cursor-pointer",
                        tool === 'pan'
                          ? "bg-primary text-primary-foreground shadow-md font-bold scale-105"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                      title="Pan / Grab-Scroll tool (Spacebar)"
                    >
                      <Hand className="h-4.5 w-4.5" />
                    </button>

                    <button
                      onClick={() => setTool('text')}
                      className={cn(
                        "h-10 px-3.5 rounded-xl flex items-center gap-1.5 transition-all text-xs font-black uppercase tracking-wider cursor-pointer font-sans",
                        tool === 'text'
                          ? "bg-indigo-500 text-white shadow-md scale-105"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                      title="Text mode (click anywhere to type instantly)"
                    >
                      <Type className="h-4.5 w-4.5" />
                      <span>Text Mode</span>
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="hidden md:block w-px h-8 bg-border" />

                  {/* Stroke Color Palette (only show if not erase tool) */}
                  <div className="flex items-center gap-1.5">
                    {tool !== 'eraser' ? (
                      colors.map((color) => (
                        <button
                          key={color.hex}
                          onClick={() => setStrokeColor(color.hex)}
                          className={cn(
                            "h-6.5 w-6.5 rounded-full border-2 transition-all hover:scale-115 relative flex items-center justify-center shadow-sm cursor-pointer",
                            strokeColor === color.hex 
                              ? "scale-110 shadow-primary/30" 
                              : "border-transparent"
                          )}
                          style={{ 
                            backgroundColor: color.hex,
                            borderColor: strokeColor === color.hex ? (bgMode === 'whiteboard' ? '#0f172a' : '#ffffff') : 'transparent'
                          }}
                          title={color.name}
                        >
                          {strokeColor === color.hex && (
                            <span 
                              className="h-1.5 w-1.5 rounded-full" 
                              style={{ 
                                backgroundColor: bgMode === 'whiteboard' && color.hex === '#0f172a' ? '#ffffff' : '#0f172a' 
                              }} 
                            />
                          )}
                        </button>
                      ))
                    ) : (
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider py-1.5 px-3 bg-muted/40 rounded-xl font-sans">
                        Eraser Active
                      </span>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="hidden md:block w-px h-8 bg-border" />

                  {/* Brush stroke sizes */}
                  <div className="flex items-center gap-1 bg-muted/20 p-1 rounded-2xl shrink-0">
                    {[
                      { size: 2, label: 'Thin' },
                      { size: 5, label: 'Medium' },
                      { size: 10, label: 'Thick' },
                      { size: 18, label: 'Huge' }
                    ].map((s) => (
                      <button
                        key={s.size}
                        onClick={() => setStrokeSize(s.size)}
                        className={cn(
                          "h-8 px-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer font-sans",
                          strokeSize === s.size
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        title={`${s.label} Brush`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  {/* Divider */}
                  <div className="hidden md:block w-px h-8 bg-border" />

                  {/* Undo, Redo, Clear */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={handleUndo}
                      disabled={actions.length === 0}
                      className="h-9 w-9 rounded-xl flex items-center justify-center transition-all text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                      title="Undo Action"
                    >
                      <Undo2 className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={handleRedo}
                      disabled={redoStack.length === 0}
                      className="h-9 w-9 rounded-xl flex items-center justify-center transition-all text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                      title="Redo Action"
                    >
                      <Redo2 className="h-4 w-4" />
                    </button>

                    <button
                      onClick={clearBoard}
                      disabled={actions.length === 0}
                      className="h-9 w-9 rounded-xl flex items-center justify-center transition-all text-muted-foreground hover:text-red-500 hover:bg-red-500/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground cursor-pointer"
                      title="Clear Board Canvas"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Quick Shortcuts Footer */}
          <div className="flex flex-col md:flex-row items-center justify-between text-xs text-muted-foreground bg-card/10 backdrop-blur-sm border border-border/40 rounded-2xl p-4 gap-3">
            <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start font-sans">
              <span className="font-bold flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Offline Persistent Saving Enabled
              </span>
              <span className="hidden sm:inline text-border">|</span>
              <span>All sketches automatically autosaved locally.</span>
            </div>
            <div className="flex items-center gap-2 font-sans">
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">Ctrl+Z</kbd>
              <span>Undo</span>
              <kbd className="ml-1 px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">Ctrl+Y</kbd>
              <span>Redo</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
