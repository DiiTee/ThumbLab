import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { fabric } from "fabric";
import type { CanvasVariant, AspectRatio } from "../types";
import { ASPECT_RATIOS } from "../types";

export interface CanvasPanelRef {
  addText: (text?: string, style?: "youtube" | "default") => void;
  addArrow: () => void;
  addCircle: () => void;
  setDrawingMode: (enabled: boolean) => void;
  clearEdits: () => void;
  undo: () => void;
  redo: () => void;
  deleteSelected: () => void;
  getJSON: () => object;
  loadJSON: (json: object) => void;
  setBackground: (imageUrl: string, onDone?: () => void) => void;
  getDataURL: (width: number, height: number) => Promise<string>;
  getCanvas: () => fabric.Canvas | null;
  addImage: (imageUrl: string, role?: string) => void;
}

interface Props {
  variant: CanvasVariant;
  aspectRatio: AspectRatio;
  isActive: boolean;
  mobilePreview: boolean;
  youtubeOverlay: boolean;
  backgroundImage: string | null;
  onActivate: () => void;
  onJsonChange: (json: object) => void;
  logoBase64?: string | null;
  autoBranding?: boolean;
  squintTest?: boolean;
}

const HISTORY_LIMIT = 50;

const CanvasPanel = forwardRef<CanvasPanelRef, Props>(
  ({
    variant,
    aspectRatio,
    isActive,
    mobilePreview,
    youtubeOverlay,
    backgroundImage,
    onActivate,
    onJsonChange,
    logoBase64,
    autoBranding,
    squintTest,
  }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasElRef = useRef<HTMLCanvasElement>(null);
    const fabricRef = useRef<fabric.Canvas | null>(null);
    const historyRef = useRef<string[]>([]);
    const historyIndexRef = useRef<number>(-1);
    const isLoadingRef = useRef(false);

    const { width: nativeW, height: nativeH } = ASPECT_RATIOS[aspectRatio];
    const displayAspect = nativeW / nativeH;

    const pushHistory = useCallback(() => {
      if (!fabricRef.current || isLoadingRef.current) return;
      const json = JSON.stringify(fabricRef.current.toJSON(["role", "data-role"]));
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
      historyRef.current.push(json);
      if (historyRef.current.length > HISTORY_LIMIT) historyRef.current.shift();
      historyIndexRef.current = historyRef.current.length - 1;
      onJsonChange(fabricRef.current.toObject(["role", "data-role"]));
    }, [onJsonChange]);

    const getDisplaySize = useCallback(() => {
      const container = containerRef.current;
      if (!container) return { w: 640, h: 360 };
      const parentW = container.parentElement?.offsetWidth || 600;
      const maxW = Math.min(parentW - 4, mobilePreview ? 320 : parentW - 4);
      const w = maxW;
      const h = w / displayAspect;
      return { w: Math.floor(w), h: Math.floor(h) };
    }, [displayAspect, mobilePreview]);

    const initCanvas = useCallback(() => {
      if (!canvasElRef.current) return;
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }
      const { w, h } = getDisplaySize();
      const canvas = new fabric.Canvas(canvasElRef.current, {
        width: w,
        height: h,
        backgroundColor: "#0a0e27",
        selection: true,
        preserveObjectStacking: true,
        renderOnAddRemove: true,
      });
      fabricRef.current = canvas;
      historyRef.current = [];
      historyIndexRef.current = -1;

      canvas.on("object:added", pushHistory);
      canvas.on("object:modified", pushHistory);
      canvas.on("object:removed", pushHistory);

      canvas.on("mouse:down", () => onActivate());

      // Keyboard shortcuts
      const handleKey = (e: KeyboardEvent) => {
        if (!isActive) return;
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        if ((e.key === "Delete" || e.key === "Backspace") && canvas.getActiveObject()) {
          const obj = canvas.getActiveObject();
          if (obj) { canvas.remove(obj); canvas.discardActiveObject(); canvas.renderAll(); }
        }
      };
      window.addEventListener("keydown", handleKey);
      (canvas as any)._keyHandler = handleKey;

      return canvas;
    }, [getDisplaySize, pushHistory, onActivate, isActive]);

    useEffect(() => {
      const canvas = initCanvas();
      if (!canvas) return;
      return () => {
        if ((canvas as any)._keyHandler) window.removeEventListener("keydown", (canvas as any)._keyHandler);
        canvas.dispose();
        fabricRef.current = null;
      };
    }, [aspectRatio, mobilePreview]);

    useEffect(() => {
      if (!fabricRef.current || !backgroundImage) return;
      isLoadingRef.current = true;
      const canvas = fabricRef.current;
      fabric.Image.fromURL(backgroundImage, (img) => {
        const { w, h } = getDisplaySize();
        const scaleX = w / (img.width || 1);
        const scaleY = h / (img.height || 1);
        const scale = Math.max(scaleX, scaleY);
        img.set({ scaleX: scale, scaleY: scale, originX: "left", originY: "top", left: 0, top: 0, selectable: false, evented: false });
        (img as any)["data-role"] = "background";
        const existing = canvas.getObjects().filter(o => (o as any)["data-role"] === "background");
        existing.forEach(o => canvas.remove(o));
        canvas.insertAt(img, 0, false);
        canvas.renderAll();
        isLoadingRef.current = false;

        if (autoBranding && logoBase64) {
          fabric.Image.fromURL(logoBase64, (logo) => {
            const { w, h } = getDisplaySize();
            const logoSize = w * 0.12;
            const scaleL = logoSize / Math.max(logo.width || 1, logo.height || 1);
            logo.set({
              scaleX: scaleL, scaleY: scaleL,
              left: w - (logo.width || 0) * scaleL - 10,
              top: h - (logo.height || 0) * scaleL - 10,
              opacity: 0.15, selectable: true, evented: true,
            });
            (logo as any)["data-role"] = "logo";
            canvas.add(logo);
            canvas.renderAll();
          });
        }
      });
    }, [backgroundImage, autoBranding, logoBase64, getDisplaySize]);

    useImperativeHandle(ref, () => ({
      addText(text = "YOUR TEXT", style = "youtube") {
        const canvas = fabricRef.current;
        if (!canvas) return;
        const { w, h } = getDisplaySize();
        const tb = new fabric.Textbox(text, {
          left: w * 0.1, top: h * 0.35,
          width: w * 0.8,
          fontSize: style === "youtube" ? Math.round(w * 0.08) : Math.round(w * 0.06),
          fontFamily: style === "youtube" ? "Impact" : "Inter",
          fill: style === "youtube" ? "#FFFF00" : "#ffffff",
          stroke: style === "youtube" ? "#000000" : "none",
          strokeWidth: style === "youtube" ? 3 : 0,
          fontWeight: "bold",
          textAlign: "center",
          shadow: style === "youtube" ? new fabric.Shadow({ color: "#000", blur: 8, offsetX: 2, offsetY: 2 }) : undefined,
        });
        (tb as any)["data-role"] = "text";
        canvas.add(tb);
        canvas.setActiveObject(tb);
        canvas.renderAll();
      },
      addArrow() {
        const canvas = fabricRef.current;
        if (!canvas) return;
        const { w, h } = getDisplaySize();
        const cx = w * 0.5, cy = h * 0.5;
        const len = w * 0.15;
        const line = new fabric.Line([cx - len, cy, cx + len, cy], {
          stroke: "#ff0000", strokeWidth: 4, selectable: true,
        });
        const head = new fabric.Triangle({
          width: w * 0.04, height: w * 0.04,
          fill: "#ff0000",
          left: cx + len - w * 0.02,
          top: cy - w * 0.02,
          angle: 90,
        });
        const group = new fabric.Group([line, head], { selectable: true });
        (group as any)["data-role"] = "shape";
        canvas.add(group);
        canvas.setActiveObject(group);
        canvas.renderAll();
      },
      addCircle() {
        const canvas = fabricRef.current;
        if (!canvas) return;
        const { w } = getDisplaySize();
        const circle = new fabric.Circle({
          radius: w * 0.06, fill: "transparent",
          stroke: "#00d4ff", strokeWidth: 3,
          left: w * 0.4, top: w * 0.2,
          selectable: true,
        });
        (circle as any)["data-role"] = "shape";
        canvas.add(circle);
        canvas.setActiveObject(circle);
        canvas.renderAll();
      },
      setDrawingMode(enabled) {
        const canvas = fabricRef.current;
        if (!canvas) return;
        canvas.isDrawingMode = enabled;
        if (enabled) {
          canvas.freeDrawingBrush.color = "#ff0000";
          canvas.freeDrawingBrush.width = 3;
        }
      },
      clearEdits() {
        const canvas = fabricRef.current;
        if (!canvas) return;
        const bg = canvas.getObjects().filter(o => (o as any)["data-role"] === "background");
        canvas.clear();
        bg.forEach(o => canvas.add(o));
        canvas.renderAll();
      },
      undo() {
        if (!fabricRef.current || historyIndexRef.current <= 0) return;
        historyIndexRef.current -= 1;
        const json = historyRef.current[historyIndexRef.current];
        isLoadingRef.current = true;
        fabricRef.current.loadFromJSON(json, () => {
          fabricRef.current?.renderAll();
          isLoadingRef.current = false;
        });
      },
      redo() {
        if (!fabricRef.current || historyIndexRef.current >= historyRef.current.length - 1) return;
        historyIndexRef.current += 1;
        const json = historyRef.current[historyIndexRef.current];
        isLoadingRef.current = true;
        fabricRef.current.loadFromJSON(json, () => {
          fabricRef.current?.renderAll();
          isLoadingRef.current = false;
        });
      },
      deleteSelected() {
        const canvas = fabricRef.current;
        if (!canvas) return;
        const obj = canvas.getActiveObject();
        if (obj) { canvas.remove(obj); canvas.discardActiveObject(); canvas.renderAll(); }
      },
      getJSON() {
        return fabricRef.current?.toObject(["data-role"]) || {};
      },
      loadJSON(json) {
        if (!fabricRef.current) return;
        isLoadingRef.current = true;
        fabricRef.current.loadFromJSON(json, () => {
          fabricRef.current?.renderAll();
          isLoadingRef.current = false;
          pushHistory();
        });
      },
      setBackground(imageUrl, onDone) {
        const canvas = fabricRef.current;
        if (!canvas) return;
        fabric.Image.fromURL(imageUrl, (img) => {
          const { w, h } = getDisplaySize();
          const scale = Math.max(w / (img.width || 1), h / (img.height || 1));
          img.set({ scaleX: scale, scaleY: scale, originX: "left", originY: "top", left: 0, top: 0, selectable: false, evented: false });
          (img as any)["data-role"] = "background";
          const existing = canvas.getObjects().filter(o => (o as any)["data-role"] === "background");
          existing.forEach(o => canvas.remove(o));
          canvas.insertAt(img, 0, false);
          canvas.renderAll();
          onDone?.();
        });
      },
      async getDataURL(width, height) {
        const canvas = fabricRef.current;
        if (!canvas) return "";
        const { w } = getDisplaySize();
        const multiplier = width / w;
        return canvas.toDataURL({ format: "png", multiplier, quality: 0.92 });
      },
      getCanvas() { return fabricRef.current; },
      addImage(imageUrl, role = "prop") {
        const canvas = fabricRef.current;
        if (!canvas) return;
        const { w, h } = getDisplaySize();
        fabric.Image.fromURL(imageUrl, (img) => {
          const maxSize = w * 0.5;
          const scale = Math.min(maxSize / (img.width || 1), maxSize / (img.height || 1));
          img.set({ scaleX: scale, scaleY: scale, left: w * 0.25, top: h * 0.2 });
          (img as any)["data-role"] = role;
          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.renderAll();
        });
      },
    }), [getDisplaySize, pushHistory]);

    const { w, h } = getDisplaySize();

    return (
      <div ref={containerRef} style={{ width: mobilePreview ? 320 : "100%" }}>
        <div
          className={`canvas-container-wrap ${isActive ? "active" : ""}`}
          style={{ width: w, height: h, cursor: "pointer" }}
          onClick={onActivate}
        >
          <canvas ref={canvasElRef} />

          {youtubeOverlay && (
            <div className="yt-overlay">
              <div className="yt-deadzone" style={{ bottom: "6%", right: "3%", width: "14%", height: "8%" }}>
                Timestamp
              </div>
              <div className="yt-deadzone" style={{ top: "4%", right: "3%", width: "10%", height: "12%" }}>
                Watch Later
              </div>
              <div className="yt-deadzone" style={{ bottom: "6%", left: "3%", width: "30%", height: "8%" }}>
                Channel / Duration
              </div>
            </div>
          )}

          {squintTest && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-30 pointer-events-none">
              <div
                style={{ transform: "scale(0.1)", transformOrigin: "center", filter: "blur(1px)" }}
              >
                <canvas ref={undefined} style={{ width: w, height: h }} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

CanvasPanel.displayName = "CanvasPanel";
export default CanvasPanel;
