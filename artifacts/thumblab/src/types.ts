export type AspectRatio = "16:9" | "9:16";
export type Engine = "puter" | "google";
export type ImageQuality = "low" | "medium" | "high";

// Keep as string for flexibility across both engines
export type ImageModel = string;
export type PromptModel = string;

export type SidebarTab = "ai" | "assets" | "templates";
export type CanvasVariant = "A" | "B";
export type ObjectRole = "background" | "character" | "prop" | "text" | "shape" | "logo";

export interface BrandSettings {
  primaryColor: string;
  secondaryColor: string;
  visualVibe: string;
  fontChoice: string;
  logoBase64: string | null;
  autoBranding: boolean;
  authorName: string;
}

export interface SEOData {
  filenameSlug: string;
  altText: string;
  metaTags: string;
  videoTitle: string;
}

export interface CanvasState {
  fabricJson: object | null;
  backgroundImage: string | null;
  prompt: string;
  seoData: SEOData;
}

export interface TemplateFolder {
  id: string;
  name: string;
  defaultAuthor: string;
  defaultTags: string;
  createdAt: Date;
}

export interface Template {
  id: string;
  name: string;
  folderId: string | null;
  fabricJson: object;
  backgroundBase64: string | null;
  thumbnailBase64: string | null;
  prompt: string;
  aspectRatio: AspectRatio;
  seoData: SEOData;
  createdAt: Date;
}

export interface AssetItem {
  id: string;
  name: string;
  base64: string;
  role: ObjectRole;
  createdAt: Date;
}

export interface ExportQueueItem {
  id: string;
  variant: CanvasVariant;
  imageBase64: string;
  filename: string;
  addedAt: Date;
}

export interface GenerationResult {
  variantA: string | null;
  variantB: string | null;
  promptA: string;
  promptB: string;
}

export interface AppState {
  sidebarTab: SidebarTab;
  activeVariant: CanvasVariant;
  aspectRatio: AspectRatio;
  imageModel: ImageModel;
  promptModel: PromptModel;
  seoModel: PromptModel;
  enginePrompt: Engine;
  engineSeo: Engine;
  engineImage: Engine;
  imageQuality: ImageQuality;
  scriptText: string;
  showVariantB: boolean;
  mobilePreview: boolean;
  youtubeOverlay: boolean;
  isGenerating: boolean;
  brandSettings: BrandSettings;
  nexlevTemplate: string;
  canvasA: CanvasState;
  canvasB: CanvasState;
  exportQueue: ExportQueueItem[];
  referenceImage: string | null;
  squintTest: boolean;
}

export const ASPECT_RATIOS: Record<string, { width: number; height: number; label: string }> = {
  "16:9": { width: 1280, height: 720, label: "16:9 Video [1280×720]" },
  "9:16": { width: 1080, height: 1920, label: "9:16 Shorts [1080×1920]" },
};

// ── Puter models ────────────────────────────────────────────────────────────
export const PUTER_PROMPT_MODELS: Record<string, string> = {
  "claude-sonnet-4-5": "Claude Sonnet 4.5",
  "claude-haiku-4-5": "Claude Haiku 4.5 [fast]",
  "gemini-2.5-flash": "Gemini 2.5 Flash",
  "gemini-2.0-flash": "Gemini 2.0 Flash",
  "gemini-2.0-flash-lite": "Gemini 2.0 Flash Lite [cheap]",
  "gemini-3.1-flash-lite-preview": "Gemini 3.1 Flash Lite",
};

export const PUTER_IMAGE_MODELS: Record<string, string> = {
  "dall-e-3": "DALL·E 3 [best text]",
  "gpt-image-1": "GPT Image 1",
  "gpt-image-2": "GPT Image 2 ✦ Quality",
  "black-forest-labs/flux-schnell": "FLUX Schnell [fast]",
  "gemini-2.5-flash-image-preview": "Nano Banana [Gemini]",
};

// ── Google API models ────────────────────────────────────────────────────────
export const GOOGLE_PROMPT_MODELS: Record<string, string> = {
  "gemini-2.5-pro": "Gemini 2.5 Pro",
  "gemini-2.5-flash": "Gemini 2.5 Flash",
  "gemini-2.5-flash-lite": "Gemini 2.5 Flash Lite",
  "gemini-3-flash-preview": "Gemini 3 Flash Preview",
  "gemini-3.1-flash-lite-preview": "Gemini 3.1 Flash Lite",
  "gemini-2.5-flash-lite-preview-09-2025": "Gemini 2.5 Flash Lite (Sep)",
};

export const GOOGLE_IMAGE_MODELS: Record<string, string> = {
  "gemini-2.5-flash-image": "Nano Banana [2.5 Flash]",
  "gemini-3.1-flash-image": "Nano Banana 2 [3.1 Flash]",
};

// Legacy aliases kept for old imports
export const IMAGE_MODELS = PUTER_IMAGE_MODELS;
export const PROMPT_MODELS = PUTER_PROMPT_MODELS;
export const SEO_MODELS = PUTER_PROMPT_MODELS;

export const DEFAULT_NEXLEV_TEMPLATE = `Use NexLev MCP to find 3 thumbnail outliers for: {{TOPIC}}.
Based on their success, provide:
NexLev Strategy Highlights: (Hook, Anchor, Palette).
Image Prompt A: (Detailed, cinematic 16:9 for Flux or Nano Banana).
Image Prompt B: (High-contrast, aggressive 16:9 for Flux or Nano Banana).
Format the response so I can paste it directly into my app's text area.`;

export const DEFAULT_BRAND: BrandSettings = {
  primaryColor: "#00d4ff",
  secondaryColor: "#00ff88",
  visualVibe: "",
  fontChoice: "Impact",
  logoBase64: null,
  autoBranding: true,
  authorName: "",
};

export const DEFAULT_SEO: SEOData = {
  filenameSlug: "",
  altText: "",
  metaTags: "",
  videoTitle: "",
};

export const DEFAULT_CANVAS: CanvasState = {
  fabricJson: null,
  backgroundImage: null,
  prompt: "",
  seoData: { ...DEFAULT_SEO },
};
