import { useState } from "react";
import { Package, Trash2, Download, X } from "lucide-react";
import JSZip from "jszip";
import type { ExportQueueItem } from "../types";
import { useStore } from "../store/useStore";
import { removeQueueItem, clearQueue } from "../lib/db";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function BulkExportDrawer({ isOpen, onClose }: Props) {
  const { state, dispatch } = useStore();
  const [exporting, setExporting] = useState(false);

  const handleRemove = async (id: string) => {
    await removeQueueItem(id);
    dispatch({ type: "REMOVE_FROM_QUEUE", id });
  };

  const handleClear = async () => {
    if (!confirm("Clear the export queue?")) return;
    await clearQueue();
    dispatch({ type: "CLEAR_QUEUE" });
  };

  const handleBulkExport = async () => {
    if (state.exportQueue.length === 0) return;
    setExporting(true);
    try {
      const zip = new JSZip();
      const date = new Date().toISOString().split("T")[0];
      state.exportQueue.forEach((item, i) => {
        const base64 = item.imageBase64.replace(/^data:image\/\w+;base64,/, "");
        zip.file(item.filename || `thumbnail_${item.variant}_${i + 1}.png`, base64, { base64: true });
      });
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Thumbnails_${date}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed", right: 0, top: 0, bottom: 0, width: 320,
      background: "var(--bg-card)",
      borderLeft: "1px solid var(--border-color)",
      zIndex: 200, display: "flex", flexDirection: "column",
      boxShadow: "-8px 0 32px rgba(0,0,0,0.5)",
    }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4" style={{ borderBottom: "1px solid var(--border-color)" }}>
        <div className="flex items-center gap-2">
          <Package size={16} style={{ color: "var(--accent-cyan)" }} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>Export Queue</span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>({state.exportQueue.length})</span>
        </div>
        <button onClick={onClose} className="btn-secondary p-1.5"><X size={14} /></button>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {state.exportQueue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full" style={{ color: "var(--text-muted)" }}>
            <Package size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p style={{ fontSize: 13 }}>Queue is empty</p>
            <p style={{ fontSize: 11, opacity: 0.7 }}>Add thumbnails from the canvas</p>
          </div>
        ) : (
          state.exportQueue.map(item => (
            <div key={item.id} className="card p-2 flex gap-2 items-start">
              <img src={item.imageBase64} alt="" style={{ width: 72, height: 40, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 11, color: "var(--text-primary)", fontWeight: 600 }}>Variant {item.variant}</p>
                <p style={{ fontSize: 10, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.filename}</p>
              </div>
              <button className="btn-danger p-1 flex-shrink-0" onClick={() => handleRemove(item.id)}>
                <Trash2 size={11} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer actions */}
      <div className="p-4" style={{ borderTop: "1px solid var(--border-color)" }}>
        {state.exportQueue.length > 0 && (
          <>
            <button
              className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2 mb-2"
              onClick={handleBulkExport}
              disabled={exporting}
            >
              {exporting ? <><span className="spinner" /> Compressing...</> : <><Download size={14} /> Bulk Download (.ZIP)</>}
            </button>
            <button className="btn-danger w-full py-2 text-xs" onClick={handleClear}>
              Clear Queue
            </button>
          </>
        )}
      </div>
    </div>
  );
}
