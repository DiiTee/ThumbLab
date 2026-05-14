import { useState } from "react";
import { Pen, Type, CircleIcon, Trash2, RotateCcw, RotateCw, Minus } from "lucide-react";

interface Props {
  onAddText: (text: string, style: "youtube" | "default", color: string) => void;
  onAddArrow: (color: string) => void;
  onAddCircle: (color: string) => void;
  onDrawMode: (on: boolean, color: string, width: number) => void;
  onClearEdits: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  variant: "A" | "B";
}

export default function EditingToolbar({
  onAddText, onAddArrow, onAddCircle, onDrawMode,
  onClearEdits, onUndo, onRedo, onDelete, variant,
}: Props) {
  const [textInput, setTextInput] = useState("YOUR TEXT HERE");
  const [textColor, setTextColor] = useState("#FFFF00");
  const [arrowColor, setArrowColor] = useState("#ff0000");
  const [circleColor, setCircleColor] = useState("#00d4ff");
  const [drawColor, setDrawColor] = useState("#ff0000");
  const [drawWidth, setDrawWidth] = useState(3);
  const [drawMode, setDrawMode] = useState(false);

  const toggleDraw = () => {
    const next = !drawMode;
    setDrawMode(next);
    onDrawMode(next, drawColor, drawWidth);
  };

  const colorSwatch = (value: string, onChange: (v: string) => void) => (
    <input
      type="color"
      value={value}
      onChange={e => onChange(e.target.value)}
      title="Pick color"
      style={{ width: 24, height: 24, padding: 1, borderRadius: 4, cursor: "pointer", background: "var(--bg-input)", border: "1px solid var(--border-color)", flexShrink: 0 }}
    />
  );

  return (
    <div className="card p-3 mt-2">
      <div className="flex items-center justify-between mb-2">
        <span className="section-label">Edit Canvas — Variant {variant}</span>
        <div className="flex gap-1">
          <button className="btn-secondary px-2 py-1 text-xs flex items-center gap-1" title="Undo (Ctrl+Z)" onClick={onUndo}>
            <RotateCcw size={12} />
          </button>
          <button className="btn-secondary px-2 py-1 text-xs flex items-center gap-1" title="Redo (Ctrl+Y)" onClick={onRedo}>
            <RotateCw size={12} />
          </button>
          <button className="btn-danger px-2 py-1 text-xs flex items-center gap-1" title="Delete selected" onClick={onDelete}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {/* Text row */}
        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex flex-col gap-1">
            <label style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Text</label>
            <div className="flex gap-1 items-center">
              <input
                type="text"
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                className="px-2 py-1 text-xs"
                style={{ width: 130, fontSize: 12 }}
                placeholder="Enter text..."
              />
              {colorSwatch(textColor, setTextColor)}
            </div>
          </div>
          <button className="btn-secondary px-2 py-1.5 text-xs flex items-center gap-1" onClick={() => onAddText(textInput, "youtube", textColor)}>
            <Type size={11} /> YouTube Style
          </button>
          <button className="btn-secondary px-2 py-1.5 text-xs flex items-center gap-1" onClick={() => onAddText(textInput, "default", textColor)}>
            <Type size={11} /> Add Text
          </button>
        </div>

        {/* Arrow + Circle row */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            {colorSwatch(arrowColor, setArrowColor)}
            <button className="btn-secondary px-2 py-1.5 text-xs flex items-center gap-1" onClick={() => onAddArrow(arrowColor)}>
              <Minus size={11} style={{ transform: "rotate(-30deg)" }} /> Arrow
            </button>
          </div>
          <div className="flex items-center gap-1">
            {colorSwatch(circleColor, setCircleColor)}
            <button className="btn-secondary px-2 py-1.5 text-xs flex items-center gap-1" onClick={() => onAddCircle(circleColor)}>
              <CircleIcon size={11} /> Circle
            </button>
          </div>
          <div className="flex items-center gap-1">
            {colorSwatch(drawColor, (c) => {
              setDrawColor(c);
              if (drawMode) onDrawMode(true, c, drawWidth);
            })}
            <button
              className={`px-2 py-1.5 text-xs flex items-center gap-1 ${drawMode ? "btn-primary" : "btn-secondary"}`}
              onClick={toggleDraw}
            >
              <Pen size={11} /> {drawMode ? "Exit Draw" : "Draw"}
            </button>
          </div>
          <button className="btn-danger px-2 py-1.5 text-xs" onClick={() => { if (confirm("Clear all canvas edits?")) onClearEdits(); }}>
            Clear All
          </button>
        </div>

        {/* Draw width (shown when drawing) */}
        {drawMode && (
          <div className="flex items-center gap-2" style={{ fontSize: 11, color: "var(--text-muted)" }}>
            <span>Brush size:</span>
            <input
              type="range"
              min={1} max={20} value={drawWidth}
              onChange={e => { const w = Number(e.target.value); setDrawWidth(w); onDrawMode(true, drawColor, w); }}
              style={{ width: 80 }}
            />
            <span>{drawWidth}px</span>
          </div>
        )}

        <p style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>
          ✦ Arrow &amp; shapes are rotatable — drag the rotation handle above the selected object
        </p>
      </div>
    </div>
  );
}
