import { Check } from "lucide-react";
import { useStore } from "../store/useStore";
import type { CanvasVariant } from "../types";

interface Props {
  variant: CanvasVariant;
}

export default function SEOPanel({ variant }: Props) {
  const { state, dispatch } = useStore();
  const canvas = variant === "A" ? state.canvasA : state.canvasB;
  const { seoData } = canvas;

  const update = (k: string, v: string) =>
    dispatch({ type: "UPDATE_CANVAS_SEO", variant, seo: { [k]: v } });

  const allFilled = seoData.filenameSlug && seoData.altText && seoData.metaTags;

  const autoFillSlug = () => {
    if (!state.scriptText) return;
    const slug = state.scriptText
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(" ")
      .slice(0, 6)
      .join("-");
    update("filenameSlug", slug);
    update("videoTitle", state.scriptText.split("\n")[0].slice(0, 100));
  };

  return (
    <div className="card p-3 mt-2">
      <div className="flex items-center justify-between mb-3">
        <span className="section-label">SEO & Metadata — Variant {variant}</span>
        {allFilled && (
          <span className="seo-badge">
            <Check size={10} /> SEO Ready
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Filename Slug</label>
            <button className="text-xs" style={{ color: "var(--accent-cyan)", background: "none", border: "none", cursor: "pointer" }} onClick={autoFillSlug}>
              Auto-fill from script
            </button>
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
            placeholder="e.g. MimiKei holding a Solana coin with an explosion in the background"
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
