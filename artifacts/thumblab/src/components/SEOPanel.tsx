import { useState } from "react";
import { Check, Loader } from "lucide-react";
import { useStore } from "../store/useStore";
import type { CanvasVariant } from "../types";
import { generateSummaryForSEO } from "../lib/puter";
import { googleSEOSummary, googleSEOTags } from "../lib/google";

interface Props {
  variant: CanvasVariant;
}

export default function SEOPanel({ variant }: Props) {
  const { state, dispatch } = useStore();
  const canvas = variant === "A" ? state.canvasA : state.canvasB;
  const { seoData } = canvas;
  const [filling, setFilling] = useState(false);

  const update = (k: string, v: string) =>
    dispatch({ type: "UPDATE_CANVAS_SEO", variant, seo: { [k]: v } });

  const allFilled = seoData.filenameSlug && seoData.altText && seoData.metaTags;

  const autoFillSlug = () => {
    if (!state.scriptText) return;
    const slug = state.scriptText.trim().toLowerCase()
      .replace(/[^a-z0-9\s]/g, "").split(" ").slice(0, 6).join("-");
    update("filenameSlug", slug);
    update("videoTitle", state.scriptText.split("\n")[0].slice(0, 100));
  };

  const autoFillWithAI = async () => {
    if (!state.scriptText || filling) return;
    if (state.engineSeo === "puter" && !window.puter) { alert("Puter.js not loaded"); return; }
    setFilling(true);
    try {
      const prompt = canvas.prompt || state.scriptText;
      const googleKey = localStorage.getItem("thumblab_google_key") || "";
      let summary: string, tags: string;

      if (state.engineSeo === "google") {
        [summary, tags] = await Promise.all([
          googleSEOSummary(prompt, state.seoModel, googleKey),
          googleSEOTags(prompt, state.seoModel, googleKey),
        ]);
      } else {
        [summary, tags] = await Promise.all([
          generateSummaryForSEO(prompt, state.seoModel),
          generateSummaryForSEO(
            `Return ONLY a comma-separated list of 8 YouTube SEO tags (no explanation) for a thumbnail about: "${prompt}"`,
            state.seoModel
          ),
        ]);
      }

      const slug = state.scriptText.trim().toLowerCase()
        .replace(/[^a-z0-9\s]/g, "").split(" ").slice(0, 6).join("-");
      update("filenameSlug", slug);
      update("videoTitle", state.scriptText.split("\n")[0].slice(0, 100));
      update("altText", summary.trim());
      update("metaTags", tags.replace(/\n/g, "").trim());
    } catch (err) {
      alert(`SEO auto-fill failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setFilling(false);
    }
  };

  const engineLabel = state.engineSeo === "google" ? "Google" : "Puter";

  return (
    <div className="card p-3 mt-2">
      <div className="flex items-center justify-between mb-3">
        <span className="section-label">SEO & Metadata — Variant {variant}</span>
        {allFilled && <span className="seo-badge"><Check size={10} /> SEO Ready</span>}
      </div>

      <div className="flex flex-col gap-2">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Filename Slug</label>
            <div className="flex items-center gap-1">
              <button
                className="btn-secondary px-2 py-1 text-xs"
                onClick={autoFillSlug}
                disabled={filling}
              >
                Quick Fill
              </button>
              <button
                className="btn-secondary px-2 py-1 text-xs flex items-center gap-1"
                style={{ color: "var(--accent-cyan)", opacity: filling ? 0.6 : 1, cursor: filling ? "wait" : "pointer" }}
                onClick={autoFillWithAI}
                disabled={filling}
              >
                {filling ? <><Loader size={10} className="animate-spin" /> Filling...</> : <>✦ AI Fill ({engineLabel})</>}
              </button>
            </div>
          </div>
          <input
            type="text"
            className="w-full px-2 py-1.5 text-xs font-mono"
            placeholder="e.g. how-to-trade-solana-memecoins"
            value={seoData.filenameSlug}
            onChange={e => update("filenameSlug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
          />
        </div>

        <div>
          <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Image Alt-Text</label>
          <textarea
            className="w-full px-2 py-1.5 text-xs resize-none"
            style={{ height: 50, fontSize: 12 }}
            placeholder="e.g. ThumbBro holding a Solana coin with an explosion in the background"
            value={seoData.altText}
            onChange={e => update("altText", e.target.value)}
          />
        </div>

        <div>
          <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Meta Tags (comma-separated)</label>
          <input
            type="text"
            className="w-full px-2 py-1.5 text-xs"
            placeholder="solana, crypto, trading, memecoins, web3"
            value={seoData.metaTags}
            onChange={e => update("metaTags", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
