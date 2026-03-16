"use client";

import { useRef, useState, useEffect } from "react";
import { Trash2, Pen } from "lucide-react";

const COLORS = ["#6366f1", "#ef4444", "#22c55e", "#f59e0b", "#06b6d4", "#000000"];

export function WidgetWhiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(2);
  const lastRef = useRef<{ x: number; y: number } | null>(null);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d")!;
    const pos = getPos(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    if (lastRef.current) {
      ctx.moveTo(lastRef.current.x, lastRef.current.y);
    } else {
      ctx.moveTo(pos.x, pos.y);
    }
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastRef.current = pos;
  };

  const clear = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d")!;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      const ctx = canvas.getContext("2d")!;
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      ctx.putImageData(img, 0, 0);
    });
    observer.observe(canvas.parentElement!);
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <Pen className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Whiteboard</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)}
                className={`w-4 h-4 rounded-full transition-transform ${color === c ? "scale-125 ring-2 ring-offset-1 ring-primary" : ""}`}
                style={{ background: c }} />
            ))}
          </div>
          <select value={size} onChange={(e) => setSize(Number(e.target.value))}
            className="text-[10px] bg-muted rounded px-1 py-0.5 text-muted-foreground">
            <option value={1}>1px</option>
            <option value={2}>2px</option>
            <option value={4}>4px</option>
            <option value={8}>8px</option>
          </select>
          <button onClick={clear} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="flex-1 rounded-xl bg-muted/20 border border-border/50 cursor-crosshair"
        onMouseDown={(e) => { setDrawing(true); lastRef.current = getPos(e); }}
        onMouseMove={draw}
        onMouseUp={() => { setDrawing(false); lastRef.current = null; }}
        onMouseLeave={() => { setDrawing(false); lastRef.current = null; }}
      />
    </div>
  );
}
