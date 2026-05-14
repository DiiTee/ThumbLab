import { useRef, useState } from "react";
import { Zap, Upload, RefreshCw, Smartphone, Youtube, SplitSquareVertical, Monitor, Sparkles, ChevronLeft, Image, Copy, ExternalLink, Key, Eye, EyeOff } from "lucide-react";
import { useStore } from "../store/useStore";
import {
  ASPECT_RATIOS, PUTER_PROMPT_MODELS, PUTER_IMAGE_MODELS,
  GOOGLE_PROMPT_MODELS, GOOGLE_IMAGE_MODELS
} from "../types";
import type { AspectRatio, Engine, ImageQuality } from "../types";
import { generatePrompts, generateImage, analyzeReferenceImage } from "../lib/puter";
import { googleGeneratePrompts, googleGenerateImage } from "../lib/google";
import NexLevHelper from "./NexLevHelper";

interface Props {
  onImagesGenerated: (imgA: string, promptA: string, imgB: string | null, promptB: string | null) => void;
}

type Step = "idle" | "generating-prompts" | "prompts-ready" | "generating-images";

function EngineToggle({ value, onChange }: { value: Engine; onChange: (e: Engine) => void }) {
  return (
    <div className="flex gap-0.5" style={{ background: "var(--bg-input)", borderRadius: 6, padding: 2, border: "1px solid var(--border-color)" }}>
      {(["puter", "google"] as Engine[]).map(e => (
        <button
          key={e}
          onClick={() => onChange(e)}
          style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
            padding: "2px 6px", borderRadius: 4, border: "none", cursor: "pointer", textTransform: "uppercase",
            background: value === e ? (e === "google" ? "#4285f4" : "var(--accent-cyan)") : "transparent",
            color: value === e ? "#fff" : "var(--text-muted)",
            transition: "all 0.15s",
          }}
        >
          {e === "google" ? "G" : "P"}
        </button>
      ))}
    </div>
  );
}

