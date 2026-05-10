import { useReducer, useRef, useCallback, useEffect, useState } from "react";
import { reducer, initialState, StoreContext } from "./store/useStore";
import { ASPECT_RATIOS } from "./types";
import type { CanvasVariant, Template, AssetItem, ExportQueueItem } from "./types";
import CanvasPanel, { type CanvasPanelRef } from "./components/CanvasPanel";
import EditingToolbar from "./components/EditingToolbar";
import AITab from "./components/AITab";
import AssetsTab from "./components/AssetsTab";
import TemplatesTab from "./components/TemplatesTab";
import SettingsPanel from "./components/SettingsPanel";
import SEOPanel from "./components/SEOPanel";
import BulkExportDrawer from "./components/BulkExportDrawer";
import { saveTemplate, getQueueItems, saveQueueItem } from "./lib/db";
import { Layers, Settings, Package, Download, FlipHorizontal2, Cpu, FolderOpen } from "lucide-react";

const TABS = [
  { id: "ai", label: "AI Studio", icon: <Cpu size={14} /> },
  { id: "assets", label: "Assets", icon: <FolderOpen size={14} /> },
  { id: "templates", label: "Templates", icon: <Layers size={14} /> },
] as const;

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportDrawerOpen, setExportDrawerOpen] = useState(false);
  const [activeEditVariant, setActiveEditVariant] = useState<CanvasVariant>("A");

  const canvasARef = useRef<CanvasPanelRef>(null);
  const canvasBRef = useRef<CanvasPanelRef>(null);

  const getActiveRef = (v: CanvasVariant = activeEditVariant) => v === "A" ? canvasARef : canvasBRef;

  // Load export queue from DB on start
  useEffect(() => {
    getQueueItems().then(items => dispatch({ type: "SET_EXPORT_QUEUE", items }));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); getActiveRef().current?.undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); getActiveRef().current?.redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSaveTemplate(null); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeEditVariant]);

  const handleImagesGenerated = useCallback((imgA: string, promptA: string, imgB: string | null, promptB: string | null) => {
    dispatch({ type: "SET_CANVAS_IMAGE", variant: "A", imageUrl: imgA, prompt: promptA });
    if (imgB) dispatch({ type: "SET_CANVAS_IMAGE", variant: "B", imageUrl: imgB, prompt: promptB || "" });
    // Auto-SEO slug
    if (state.scriptText) {
      const slug = state.scriptText.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "").split(" ").slice(0, 6).join("-");
      dispatch({ type: "UPDATE_CANVAS_SEO", variant: "A", seo: { filenameSlug: `${slug}-a`, videoTitle: state.scriptText.split("\n")[0].slice(0, 100) } });
      if (imgB) dispatch({ type: "UPDATE_CANVAS_SEO", variant: "B", seo: { filenameSlug: `${slug}-b`, videoTitle: state.scriptText.split("\n")[0].slice(0, 100) } });
    }
  }, [state.scriptText]);

  const handleSaveTemplate = useCallback(async (folderId: string | null, name?: string) => {
    const ref = getActiveRef(activeEditVariant);
    if (!ref.current) return;
    const canvas = activeEditVariant === "A" ? state.canvasA : state.canvasB;
    const json = ref.current.getJSON();
    const thumbnailBase64 = await ref.current.getDataURL(240, 135).catch(() => "");
    const template: Template = {
      id: `tmpl_${Date.now()}`,
      name: name || `Template ${new Date().toLocaleString()}`,
      folderId,
      fabricJson: json,
      backgroundBase64: canvas.backgroundImage || null,
      thumbnailBase64,
      prompt: canvas.prompt,
      aspectRatio: state.aspectRatio,
      seoData: canvas.seoData,
      createdAt: new Date(),
    };
    await saveTemplate(template);
  }, [activeEditVariant, state.canvasA, state.canvasB, state.aspectRatio]);

  const handleLoadTemplate = useCallback((template: Template) => {
    const ref = getActiveRef(activeEditVariant);
    if (!ref.current) return;
    if (template.backgroundBase64) {
      dispatch({ type: "SET_CANVAS_IMAGE", variant: activeEditVariant, imageUrl: template.backgroundBase64, prompt: template.prompt });
    }
    ref.current.loadJSON(template.fabricJson);
    dispatch({ type: "UPDATE_CANVAS_SEO", variant: activeEditVariant, seo: template.seoData });
  }, [activeEditVariant]);

  const handleUseAsset = useCallback((asset: AssetItem) => {
    const ref = getActiveRef(activeEditVariant);
    ref.current?.addImage(asset.base64, asset.role);
  }, [activeEditVariant]);

  const handleDownload = useCallback(async (variant: CanvasVariant) => {
    const ref = variant === "A" ? canvasARef : canvasBRef;
    if (!ref.current) return;
    const canvas = variant === "A" ? state.canvasA : state.canvasB;
    const { width, height } = ASPECT_RATIOS[state.aspectRatio];
    try {
      const dataUrl = await ref.current.getDataURL(width, height);
      const slug = canvas.seoData.filenameSlug || `thumbnail-variant-${variant.toLowerCase()}`;
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${slug}.png`;
      a.click();
    } catch (e) {
      alert("Download failed. Make sure an image is loaded on the canvas.");
    }
  }, [state.canvasA, state.canvasB, state.aspectRatio]);

  const handleAddToQueue = useCallback(async (variant: CanvasVariant) => {
    const ref = variant === "A" ? canvasARef : canvasBRef;
    if (!ref.current) return;
    const canvas = variant === "A" ? state.canvasA : state.canvasB;
    const { width, height } = ASPECT_RATIOS[state.aspectRatio];
    try {
      const imageBase64 = await ref.current.getDataURL(width, height);
      const slug = canvas.seoData.filenameSlug || `thumbnail-variant-${variant.toLowerCase()}`;
      const item: ExportQueueItem = {
        id: `queue_${Date.now()}`,
        variant,
        imageBase64,
        filename: `${slug}.png`,
        addedAt: new Date(),
      };
      await saveQueueItem(item);
      dispatch({ type: "ADD_TO_QUEUE", item });
      setExportDrawerOpen(true);
    } catch (e) {
      alert("Failed to add to queue. Make sure an image is loaded.");
    }
  }, [state.canvasA, state.canvasB, state.aspectRatio]);

  const handleFlattenDownloadBoth = useCallback(async () => {
    const variants: CanvasVariant[] = state.showVariantB ? ["A", "B"] : ["A"];
    for (const v of variants) {
      await handleDownload(v);
      await new Promise(r => setTimeout(r, 300));
    }
  }, [handleDownload, state.showVariantB]);

  const { width: nW, height: nH } = ASPECT_RATIOS[state.aspectRatio];

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      <div className="flex flex-col h-screen overflow-hidden" style={{ background: "var(--bg-main)" }}>
        {/* Top Bar */}
        <header style={{
          background: "var(--bg-card)",
          borderBottom: "1px solid var(--border-color)",
          padding: "0 16px",
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          zIndex: 100,
        }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div style={{ width: 28, height: 28, background: "var(--gradient)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FlipHorizontal2 size={16} style={{ color: "#0a0e27" }} />
              </div>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em" }} className="gradient-text">
                THUMBLAB
              </span>
            </div>
            <span style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg-input)", padding: "2px 8px", borderRadius: 20, border: "1px solid var(--border-color)" }}>
              AI Thumbnail Studio
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-2"
              onClick={() => setExportDrawerOpen(true)}
            >
              <Package size={12} />
              Queue ({state.exportQueue.length})
            </button>
            <button
              className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-2"
              onClick={() => setSettingsOpen(!settingsOpen)}
            >
              <Settings size={12} />
              {settingsOpen ? "Close" : "Branding"}
            </button>
            <button
              className="btn-primary px-3 py-1.5 text-sm flex items-center gap-2"
              onClick={handleFlattenDownloadBoth}
              style={{ fontWeight: 700, letterSpacing: "0.02em" }}
            >
              <Download size={14} />
              Flatten & Download {state.showVariantB ? "Both PNGs" : "PNG"}
            </button>
          </div>
        </header>

        {/* Main layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar */}
          <aside style={{
            width: 300,
            background: "var(--bg-card)",
            borderRight: "1px solid var(--border-color)",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
            overflow: "hidden",
          }}>
            {/* Tabs */}
            <div style={{ display: "flex", padding: "8px 8px 0", gap: 4, borderBottom: "1px solid var(--border-color)", paddingBottom: 8 }}>
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  className={`tab-btn flex-1 flex items-center justify-center gap-1.5 ${state.sidebarTab === tab.id ? "active" : ""}`}
                  style={{ fontSize: 12 }}
                  onClick={() => dispatch({ type: "SET_TAB", tab: tab.id })}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden flex flex-col p-3">
              {state.sidebarTab === "ai" && !settingsOpen && (
                <AITab onImagesGenerated={handleImagesGenerated} />
              )}
              {state.sidebarTab === "assets" && !settingsOpen && (
                <AssetsTab onUseAsset={handleUseAsset} />
              )}
              {state.sidebarTab === "templates" && !settingsOpen && (
                <TemplatesTab
                  onLoadTemplate={handleLoadTemplate}
                  onSaveTemplate={(folderId) => handleSaveTemplate(folderId)}
                />
              )}
              {settingsOpen && <SettingsPanel />}
            </div>
          </aside>

          {/* Main Canvas Area */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden" style={{ background: "var(--bg-main)", padding: 16 }}>
            {/* Canvas Grid */}
            <div className={`grid gap-4 ${state.showVariantB ? "grid-cols-2" : "grid-cols-1"}`} style={{ maxWidth: state.showVariantB ? "none" : 800, margin: "0 auto" }}>
              {(["A", ...(state.showVariantB ? ["B"] : [])] as CanvasVariant[]).map(variant => {
                const isActive = activeEditVariant === variant;
                const canvas = variant === "A" ? state.canvasA : state.canvasB;
                const ref = variant === "A" ? canvasARef : canvasBRef;
                return (
                  <div key={variant} className="flex flex-col gap-2">
                    {/* Variant header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div style={{
                          width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14,
                          background: isActive ? "var(--gradient)" : "var(--bg-input)",
                          color: isActive ? "#0a0e27" : "var(--text-muted)",
                        }}>
                          {variant}
                        </div>
                        <span className="variant-label" style={{ color: isActive ? "var(--accent-cyan)" : "var(--text-muted)" }}>
                          Variant {variant}
                        </span>
                        {canvas.backgroundImage && (
                          <span style={{ fontSize: 9, color: "var(--accent-green)", background: "rgba(0,255,136,0.1)", padding: "1px 6px", borderRadius: 10, border: "1px solid rgba(0,255,136,0.3)" }}>
                            ● LIVE
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          className="btn-secondary px-2 py-1 text-xs"
                          style={{ fontSize: 10 }}
                          onClick={() => handleAddToQueue(variant)}
                        >
                          + Queue
                        </button>
                        <button
                          className="btn-primary px-2 py-1 text-xs flex items-center gap-1"
                          style={{ fontSize: 10 }}
                          onClick={() => handleDownload(variant)}
                        >
                          <Download size={10} /> Save PNG
                        </button>
                      </div>
                    </div>

                    {/* Canvas */}
                    <div style={{ position: "relative" }}>
                      <CanvasPanel
                        ref={ref}
                        variant={variant}
                        aspectRatio={state.aspectRatio}
                        isActive={isActive}
                        mobilePreview={state.mobilePreview}
                        youtubeOverlay={state.youtubeOverlay}
                        backgroundImage={canvas.backgroundImage}
                        onActivate={() => {
                          dispatch({ type: "SET_ACTIVE_VARIANT", variant });
                          setActiveEditVariant(variant);
                        }}
                        onJsonChange={(json) => dispatch({ type: "SET_CANVAS_JSON", variant, json })}
                        logoBase64={state.brandSettings.logoBase64}
                        autoBranding={state.brandSettings.autoBranding}
                        squintTest={state.squintTest}
                      />
                    </div>

                    {/* Prompt preview */}
                    {canvas.prompt && (
                      <details style={{ fontSize: 10, color: "var(--text-muted)" }}>
                        <summary style={{ cursor: "pointer", color: "var(--text-secondary)", fontSize: 11 }}>Generated Prompt</summary>
                        <p style={{ marginTop: 4, lineHeight: 1.5 }}>{canvas.prompt.slice(0, 200)}...</p>
                      </details>
                    )}

                    {/* Editing toolbar */}
                    {isActive && (
                      <EditingToolbar
                        variant={variant}
                        onAddText={(text, style) => ref.current?.addText(text, style)}
                        onAddArrow={() => ref.current?.addArrow()}
                        onAddCircle={() => ref.current?.addCircle()}
                        onDrawMode={(on) => ref.current?.setDrawingMode(on)}
                        onClearEdits={() => ref.current?.clearEdits()}
                        onUndo={() => ref.current?.undo()}
                        onRedo={() => ref.current?.redo()}
                        onDelete={() => ref.current?.deleteSelected()}
                      />
                    )}

                    {/* SEO Panel */}
                    <SEOPanel variant={variant} />
                  </div>
                );
              })}
            </div>

            {/* Bottom download bar */}
            <div style={{
              marginTop: 20, padding: 16,
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12
            }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14 }}>Flatten & Export</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  Exports at {nW}×{nH}px — optimized for YouTube upload (&lt;2MB)
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  className="btn-secondary px-4 py-2 text-sm flex items-center gap-2"
                  onClick={() => setExportDrawerOpen(true)}
                >
                  <Package size={14} /> Bulk Export ({state.exportQueue.length})
                </button>
                <button
                  className="btn-primary px-6 py-2.5 text-sm flex items-center gap-2"
                  style={{ fontWeight: 700 }}
                  onClick={handleFlattenDownloadBoth}
                >
                  <Download size={16} />
                  Flatten & Download {state.showVariantB ? "Both PNGs" : "PNG"}
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Bulk Export Drawer */}
      <BulkExportDrawer isOpen={exportDrawerOpen} onClose={() => setExportDrawerOpen(false)} />

      {/* Squint test overlay */}
      {state.squintTest && (
        <div className="squint-overlay" onClick={() => dispatch({ type: "TOGGLE_SQUINT" })}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>Click to exit Squint Test mode</p>
            <div style={{ display: "flex", gap: 20, justifyContent: "center" }}>
              {(["A", ...(state.showVariantB ? ["B"] : [])] as CanvasVariant[]).map(v => {
                const canvas = v === "A" ? state.canvasA : state.canvasB;
                return canvas.backgroundImage ? (
                  <div key={v} style={{ textAlign: "center" }}>
                    <p style={{ fontSize: 10, color: "var(--accent-cyan)", marginBottom: 6 }}>Variant {v}</p>
                    <img
                      src={canvas.backgroundImage}
                      alt={`Variant ${v}`}
                      style={{
                        width: 80,
                        height: state.aspectRatio === "16:9" ? 45 : 45 * (9/16) * (16/9) * (16/9),
                        objectFit: "cover",
                        borderRadius: 4,
                        filter: "blur(1.5px)",
                        border: "1px solid var(--border-color)",
                      }}
                    />
                  </div>
                ) : null;
              })}
            </div>
          </div>
        </div>
      )}
    </StoreContext.Provider>
  );
}
