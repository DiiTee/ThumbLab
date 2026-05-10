import { useRef } from "react";
import { Zap, Upload, RefreshCw, Eye, Smartphone, Youtube, SplitSquareVertical, Monitor } from "lucide-react";
import { useStore } from "../store/useStore";
import { ASPECT_RATIOS, IMAGE_MODELS } from "../types";
import type { AspectRatio, ImageModel } from "../types";
import { generatePrompts, generateImage, analyzeReferenceImage } from "../lib/puter";
import NexLevHelper from "./NexLevHelper";

interface Props {
  onImagesGenerated: (imgA: string, promptA: string, imgB: string | null, promptB: string | null) => void;
}

export default function AITab({ onImagesGenerated }: Props) {
  const { state, dispatch } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const refFileRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    if (state.isGenerating) return;
    if (!window.puter) {
      alert("Puter.js is not loaded. Please refresh and try again.");
      return;
    }
    dispatch({ type: "SET_GENERATING", value: true });
    try {
      const { primaryColor, secondaryColor, visualVibe } = state.brandSettings;
      const brandColors = `${primaryColor}, ${secondaryColor}`;
      const { promptA, promptB } = await generatePrompts(
        state.scriptText,
        state.scriptText,
        visualVibe,
        brandColors,
        state.aspectRatio
      );
      const { width, height } = ASPECT_RATIOS[state.aspectRatio];
      const [imgA, imgB] = await Promise.all([
        generateImage(promptA, state.imageModel, width, height),
        state.showVariantB ? generateImage(promptB, state.imageModel, width, height) : Promise.resolve(null),
      ]);
      onImagesGenerated(imgA, promptA, imgB, state.showVariantB ? promptB : null);
    } catch (err) {
      console.error(err);
      alert(`Generation failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      dispatch({ type: "SET_GENERATING", value: false });
    }
  };

  const handleScriptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => dispatch({ type: "SET_SCRIPT", text: ev.target?.result as string });
    reader.readAsText(file);
  };

  const handleReferenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const b64 = ev.target?.result as string;
      dispatch({ type: "SET_REFERENCE_IMAGE", image: b64 });
      if (!window.puter) { alert("Puter.js not loaded"); return; }
      dispatch({ type: "SET_GENERATING", value: true });
      try {
        const analysis = await analyzeReferenceImage(b64);
        const { width, height } = ASPECT_RATIOS[state.aspectRatio];
        const img = await generateImage(analysis.backgroundPrompt, state.imageModel, width, height);
        onImagesGenerated(img, analysis.backgroundPrompt, null, null);
        alert(`Reference analyzed!\nCharacter position: ${analysis.characterPosition?.alignment || "center"}\nColors: ${analysis.colors?.join(", ")}`);
      } catch (err) {
        alert(`Recreate failed: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        dispatch({ type: "SET_GENERATING", value: false });
      }
    };
    reader.readAsDataURL(file);
  };

  const seoReady = (canvas: typeof state.canvasA) =>
    canvas.seoData.filenameSlug && canvas.seoData.altText && canvas.seoData.metaTags;

  return (
    <div className="flex flex-col gap-3 overflow-y-auto flex-1 pr-1">
      {/* Script / Strategy Input */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="section-label">Script / Strategy / NexLev Note</span>
          <button
            className="btn-secondary px-2 py-1 text-xs flex items-center gap-1"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={11} /> Upload
          </button>
          <input ref={fileRef} type="file" accept=".txt,.md" className="hidden" onChange={handleScriptUpload} />
        </div>
        <textarea
          value={state.scriptText}
          onChange={e => dispatch({ type: "SET_SCRIPT", text: e.target.value })}
          className="w-full p-3 text-sm resize-none"
          style={{ height: 100, fontSize: 13, lineHeight: 1.5 }}
          placeholder="Paste your video script, thumbnail strategy note, or NexLev MCP analysis here..."
        />
        <NexLevHelper scriptText={state.scriptText} />
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="section-label">Aspect Ratio</label>
          <select
            value={state.aspectRatio}
            onChange={e => dispatch({ type: "SET_ASPECT_RATIO", ratio: e.target.value as AspectRatio })}
            className="w-full px-3 py-2 text-sm"
          >
            {Object.entries(ASPECT_RATIOS).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="section-label">Image Model</label>
          <select
            value={state.imageModel}
            onChange={e => dispatch({ type: "SET_IMAGE_MODEL", model: e.target.value as ImageModel })}
            className="w-full px-3 py-2 text-sm"
          >
            {Object.entries(IMAGE_MODELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Toggles */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Variant B", icon: <SplitSquareVertical size={12} />, key: "TOGGLE_VARIANT_B", value: state.showVariantB },
          { label: "Mobile Preview", icon: <Smartphone size={12} />, key: "TOGGLE_MOBILE_PREVIEW", value: state.mobilePreview },
          { label: "YouTube Overlay", icon: <Youtube size={12} />, key: "TOGGLE_YOUTUBE_OVERLAY", value: state.youtubeOverlay },
          { label: "Squint Test", icon: <Monitor size={12} />, key: "TOGGLE_SQUINT", value: state.squintTest },
        ].map(({ label, icon, key, value }) => (
          <div key={key} className="flex items-center gap-2 cursor-pointer select-none" onClick={() => dispatch({ type: key as any })}>
            <div className={`toggle-switch ${value ? "on" : ""}`} />
            <span style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
              {icon} {label}
            </span>
          </div>
        ))}
      </div>

      {/* Recreate Reference */}
      <div>
        <label className="section-label">Recreate Reference</label>
        <div className="flex items-start gap-2">
          {state.referenceImage && (
            <img src={state.referenceImage} alt="Reference" style={{ width: 60, height: 34, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border-color)", flexShrink: 0 }} />
          )}
          <button
            className="btn-secondary px-3 py-2 text-xs flex items-center gap-2 flex-1"
            onClick={() => refFileRef.current?.click()}
            disabled={state.isGenerating}
          >
            <RefreshCw size={12} />
            {state.referenceImage ? "Upload New Reference" : "Upload Reference Thumbnail"}
          </button>
          <input ref={refFileRef} type="file" accept="image/*" className="hidden" onChange={handleReferenceUpload} />
        </div>
        {state.referenceImage && (
          <button className="btn-secondary px-2 py-1 text-xs mt-1 w-full" onClick={() => dispatch({ type: "SET_REFERENCE_IMAGE", image: null })}>
            Clear Reference
          </button>
        )}
      </div>

      {/* SEO Status */}
      <div className="flex gap-2">
        {[state.canvasA, state.canvasB].filter((_, i) => i === 0 || state.showVariantB).map((canvas, i) => (
          seoReady(canvas) ? (
            <span key={i} className="seo-badge">✓ Variant {i === 0 ? "A" : "B"} SEO Ready</span>
          ) : null
        ))}
      </div>

      {/* Preview in Feed button */}
      <button
        className="btn-secondary px-3 py-2 text-xs flex items-center justify-center gap-2"
        onClick={() => dispatch({ type: "SET_TAB" as any, tab: "ai" })}
      >
        <Eye size={12} /> Preview in YouTube Feed
      </button>

      {/* Generate Button */}
      <button
        className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2 mt-auto"
        style={{ fontSize: 14, letterSpacing: "0.04em" }}
        onClick={handleGenerate}
        disabled={state.isGenerating}
      >
        {state.isGenerating ? (
          <>
            <span className="spinner" />
            Generating with Claude + {IMAGE_MODELS[state.imageModel].split("[")[0].trim()}...
          </>
        ) : (
          <>
            <Zap size={16} />
            Generate A/B Test Concepts
          </>
        )}
      </button>
    </div>
  );
}
