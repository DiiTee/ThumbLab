/** Google AI Studio API via puter.net.fetch (no CORS issues) */

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

async function googleFetch(model: string, body: object, apiKey: string): Promise<any> {
  if (!apiKey) throw new Error("Google API key not set. Enter it in the AI Studio panel.");
  const endpoint = model.includes("image")
    ? `${BASE}/${model}:generateContent?key=${apiKey}`
    : `${BASE}/${model}:generateContent?key=${apiKey}`;

  let resp: Response;
  try {
    // Use puter.net.fetch to avoid CORS restrictions
    resp = await (window as any).puter.net.fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(`Google API network error: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!resp.ok) {
    let msg = `Google API error ${resp.status}`;
    try {
      const errBody = await resp.json();
      msg += `: ${errBody?.error?.message || JSON.stringify(errBody)}`;
    } catch {}
    console.error("[THUMBLAB][Google]", msg);
    throw new Error(msg);
  }

  const data = await resp.json();
  console.log("[THUMBLAB][Google] response:", JSON.stringify(data).slice(0, 500));
  return data;
}

function extractGoogleText(data: any): string {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!parts) return "";
  return parts.map((p: any) => p.text || "").join("").trim();
}

export async function googleChat(prompt: string, model: string, apiKey: string): Promise<string> {
  const data = await googleFetch(model, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  }, apiKey);
  return extractGoogleText(data);
}

export async function googleGeneratePrompts(
  script: string,
  brandVibe: string,
  brandColors: string,
  aspectRatio: string,
  model: string,
  apiKey: string
): Promise<{ promptA: string; promptB: string }> {
  const prompt = `You are a YouTube thumbnail expert. ${brandVibe ? `Visual style: ${brandVibe}. ` : ""}${brandColors ? `Colors: ${brandColors}. ` : ""}
Video script/title: ${script || "general high-CTR thumbnail"}

Generate two distinct, highly detailed image prompts for YouTube thumbnails (${aspectRatio}).
Prompt A: cinematic and dramatic.
Prompt B: high-contrast and bold.

Return ONLY this JSON (no markdown):
{"promptA":"...","promptB":"..."}`;

  const text = await googleChat(prompt, model, apiKey);
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    if (text.trim().length > 20) return { promptA: text.trim(), promptB: text.trim() };
    throw new Error(`Google returned unexpected response: ${text.slice(0, 200)}`);
  }
  const parsed = JSON.parse(match[0]);
  if (!parsed.promptA || !parsed.promptB) throw new Error("Google returned incomplete prompts");
  return parsed;
}

export async function googleSEOSummary(script: string, model: string, apiKey: string): Promise<string> {
  return googleChat(
    `Write a 1-2 sentence description for a YouTube video about: "${script}". Return only the description.`,
    model,
    apiKey
  );
}

export async function googleSEOTags(script: string, model: string, apiKey: string): Promise<string> {
  return googleChat(
    `Return ONLY a comma-separated list of 8 YouTube SEO tags (no explanation) for: "${script}"`,
    model,
    apiKey
  );
}

export async function googleGenerateImage(
  prompt: string,
  model: string,
  apiKey: string
): Promise<string> {
  const data = await googleFetch(model, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
  }, apiKey);

  const parts = data?.candidates?.[0]?.content?.parts || [];
  const imgPart = parts.find((p: any) => p.inlineData);
  if (!imgPart?.inlineData?.data) {
    throw new Error(`Google image model returned no image. Model: ${model}. Response: ${JSON.stringify(data).slice(0, 300)}`);
  }
  const mime = imgPart.inlineData.mimeType || "image/png";
  return `data:${mime};base64,${imgPart.inlineData.data}`;
}
