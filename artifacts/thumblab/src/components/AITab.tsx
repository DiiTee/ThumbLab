import { useRef, useState } from "react";
import { Zap, Upload, RefreshCw, Eye, Smartphone, Youtube, SplitSquareVertical, Monitor, Sparkles, ChevronLeft, Image } from "lucide-react";
import { useStore } from "../store/useStore";
import { ASPECT_RATIOS, IMAGE_MODELS, PROMPT_MODELS, SEO_MODELS } from "../types";
import type { AspectRatio, ImageModel, PromptModel } from "../types";
import { generatePrompts, generateImage, analyzeReferenceImage } from "../lib/puter";
import NexLevHelper from "./NexLevHelper";

interface Props {
  onImagesGenerated: (imgA: string, promptA: string, imgB: string | null, promptB: string | null) => void;
}

type Step = "idle" | "generating-prompts" | "prompts-ready" | "generating-images";

export default function AITab({ onImagesGenerated }: Props) {
  const { state, dispatch } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const refFileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("idle");
  const [editablePromptA, setEditablePromptA] = useState("");
  const [editablePromptB, setEditablePromptB] = useState("");

  const isWorking = step === "generating-prompts" || step === "generating-images";

  // Step 1: Generate prompts only
  const handleGeneratePrompts = async () => {
    if (isWorking) return;
    if (!window.puter) { alert("Puter.js is not loaded. Please refresh."); return; }
    setStep("generating-prompts");
    dispatch({ type: "SET_GENERATING", value: true });
    try {
      const { primaryColor, secondaryColor, visualVibe } = state.brandSettings;
      const { promptA, promptB } = await generatePrompts(
        state.scriptText,
        state.scriptText,
        visualVibe,
        `${primaryColor}, ${secondaryColor}`,
        state.aspectRatio,
        state.promptModel
      );
      setEditablePromptA(promptA);
      setEditablePromptB(promptB);
      setStep("prompts-ready");
    } catch (err) {
      console.error(err);
      alert(`Prompt generation failed: ${err instanceof Error ? err.message : String(err)}`);
      setStep("idle");
    } finally {
      dispatch({ type: "SET_GENERATING", value: false });
    }
  };

  // Step 2: Generate images from (possibly edited) prompts
  const handleGenerateImages = async () => {
    if (isWorking) return;
    if (!window.puter) { alert("Puter.js is not loaded. Please refresh."); return; }
    setStep("generating-images");
    dispatch({ type: "SET_GENERATING", value: true });
    try {
      const { width, height } = ASPECT_RATIOS[state.aspectRatio];
      const [imgA, imgB] = await Promise.all([
        generateImage(editablePromptA, state.imageModel, width, height),
        state.showVariantB ? generateImage(editablePromptB, state.imageModel, width, height) : Promise.resolve(null),
      ]);
      onImagesGenerated(imgA, editablePromptA, imgB, state.showVariantB ? editablePromptB : null);
      setStep("idle");
    } catch (err) {
      console.error(err);
      alert(`Image generation failed: ${err instanceof Error ? err.message : String(err)}`);
      setStep("prompts-ready");
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
      setStep("generating-images");
      dispatch({ type: "SET_GENERATING", value: true });
      try {
        const analysis = await analyzeReferenceImage(b64);
        const { width, height } = ASPECT_RATIOS[state.aspectRatio];
        const img = await generateImage(analysis.backgroundPrompt, state.imageModel, width, height);
        onImagesGenerated(img, analysis.backgroundPrompt, null, null);
        setStep("idle");
        alert(`Reference analyzed!\nCharacter position: ${analysis.characterPosition?.alignment || "center"}\nColors: ${analysis.colors?.join(", ")}`);
      } catch (err) {
        alert(`Recreate failed: ${err instanceof Error ? err.message : String(err)}`);
        setStep("idle");
      } finally {
        dispatch({ type: "SET_GENERATING", value: false });
      }
    };
    reader.readAsDataURL(file);
  };

  const seoReady = (canvas: typeof state.canvasA) =>
    canvas.seoData.filenameSlug && canvas.seoData.altText && canvas.seoData.metaTags;

  const imageModelLabel = IMAGE_MODELS[state.imageModel];
  const promptModelLabel = PROMPT_MODELS[state.promptModel];

  return (
    <div className="flex flex-col gap-3 overflow-y-auto flex-1 pr-1">

      {/* Script / Strategy Input */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="section-label">Script / Strategy / NexLev Note</span>
          <button className="btn-secondary px-2 py-1 text-xs flex items-center gap-1" onClick={() => fileRef.current?.click()}>
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

      {/* Model selectors — 2×2 grid */}
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
        <div>
          <label className="section-label">Prompt Model</label>
          <select
            value={state.promptModel}
            onChange={e => dispatch({ type: "SET_PROMPT_MODEL", model: e.target.value as PromptModel })}
            className="w-full px-3 py-2 text-sm"
          >
            {Object.entries(PROMPT_MODELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="section-label">SEO Model</label>
          <select
            value={state.seoModel}
            onChange={e => dispatch({ type: "SET_SEO_MODEL", model: e.target.value as PromptModel })}
            className="w-full px-3 py-2 text-sm"
          >
            {Object.entries(SEO_MODELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Image model hint */}
      <div style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.4, padding: "4px 8px", background: "var(--bg-input)", borderRadius: 6, border: "1px solid var(--border-color)" }}>
        {state.imageModel === "dall-e-3"
          ? "✦ DALL·E 3 has best text accuracy for thumbnails"
          : state.imageModel === "gemini-2.0-flash-exp-image-generation"
          ? "✦ Nano Banana: fast & creative, weaker text"
          : "✦ FLUX Schnell: very fast, good composition"}
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
            disabled={isWorking}
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
      <div className="flex gap-2 flex-wrap">
        {[state.canvasA, state.canvasB].filter((_, i) => i === 0 || state.showVariantB).map((canvas, i) => (
          seoReady(canvas) ? (
            <span key={i} className="seo-badge">✓ Variant {i === 0 ? "A" : "B"} SEO Ready</span>
          ) : null
        ))}
      </div>

      {/* ── PROMPT PREVIEW & EDIT (appears after step 1) ── */}
      {(step === "prompts-ready" || step === "generating-images") && (
        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-cyan)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              ✦ Review & Edit Prompts
            </span>
            <button
              className="btn-secondary px-2 py-1 flex items-center gap-1"
              style={{ fontSize: 11 }}
              onClick={() => { setStep("idle"); setEditablePromptA(""); setEditablePromptB(""); }}
              disabled={step === "generating-images"}
            >
              <ChevronLeft size={11} /> Start Over
            </button>
          </div>

          <div>
            <label className="section-label" style={{ color: "var(--accent-cyan)" }}>Variant A Prompt</label>
            <textarea
              value={editablePromptA}
              onChange={e => setEditablePromptA(e.target.value)}
              className="w-full p-3 text-sm resize-y"
              style={{ minHeight: 90, fontSize: 12, lineHeight: 1.5 }}
              disabled={step === "generating-images"}
            />
          </div>

          {state.showVariantB && (
            <div>
              <label className="section-label" style={{ color: "var(--accent-green)" }}>Variant B Prompt</label>
              <textarea
                value={editablePromptB}
                onChange={e => setEditablePromptB(e.target.value)}
                className="w-full p-3 text-sm resize-y"
                style={{ minHeight: 90, fontSize: 12, lineHeight: 1.5 }}
                disabled={step === "generating-images"}
              />
            </div>
          )}

          {/* Regenerate prompts inline */}
          <button
            className="btn-secondary px-3 py-2 text-xs flex items-center justify-center gap-2"
            onClick={handleGeneratePrompts}
            disabled={isWorking}
          >
            <Sparkles size={12} /> Regenerate Prompts
          </button>
        </div>
      )}

      {/* ── BOTTOM BUTTONS ── */}
      <div className="sticky bottom-0 flex flex-col gap-2" style={{ zIndex: 10, paddingTop: 4, background: "var(--bg-sidebar)" }}>

        {/* Step 1: Generate prompts */}
        {(step === "idle" || step === "generating-prompts") && (
          <button
            className="btn-primary w-full py-3 flex items-center justify-center gap-2"
            style={{ fontSize: 14, letterSpacing: "0.04em" }}
            onClick={handleGeneratePrompts}
            disabled={step === "generating-prompts"}
          >
            {step === "generating-prompts" ? (
              <><span className="spinner" /> Writing prompts with {promptModelLabel.split(" [")[0]}...</>
            ) : (
              <><Sparkles size={16} /> Generate Prompts</>
            )}
          </button>
        )}

        {/* Step 2: Generate images (shown after prompts are ready) */}
        {(step === "prompts-ready" || step === "generating-images") && (
          <button
            className="btn-primary w-full py-3 flex items-center justify-center gap-2"
            style={{ fontSize: 14, letterSpacing: "0.04em", background: step === "generating-images" ? undefined : "linear-gradient(135deg, #00d4ff22, #00ff8822), var(--accent-green)" }}
            onClick={handleGenerateImages}
            disabled={step === "generating-images"}
          >
            {step === "generating-images" ? (
              <><span className="spinner" /> Generating with {imageModelLabel.split(" [")[0]}...</>
            ) : (
              <><Image size={16} /> Generate Thumbnails</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
