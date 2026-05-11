declare global {
  interface Window {
    puter: {
      ai: {
        chat: (
          prompt: string | Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }>,
          options?: { model?: string; stream?: boolean }
        ) => Promise<any>;
        txt2img: (
          prompt: string,
          options?: { model?: string; width?: number; height?: number; testMode?: boolean }
        ) => Promise<HTMLImageElement | { src: string } | string>;
      };
    };
  }
}

/** Convert anything Puter returns from txt2img into a plain data URL.
 *  Puter v2 returns an HTMLImageElement whose src may be a Puter-domain blob URL.
 *  Loading that directly into fabric.Image.fromURL with crossOrigin:"anonymous" fails silently.
 *  Drawing via an offscreen canvas sidesteps CORS entirely. */
async function puterImageToDataURL(
  result: HTMLImageElement | { src: string } | string,
  width: number,
  height: number
): Promise<string> {
  // If it's already a data URL return it immediately
  if (typeof result === "string") {
    if (result.startsWith("data:")) return result;
    // It's a regular URL — fetch and convert
    const resp = await fetch(result);
    const blob = await resp.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Get the underlying HTMLImageElement
  const imgEl: HTMLImageElement =
    result instanceof HTMLImageElement
      ? result
      : (() => {
          const el = new Image();
          el.src = (result as { src: string }).src;
          return el;
        })();

  // Wait for it to finish loading (usually already done, but be safe)
  if (!imgEl.complete || imgEl.naturalWidth === 0) {
    await new Promise<void>((resolve, reject) => {
      imgEl.onload = () => resolve();
      imgEl.onerror = () => reject(new Error("Puter image failed to load"));
    });
  }

  const canvas = document.createElement("canvas");
  canvas.width = imgEl.naturalWidth || width;
  canvas.height = imgEl.naturalHeight || height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.drawImage(imgEl, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.92);
}

function extractText(response: any): string {
  if (typeof response === "string") return response;
  // Puter v2 shape: { message: { content: [{ text: "..." }] } }
  if (response?.message?.content) {
    const content = response.message.content;
    if (Array.isArray(content)) return content.map((c: any) => c.text || "").join("");
    if (typeof content === "string") return content;
  }
  // Fallback
  return response?.toString?.() ?? "";
}

export async function generatePrompts(
  script: string,
  nexlevNotes: string,
  brandVibe: string,
  brandColors: string,
  aspectRatio: string
): Promise<{ promptA: string; promptB: string }> {
  const systemPrompt = `You are a YouTube thumbnail expert with deep knowledge of high-CTR design.
You create compelling image prompts that maximize click-through rates.
Always respond with valid JSON only.`;

  const userPrompt = `${brandVibe ? `Visual style: ${brandVibe}. ` : ""}${brandColors ? `Color palette: ${brandColors}. ` : ""}
${script ? `Video script/title: ${script}` : "No script provided — create general high-CTR prompts."}
${nexlevNotes ? `NexLev Strategy Notes:\n${nexlevNotes}` : ""}

Generate two distinct, highly detailed image prompts for YouTube thumbnails (${aspectRatio} aspect ratio).
Prompt A should be cinematic and dramatic.
Prompt B should be high-contrast and aggressive/bold.

Return ONLY this JSON (no markdown, no preamble):
{
  "promptA": "detailed image generation prompt for variant A",
  "promptB": "detailed image generation prompt for variant B"
}`;

  const response = await window.puter.ai.chat(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { model: "claude-sonnet-4-5" }
  );

  const text = extractText(response);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Failed to parse AI response. Got: ${text.slice(0, 200)}`);
  const parsed = JSON.parse(jsonMatch[0]);
  if (!parsed.promptA || !parsed.promptB) throw new Error("AI returned incomplete prompts");
  return { promptA: parsed.promptA, promptB: parsed.promptB };
}

export async function generateImage(
  prompt: string,
  model: string,
  width: number,
  height: number
): Promise<string> {
  const result = await window.puter.ai.txt2img(prompt, { model, width, height });
  return puterImageToDataURL(result, width, height);
}

export async function analyzeReferenceImage(imageBase64: string): Promise<{
  backgroundPrompt: string;
  characterPosition: { x: number; y: number; scale: number; alignment: string };
  colors: string[];
  textContent: Array<{ text: string; position: string }>;
}> {
  const response = await window.puter.ai.chat([
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `Analyze this YouTube thumbnail. Return a JSON object with:
1. "backgroundPrompt": A detailed 200-word prompt for the background scene
2. "characterPosition": { "x": number (0-1 ratio), "y": number (0-1 ratio), "scale": number (0.5-1.5), "alignment": "left"|"center"|"right" }
3. "colors": Array of top 5 hex color codes found
4. "textContent": Array of { "text": string, "position": "top"|"center"|"bottom"|"left"|"right" }

Return ONLY valid JSON, no markdown.`,
        },
        {
          type: "image_url",
          image_url: { url: imageBase64 },
        },
      ],
    },
  ], { model: "claude-sonnet-4-5" });

  const text = extractText(response);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse vision response");
  return JSON.parse(jsonMatch[0]);
}

export async function generatePromptFromAsset(
  script: string,
  nexlevNotes: string,
  brandVibe: string,
  aspectRatio: string
): Promise<string> {
  const prompt = `${brandVibe ? `Visual style: ${brandVibe}. ` : ""}
${script ? `Video context: ${script}` : ""}
${nexlevNotes ? `Strategy notes: ${nexlevNotes}` : ""}

Generate a detailed background scene prompt for a YouTube thumbnail (${aspectRatio}).
The background should complement the subject/character that will be placed on top.
Focus on environment, lighting, atmosphere, and colors. 200+ words. Return only the prompt text.`;

  const response = await window.puter.ai.chat(prompt, { model: "claude-sonnet-4-5" });
  return extractText(response);
}

export async function generateSummaryForSEO(script: string): Promise<string> {
  const response = await window.puter.ai.chat(
    `Write a 1-2 sentence description for a YouTube video titled/about: "${script}". Return only the description.`,
    { model: "claude-sonnet-4-5" }
  );
  return extractText(response);
}
