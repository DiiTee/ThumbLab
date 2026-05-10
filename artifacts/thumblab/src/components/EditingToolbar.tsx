import { useState } from "react";
import { Pen, Type, CircleIcon, Trash2, RotateCcw, RotateCw, Minus } from "lucide-react";

interface Props {
  onAddText: (text: string, style: "youtube" | "default") => void;
  onAddArrow: () => void;
  onAddCircle: () => void;
  onDrawMode: (on: boolean) => void;
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
  const [drawMode, setDrawMode] = useState(false);

  const toggleDraw = () => {
    const next = !drawMode;
    setDrawMode(next);
    onDrawMode(next);
  };

  return (
    <div className="card p-3 mt-2">
      <div className="flex items-center justify-between mb-2">
        <span className="section-label">Edit Canvas — Variant {variant}</span>
        <div className="flex gap-1">
          <button className="btn-secondary px-2 py-1 text-xs flex items-center gap-1 tooltip" data-tip="Undo (Ctrl+Z)" onClick={onUndo}>
            <RotateCcw size={12} />
          </button>
          <button className="btn-secondary px-2 py-1 text-xs flex items-center gap-1 tooltip" data-tip="Redo (Ctrl+Y)" onClick={onRedo}>
            <RotateCw size={12} />
          </button>
          <button className="btn-danger px-2 py-1 text-xs flex items-center gap-1 tooltip" data-tip="Delete selected" onClick={onDelete}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        {/* Text */}
        <div className="flex flex-col gap-1">
          <label style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Text</label>
          <div className="flex gap-1">
            <input
              type="text"
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              className="px-2 py-1 text-xs"
              style={{ width: 140, fontSize: 12 }}
              placeholder="Enter text..."
            />
            <input
              type="color"
              value={textColor}
              onChange={e => setTextColor(e.target.value)}
              style={{ width: 28, height: 28, padding: 1, borderRadius: 6, cursor: "pointer", background: "var(--bg-input)", border: "1px solid var(--border-color)" }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-1 flex-wrap">
          <button
            className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1"
            onClick={() => onAddText(textInput, "youtube")}
          >
            <Type size={12} />
            YouTube Style
          </button>
          <button
            className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1"
            onClick={() => onAddText(textInput, "default")}
          >
            <Type size={12} />
            Add Text
          </button>
          <button
            className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1"
            onClick={onAddArrow}
          >
            <Minus size={12} style={{ transform: "rotate(-30deg)" }} />
            Red Arrow
          </button>
          <button
            className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1"
            onClick={onAddCircle}
          >
            <CircleIcon size={12} />
            Circle
          </button>
          <button
            className={`px-3 py-1.5 text-xs flex items-center gap-1 ${drawMode ? "btn-primary" : "btn-secondary"}`}
            onClick={toggleDraw}
          >
            <Pen size={12} />
            {drawMode ? "Exit Draw" : "Draw"}
          </button>
          <button
            className="btn-danger px-3 py-1.5 text-xs"
            onClick={() => { if (confirm("Clear all edits from canvas?")) onClearEdits(); }}
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
}
