import { createContext, useContext, useReducer, Dispatch } from "react";
import type {
  AppState, SidebarTab, CanvasVariant, AspectRatio, ImageModel, PromptModel,
  BrandSettings, SEOData, ExportQueueItem, CanvasState
} from "../types";
import { DEFAULT_BRAND, DEFAULT_SEO, DEFAULT_CANVAS, DEFAULT_NEXLEV_TEMPLATE } from "../types";

const savedNexlev = localStorage.getItem("thumblab_nexlev");
const savedBrand = localStorage.getItem("thumblab_brand");
const savedBrandParsed: BrandSettings = savedBrand ? JSON.parse(savedBrand) : DEFAULT_BRAND;

export const initialState: AppState = {
  sidebarTab: "ai",
  activeVariant: "A",
  aspectRatio: "16:9",
  imageModel: "dall-e-3",
  promptModel: "claude-sonnet-4-5" as PromptModel,
  seoModel: "gemini-2.0-flash" as PromptModel,
  scriptText: "",
  showVariantB: true,
  mobilePreview: false,
  youtubeOverlay: false,
  isGenerating: false,
  brandSettings: savedBrandParsed,
  nexlevTemplate: savedNexlev || DEFAULT_NEXLEV_TEMPLATE,
  canvasA: { ...DEFAULT_CANVAS },
  canvasB: { ...DEFAULT_CANVAS },
  exportQueue: [],
  referenceImage: null,
  squintTest: false,
};

export type Action =
  | { type: "SET_TAB"; tab: SidebarTab }
  | { type: "SET_ACTIVE_VARIANT"; variant: CanvasVariant }
  | { type: "SET_ASPECT_RATIO"; ratio: AspectRatio }
  | { type: "SET_IMAGE_MODEL"; model: ImageModel }
  | { type: "SET_PROMPT_MODEL"; model: PromptModel }
  | { type: "SET_SEO_MODEL"; model: PromptModel }
  | { type: "SET_SCRIPT"; text: string }
  | { type: "TOGGLE_VARIANT_B" }
  | { type: "TOGGLE_MOBILE_PREVIEW" }
  | { type: "TOGGLE_YOUTUBE_OVERLAY" }
  | { type: "SET_GENERATING"; value: boolean }
  | { type: "UPDATE_BRAND"; settings: Partial<BrandSettings> }
  | { type: "SET_NEXLEV_TEMPLATE"; template: string }
  | { type: "SET_CANVAS_IMAGE"; variant: CanvasVariant; imageUrl: string; prompt: string }
  | { type: "SET_CANVAS_JSON"; variant: CanvasVariant; json: object }
  | { type: "UPDATE_CANVAS_SEO"; variant: CanvasVariant; seo: Partial<SEOData> }
  | { type: "ADD_TO_QUEUE"; item: ExportQueueItem }
  | { type: "REMOVE_FROM_QUEUE"; id: string }
  | { type: "CLEAR_QUEUE" }
  | { type: "SET_EXPORT_QUEUE"; items: ExportQueueItem[] }
  | { type: "SET_REFERENCE_IMAGE"; image: string | null }
  | { type: "TOGGLE_SQUINT" }
  | { type: "RESET_CANVAS"; variant: CanvasVariant };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_TAB": return { ...state, sidebarTab: action.tab };
    case "SET_ACTIVE_VARIANT": return { ...state, activeVariant: action.variant };
    case "SET_ASPECT_RATIO": return { ...state, aspectRatio: action.ratio };
    case "SET_IMAGE_MODEL": return { ...state, imageModel: action.model };
    case "SET_PROMPT_MODEL": return { ...state, promptModel: action.model };
    case "SET_SEO_MODEL": return { ...state, seoModel: action.model };
    case "SET_SCRIPT": return { ...state, scriptText: action.text };
    case "TOGGLE_VARIANT_B": return { ...state, showVariantB: !state.showVariantB };
    case "TOGGLE_MOBILE_PREVIEW": return { ...state, mobilePreview: !state.mobilePreview };
    case "TOGGLE_YOUTUBE_OVERLAY": return { ...state, youtubeOverlay: !state.youtubeOverlay };
    case "SET_GENERATING": return { ...state, isGenerating: action.value };
    case "UPDATE_BRAND": {
      const updated = { ...state.brandSettings, ...action.settings };
      localStorage.setItem("thumblab_brand", JSON.stringify(updated));
      return { ...state, brandSettings: updated };
    }
    case "SET_NEXLEV_TEMPLATE":
      localStorage.setItem("thumblab_nexlev", action.template);
      return { ...state, nexlevTemplate: action.template };
    case "SET_CANVAS_IMAGE": {
      const canvas = action.variant === "A" ? "canvasA" : "canvasB";
      return {
        ...state,
        [canvas]: {
          ...state[canvas],
          backgroundImage: action.imageUrl,
          prompt: action.prompt,
        },
      };
    }
    case "SET_CANVAS_JSON": {
      const canvas = action.variant === "A" ? "canvasA" : "canvasB";
      return { ...state, [canvas]: { ...state[canvas], fabricJson: action.json } };
    }
    case "UPDATE_CANVAS_SEO": {
      const canvas = action.variant === "A" ? "canvasA" : "canvasB";
      return {
        ...state,
        [canvas]: { ...state[canvas], seoData: { ...state[canvas].seoData, ...action.seo } },
      };
    }
    case "ADD_TO_QUEUE":
      return { ...state, exportQueue: [...state.exportQueue, action.item] };
    case "REMOVE_FROM_QUEUE":
      return { ...state, exportQueue: state.exportQueue.filter(i => i.id !== action.id) };
    case "CLEAR_QUEUE":
      return { ...state, exportQueue: [] };
    case "SET_EXPORT_QUEUE":
      return { ...state, exportQueue: action.items };
    case "SET_REFERENCE_IMAGE":
      return { ...state, referenceImage: action.image };
    case "TOGGLE_SQUINT":
      return { ...state, squintTest: !state.squintTest };
    case "RESET_CANVAS": {
      const canvas = action.variant === "A" ? "canvasA" : "canvasB";
      return { ...state, [canvas]: { ...DEFAULT_CANVAS } };
    }
    default: return state;
  }
}

export const StoreContext = createContext<{
  state: AppState;
  dispatch: Dispatch<Action>;
} | null>(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export { reducer };