export default function AITab({ onImagesGenerated }: Props) {
  const { state, dispatch } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const refFileRef = useRef<HTMLInputElement>(null);

  const [step, setStepRaw] = useState<Step>(() => (sessionStorage.getItem("tl_step") as Step) || "idle");
  const [editablePromptA, setEditablePromptARaw] = useState(() => sessionStorage.getItem("tl_prompt_a") || "");
  const [editablePromptB, setEditablePromptBRaw] = useState(() => sessionStorage.getItem("tl_prompt_b") || "");

  const setStep = (s: Step) => { setStepRaw(s); sessionStorage.setItem("tl_step", s); };
  const setEditablePromptA = (v: string) => { setEditablePromptARaw(v); sessionStorage.setItem("tl_prompt_a", v); };
  const setEditablePromptB = (v: string) => { setEditablePromptBRaw(v); sessionStorage.setItem("tl_prompt_b", v); };
  const [toast, setToast] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("thumblab_google_key") || "");

  const isWorking = step === "generating-prompts" || step === "generating-images";
  const anyGoogleEngine = state.enginePrompt === "google" || state.engineSeo === "google" || state.engineImage === "google";

  const saveApiKey = (val: string) => {
    setApiKey(val);
    localStorage.setItem("thumblab_google_key", val);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const promptModels = state.enginePrompt === "google" ? GOOGLE_PROMPT_MODELS : PUTER_PROMPT_MODELS;
  const seoModels = state.engineSeo === "google" ? GOOGLE_PROMPT_MODELS : PUTER_PROMPT_MODELS;
  const imageModels = state.engineImage === "google" ? GOOGLE_IMAGE_MODELS : PUTER_IMAGE_MODELS;

  // Ensure selected models are valid for current engine
  const safePromptModel = promptModels[state.promptModel] ? state.promptModel : Object.keys(promptModels)[0];
  const safeImageModel = imageModels[state.imageModel] ? state.imageModel : Object.keys(imageModels)[0];

  const handleGeneratePrompts = async () => {
    if (isWorking) return;
    if (state.enginePrompt === "puter" && !window.puter) { alert("Puter.js not loaded. Please refresh."); return; }
    setStep("generating-prompts");
    dispatch({ type: "SET_GENERATING", value: true });
    try {
      const { primaryColor, secondaryColor, visualVibe } = state.brandSettings;
      let pA: string, pB: string;
      if (state.enginePrompt === "google") {
        ({ promptA: pA, promptB: pB } = await googleGeneratePrompts(
          state.scriptText, visualVibe, `${primaryColor}, ${secondaryColor}`,
          state.aspectRatio, safePromptModel, apiKey
        ));
      } else {
        ({ promptA: pA, promptB: pB } = await generatePrompts(
          state.scriptText, state.scriptText, visualVibe,
          `${primaryColor}, ${secondaryColor}`, state.aspectRatio, safePromptModel
        ));
      }
      setEditablePromptA(pA);
      setEditablePromptB(pB);
      setStep("prompts-ready");
    } catch (err) {
      console.error("[THUMBLAB] prompt gen error:", err);
      alert(`Prompt generation failed: ${err instanceof Error ? err.message : String(err)}`);
      setStep("idle");
    } finally {
      dispatch({ type: "SET_GENERATING", value: false });
    }
  };

  const handleGenerateImages = async () => {
    if (isWorking) return;
    if (state.engineImage === "puter" && !window.puter) { alert("Puter.js not loaded. Please refresh."); return; }
    setStep("generating-images");
    dispatch({ type: "SET_GENERATING", value: true });
    try {
      const { width, height } = ASPECT_RATIOS[state.aspectRatio];
      const genImg = state.engineImage === "google"
        ? (p: string) => googleGenerateImage(p, safeImageModel, apiKey)
        : (p: string) => generateImage(p, safeImageModel, width, height, state.imageQuality);

      const [imgA, imgB] = await Promise.all([
        genImg(editablePromptA),
        state.showVariantB ? genImg(editablePromptB) : Promise.resolve(null),
      ]);
      onImagesGenerated(imgA, editablePromptA, imgB, state.showVariantB ? editablePromptB : null);
      setStep("prompts-ready");
    } catch (err) {
      console.error("[THUMBLAB] image gen error:", err);
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
        const img = await generateImage(analysis.backgroundPrompt, safeImageModel, width, height, state.imageQuality);
        onImagesGenerated(img, analysis.backgroundPrompt, null, null);
        setStep("idle");
      } catch (err) {
        alert(`Recreate failed: ${err instanceof Error ? err.message : String(err)}`);
        setStep("idle");
      } finally {
        dispatch({ type: "SET_GENERATING", value: false });
      }
    };
    reader.readAsDataURL(file);
  };

  const copyPrompt = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => showToast(`${label} copied to clipboard`));
  };

  const copyBothPrompts = () => {
    const combined = `Generate 2 images using the following prompts:\n\nImage A: ${editablePromptA}\n\nImage B: ${editablePromptB}`;
    navigator.clipboard.writeText(combined).then(() =>
      showToast("Prompt copied! Don't forget to set Aspect Ratio to 16:9 before pasting.")
    );
  };

  const seoReady = (canvas: typeof state.canvasA) =>
    canvas.seoData.filenameSlug && canvas.seoData.altText && canvas.seoData.metaTags;

  const imageModelLabel = imageModels[safeImageModel] || safeImageModel;
  const promptModelLabel = (promptModels[safePromptModel] || safePromptModel).split(" [")[0];
  const showQuality = safeImageModel === "gpt-image-2";

  return (
    <div className="flex flex-col gap-3 overflow-y-auto flex-1 pr-1">

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
          background: "#0a0e27", border: "1px solid var(--accent-cyan)",
          color: "var(--accent-cyan)", padding: "8px 16px", borderRadius: 8,
          fontSize: 12, fontWeight: 600, zIndex: 9999, maxWidth: 300, textAlign: "center",
          boxShadow: "0 4px 20px rgba(0,212,255,0.3)"
        }}>
          {toast}
        </div>
      )}

      {/* Script */}
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
          style={{ height: 90, fontSize: 13, lineHeight: 1.5 }}
          placeholder="Paste your video script, thumbnail strategy note, or NexLev MCP analysis here..."
        />
        <NexLevHelper scriptText={state.scriptText} />
      </div>

      {/* ── Engine + Models ── */}
      <div style={{ border: "1px solid var(--border-color)", borderRadius: 8, padding: "10px 10px 8px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
          Models &amp; Engines &nbsp;<span style={{ color: "var(--accent-cyan)" }}>P</span>=Puter &nbsp;<span style={{ color: "#4285f4" }}>G</span>=Google API
        </div>

        {/* Aspect + Image */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="section-label">Aspect Ratio</label>
            <select value={state.aspectRatio} onChange={e => dispatch({ type: "SET_ASPECT_RATIO", ratio: e.target.value as AspectRatio })} className="w-full px-2 py-1.5 text-xs">
              {Object.entries(ASPECT_RATIOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <label className="section-label" style={{ marginBottom: 0 }}>Image Model</label>
              <EngineToggle value={state.engineImage} onChange={e => { dispatch({ type: "SET_ENGINE_IMAGE", engine: e }); }} />
            </div>
            <select value={safeImageModel} onChange={e => dispatch({ type: "SET_IMAGE_MODEL", model: e.target.value })} className="w-full px-2 py-1.5 text-xs">
              {Object.entries(imageModels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>

        {/* Prompt + SEO */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <label className="section-label" style={{ marginBottom: 0 }}>Prompt Model</label>
              <EngineToggle value={state.enginePrompt} onChange={e => { dispatch({ type: "SET_ENGINE_PROMPT", engine: e }); }} />
            </div>
            <select value={safePromptModel} onChange={e => dispatch({ type: "SET_PROMPT_MODEL", model: e.target.value })} className="w-full px-2 py-1.5 text-xs">
              {Object.entries(promptModels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <label className="section-label" style={{ marginBottom: 0 }}>SEO Model</label>
              <EngineToggle value={state.engineSeo} onChange={e => { dispatch({ type: "SET_ENGINE_SEO", engine: e }); }} />
            </div>
            <select value={state.seoModel} onChange={e => dispatch({ type: "SET_SEO_MODEL", model: e.target.value })} className="w-full px-2 py-1.5 text-xs">
              {Object.entries(seoModels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>

        {/* Quality (gpt-image-2 only) */}
        {showQuality && (
          <div className="mb-2">
            <label className="section-label">Image Quality (GPT Image 2)</label>
            <div className="flex gap-1">
              {(["low", "medium", "high"] as ImageQuality[]).map(q => (
                <button
                  key={q}
                  onClick={() => dispatch({ type: "SET_IMAGE_QUALITY", quality: q })}
                  style={{
                    flex: 1, padding: "4px 0", fontSize: 11, fontWeight: 600, borderRadius: 6,
                    border: state.imageQuality === q ? "1px solid var(--accent-cyan)" : "1px solid var(--border-color)",
                    background: state.imageQuality === q ? "rgba(0,212,255,0.15)" : "var(--bg-input)",
                    color: state.imageQuality === q ? "var(--accent-cyan)" : "var(--text-muted)",
                    cursor: "pointer", textTransform: "capitalize",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Google API Key (shown when any Google engine active) */}
        {anyGoogleEngine && (
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Key size={10} style={{ color: "#4285f4" }} />
              <label className="section-label" style={{ marginBottom: 0, color: "#4285f4" }}>Google API Key</label>
            </div>
            <div className="flex gap-1">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={e => saveApiKey(e.target.value)}
                placeholder="AIza..."
                className="flex-1 px-2 py-1.5 text-xs font-mono"
                style={{ fontSize: 11 }}
              />
              <button className="btn-secondary px-2" onClick={() => setShowApiKey(v => !v)} title={showApiKey ? "Hide" : "Show"}>
                {showApiKey ? <EyeOff size={11} /> : <Eye size={11} />}
              </button>
            </div>
            <p style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 3 }}>Stored locally in your browser only</p>
            {/* Quick links to AI Studio dashboard */}
            <div className="flex gap-1 mt-2">
              <a
                href="https://aistudio.google.com/app/u/8/usage?timeRange=last-28-days"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary flex-1 py-1 flex items-center justify-center gap-1"
                style={{ fontSize: 10, textDecoration: "none" }}
              >
                <ExternalLink size={9} /> Usage
              </a>
              <a
                href="https://aistudio.google.com/app/u/8/rate-limit?timeRange=last-28-days"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary flex-1 py-1 flex items-center justify-center gap-1"
                style={{ fontSize: 10, textDecoration: "none" }}
              >
                <ExternalLink size={9} /> Rate Limits
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Image model hint */}
      <div style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.5, padding: "4px 8px", background: "var(--bg-input)", borderRadius: 6, border: "1px solid var(--border-color)" }}>
        {safeImageModel === "dall-e-3" || safeImageModel === "gpt-image-1" || safeImageModel === "gpt-image-2"
          ? "✦ OpenAI models have best text accuracy for thumbnails"
          : safeImageModel.includes("flux") ? "✦ FLUX: very fast, great composition, weaker text"
          : "✦ Nano Banana (Gemini): creative & fast, weaker text accuracy"}
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
            <span style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>{icon} {label}</span>
          </div>
        ))}
      </div>

      {/* Recreate Reference */}
      <div>
        <label className="section-label">Recreate Reference</label>
        <div className="flex items-start gap-2">
          {state.referenceImage && <img src={state.referenceImage} alt="Reference" style={{ width: 56, height: 32, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border-color)", flexShrink: 0 }} />}
          <button className="btn-secondary px-3 py-2 text-xs flex items-center gap-2 flex-1" onClick={() => refFileRef.current?.click()} disabled={isWorking}>
            <RefreshCw size={12} />
            {state.referenceImage ? "Upload New Reference" : "Upload Reference Thumbnail"}
          </button>
          <input ref={refFileRef} type="file" accept="image/*" className="hidden" onChange={handleReferenceUpload} />
        </div>
        {state.referenceImage && (
          <button className="btn-secondary px-2 py-1 text-xs mt-1 w-full" onClick={() => dispatch({ type: "SET_REFERENCE_IMAGE", image: null })}>Clear Reference</button>
        )}
      </div>

      {/* SEO status */}
      <div className="flex gap-2 flex-wrap">
        {[state.canvasA, state.canvasB].filter((_, i) => i === 0 || state.showVariantB).map((canvas, i) =>
          seoReady(canvas) ? <span key={i} className="seo-badge">✓ Variant {i === 0 ? "A" : "B"} SEO Ready</span> : null
        )}
      </div>

      {/* ── Prompt review section ── */}
      {(step === "prompts-ready" || step === "generating-images") && (
        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-cyan)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              ✦ Review &amp; Edit Prompts
            </span>
            <button className="btn-secondary px-2 py-1 flex items-center gap-1" style={{ fontSize: 11 }}
              onClick={() => { setStep("idle"); setEditablePromptA(""); setEditablePromptB(""); }}
              disabled={step === "generating-images"}>
              <ChevronLeft size={11} /> Start Over
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="section-label" style={{ color: "var(--accent-cyan)", marginBottom: 0 }}>Variant A Prompt</label>
              <button className="btn-secondary px-2 py-1 flex items-center gap-1" style={{ fontSize: 10 }} onClick={() => copyPrompt(editablePromptA, "Prompt A")}>
                <Copy size={10} /> Copy A
              </button>
            </div>
            <textarea value={editablePromptA} onChange={e => setEditablePromptA(e.target.value)}
              className="w-full p-2 text-sm resize-y" style={{ minHeight: 80, fontSize: 12, lineHeight: 1.5 }}
              disabled={step === "generating-images"} />
          </div>

          {state.showVariantB && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="section-label" style={{ color: "var(--accent-green)", marginBottom: 0 }}>Variant B Prompt</label>
                <button className="btn-secondary px-2 py-1 flex items-center gap-1" style={{ fontSize: 10 }} onClick={() => copyPrompt(editablePromptB, "Prompt B")}>
                  <Copy size={10} /> Copy B
                </button>
              </div>
              <textarea value={editablePromptB} onChange={e => setEditablePromptB(e.target.value)}
                className="w-full p-2 text-sm resize-y" style={{ minHeight: 80, fontSize: 12, lineHeight: 1.5 }}
                disabled={step === "generating-images"} />
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <button className="btn-secondary px-3 py-2 text-xs flex items-center gap-1.5 flex-1" onClick={copyBothPrompts} disabled={step === "generating-images"}>
              <Copy size={11} /> Copy Both Prompts
            </button>
            <button
              className="btn-secondary px-3 py-2 text-xs flex items-center gap-1.5 flex-1"
              onClick={() => window.open("https://aistudio.google.com/app/prompts/new_chat", "_blank")}
            >
              <ExternalLink size={11} /> Google Playground
            </button>
          </div>

          <button className="btn-secondary px-3 py-2 text-xs flex items-center justify-center gap-2" onClick={handleGeneratePrompts} disabled={isWorking}>
            <Sparkles size={12} /> Regenerate Prompts
          </button>
        </div>
      )}

      {/* ── Sticky action buttons ── */}
      <div className="sticky bottom-0 flex flex-col gap-2" style={{ zIndex: 10, paddingTop: 4, background: "var(--bg-sidebar)" }}>
        {(step === "idle" || step === "generating-prompts") && (
          <button className="btn-primary w-full py-3 flex items-center justify-center gap-2" style={{ fontSize: 14, letterSpacing: "0.04em" }}
            onClick={handleGeneratePrompts} disabled={step === "generating-prompts"}>
            {step === "generating-prompts"
              ? <><span className="spinner" /> Writing prompts with {promptModelLabel}...</>
              : <><Sparkles size={16} /> Generate Prompts</>}
          </button>
        )}
        {(step === "prompts-ready" || step === "generating-images") && (
          <button
            className="btn-primary w-full py-3 flex items-center justify-center gap-2"
            style={{ fontSize: 14, letterSpacing: "0.04em", background: step === "generating-images" ? undefined : "var(--accent-green)" }}
            onClick={handleGenerateImages} disabled={step === "generating-images"}>
            {step === "generating-images"
              ? <><span className="spinner" /> Generating with {imageModelLabel.split(" [")[0]}...</>
              : <><Image size={16} /> Generate Thumbnails</>}
          </button>
        )}
      </div>
    </div>
  );
}
