/** Third-party image generation engines: ImagineArt, SiliconFlow, Pollinations.ai */

async function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function urlToDataURL(url: string): Promise<string> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch image from URL: ${resp.status}`);
  return blobToDataURL(await resp.blob());
}

// ── ImagineArt (Vyro) ────────────────────────────────────────────────────────

export async function imagineArtGenerateImage(
  prompt: string,
  model: string,
  aspectRatio: string,
  apiKey: string
): Promise<string> {
  if (!apiKey) throw new Error("ImagineArt API key not set. Enter it in the AI panel.");

  const formData = new FormData();
  formData.append("prompt", prompt);
  formData.append("style", model);
  formData.append("aspect_ratio", aspectRatio);

  let resp: Response;
  try {
    resp = await fetch("https://api.vyro.ai/v2/image/generations", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}` },
      body: formData,
    });
  } catch (err) {
    console.error("[THUMBLAB][ImagineArt] Network error:", err);
    throw new Error(`ImagineArt network error: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!resp.ok) {
    let msg = `ImagineArt API error ${resp.status}`;
    try { const e = await resp.json(); msg += `: ${e?.message || e?.detail || JSON.stringify(e)}`; } catch {}
    console.error("[THUMBLAB][ImagineArt]", msg);
    throw new Error(msg);
  }

  const contentType = resp.headers.get("content-type") || "";
  if (contentType.startsWith("image/")) {
    return blobToDataURL(await resp.blob());
  }
  const data = await resp.json();
  console.log("[THUMBLAB][ImagineArt] response:", JSON.stringify(data).slice(0, 300));
  const imageUrl = data?.data?.[0]?.url || data?.image?.url || data?.url || data?.result;
  if (!imageUrl) throw new Error(`ImagineArt returned no image. Response: ${JSON.stringify(data).slice(0, 200)}`);
  return urlToDataURL(imageUrl);
}

// ── SiliconFlow ──────────────────────────────────────────────────────────────

const SILICONFLOW_SIZES: Record<string, string> = {
  "16:9": "1024x576",
  "9:16": "576x1024",
};

export async function siliconFlowGenerateImage(
  prompt: string,
  model: string,
  aspectRatio: string,
  apiKey: string
): Promise<string> {
  if (!apiKey) throw new Error("SiliconFlow API key not set. Enter it in the AI panel.");
  const imageSize = SILICONFLOW_SIZES[aspectRatio] || "1024x576";

  let resp: Response;
  try {
    resp = await fetch("https://api.siliconflow.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, prompt, image_size: imageSize, output_format: "png" }),
    });
  } catch (err) {
    console.error("[THUMBLAB][SiliconFlow] Network error:", err);
    throw new Error(`SiliconFlow network error: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!resp.ok) {
    let msg = `SiliconFlow API error ${resp.status}`;
    try { const e = await resp.json(); msg += `: ${e?.message || e?.error?.message || JSON.stringify(e)}`; } catch {}
    console.error("[THUMBLAB][SiliconFlow]", msg);
    throw new Error(msg);
  }

  const data = await resp.json();
  console.log("[THUMBLAB][SiliconFlow] response:", JSON.stringify(data).slice(0, 300));
  const imageUrl = data?.images?.[0]?.url;
  if (!imageUrl) throw new Error(`SiliconFlow returned no image URL. Response: ${JSON.stringify(data).slice(0, 200)}`);
  return urlToDataURL(imageUrl);
}

// ── Pollinations.ai ──────────────────────────────────────────────────────────

const POLLINATIONS_SIZES: Record<string, { width: number; height: number }> = {
  "16:9": { width: 1024, height: 576 },
  "9:16": { width: 576, height: 1024 },
};

export async function pollinationsGenerateImage(
  prompt: string,
  model: string,
  aspectRatio: string,
  apiKey: string,
  seed?: number
): Promise<string> {
  const { width, height } = POLLINATIONS_SIZES[aspectRatio] || POLLINATIONS_SIZES["16:9"];
  const randomSeed = seed ?? Math.floor(Math.random() * 999999999) + 1;
  const encodedPrompt = encodeURIComponent(prompt);

  const params = new URLSearchParams({
    model,
    width: String(width),
    height: String(height),
    seed: String(randomSeed),
    nologo: "true",
  });
  if (apiKey) params.set("key", apiKey);

  const url = `https://gen.pollinations.ai/image/${encodedPrompt}?${params.toString()}`;
  console.log("[THUMBLAB][Pollinations] URL (seed=" + randomSeed + "):", url.slice(0, 120));

  let resp: Response;
  try {
    const headers: Record<string, string> = {};
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
    resp = await fetch(url, { headers });
  } catch (err) {
    console.error("[THUMBLAB][Pollinations] Network error:", err);
    throw new Error(`Pollinations network error: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!resp.ok) {
    const msg = `Pollinations API error ${resp.status}`;
    console.error("[THUMBLAB][Pollinations]", msg);
    throw new Error(msg);
  }

  return blobToDataURL(await resp.blob());
}
