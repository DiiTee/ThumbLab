import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, RotateCcw, Check } from "lucide-react";
import { useStore } from "../store/useStore";
import { DEFAULT_NEXLEV_TEMPLATE } from "../types";

export default function NexLevHelper({ scriptText }: { scriptText: string }) {
  const { state, dispatch } = useStore();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const filled = state.nexlevTemplate.replace(/\{\{TOPIC\}\}/g, scriptText || "YOUR TOPIC");
    navigator.clipboard.writeText(filled);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    if (confirm("Reset to default NexLev template?")) {
      dispatch({ type: "SET_NEXLEV_TEMPLATE", template: DEFAULT_NEXLEV_TEMPLATE });
    }
  };

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left"
        style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        Prompt Template (NexLev MCP)
      </button>

      <div className={`collapsible-content ${open ? "open" : ""}`}>
        <div className="mt-2 relative">
          <textarea
            className="nexlev-textarea w-full text-xs p-3 resize-none"
            style={{
              background: "#1a1f3a",
              border: "1px solid var(--border-color)",
              color: "var(--text-secondary)",
              borderRadius: 8,
              fontFamily: "monospace",
              lineHeight: 1.5,
              height: 140,
            }}
            value={state.nexlevTemplate}
            onChange={e => dispatch({ type: "SET_NEXLEV_TEMPLATE", template: e.target.value })}
            placeholder="NexLev prompt template..."
          />
          <div className="flex gap-2 mt-1">
            <button className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1 flex-1" onClick={handleCopy}>
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied!" : "Copy (with topic injected)"}
            </button>
            <button className="btn-secondary px-2 py-1.5 text-xs flex items-center gap-1 tooltip" data-tip="Reset to default" onClick={handleReset}>
              <RotateCcw size={12} />
            </button>
          </div>
          {scriptText && (
            <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
              {"{{TOPIC}}"} will be replaced with:{" "}
              <span style={{ color: "var(--accent-cyan)" }}>
                {scriptText.slice(0, 40)}{scriptText.length > 40 ? "..." : ""}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
