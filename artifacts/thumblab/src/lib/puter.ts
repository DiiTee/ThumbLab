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

/** Wraps a promise with a timeout — rejects if it takes longer than ms */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s. Check your Puter account is signed in and has credits.`)), ms)
    ),
  ]);
}

function extractText(response: any): string {
  // Puter returns false when not signed in or out of credits
  if (response === false || response == null) return "";
  if (typeof response === "string") return response;

  // Puter v2: { message: { content: [{text}] | string } }
  if (response?.message?.content != null) {
    const c = response.message.content;
    if (Array.isArray(c)) return c.map((x: any) => x?.text ?? x ?? "").join("");
    if (typeof c === "string") return c;
  }

  // message itself is a string
  if (typeof response?.message === "string") return response.message;

  // OpenAI style: { choices: [{ message: { content } }] }
  const oai = response?.choices?.[0]?.message?.content;
  if (typeof oai === "string") return oai;

  // Direct content / text field
  if (typeof response?.content === "string") return response.content;
  if (Array.isArray(response?.content)) {
    return response.content.map((x: any) => x?.text ?? "").join("");
  }
  if (typeof response?.text === "string") return response.text;

  // Last-resort: dump the full object so the error message is actually useful
  try { return JSON.stringify(response); } catch { return String(response); }
}

export async function generatePrompts(
  script: string,
  nexlevNotes: string,
  brandVibe: string,
  brandColors: string,
  aspectRatio: string,
  promptModel = "claude-3-5-sonnet"
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

  const response = await withTimeout(
    window.puter.ai.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { model: promptModel }
    ),
    60000,
    `${promptModel} prompt generation`
  );

  console.log("[THUMBLAB] raw puter response type:", typeof response, response === false ? "FALSE (auth/credit error)" : "");
  console.log("[THUMBLAB] raw puter response:", JSON.stringify(response)?.slice(0, 500));
  if (response === false) {
    throw new Error("Puter returned false — make sure you are signed in to Puter and have AI credits available.");
  }
  const text = extractText(response);
  console.log("[THUMBLAB] extracted text:", text.slice(0, 300));

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    // If it's not JSON, treat the whole text as a single prompt for both variants
    // (graceful degradation — better than a hard error)
    if (text.trim().length > 20) {
      return { promptA: text.trim(), promptB: text.trim() };
    }
    throw new Error(`Failed to parse AI response. Got: ${text.slice(0, 400) || "(empty — check browser console for raw response)"}`);
  }
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.promptA || !parsed.promptB) throw new Error("AI returned incomplete prompts");
    return { promptA: parsed.promptA, promptB: parsed.promptB };
  } catch (e) {
    throw new Error(`JSON parse failed. Raw: ${jsonMatch[0].slice(0, 300)}`);
  }
}

export async function generateImage(
  prompt: string,
  model: string,
  width: number,
  height: number
): Promise<string> {
  const result = await withTimeout(
    window.puter.ai.txt2img(prompt, { model }),
    120000,
    `Image generation (${model})`
  );
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
  ], { model: "claude-3-5-sonnet" });

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

  const response = await withTimeout(
    window.puter.ai.chat(prompt, { model: "claude-3-5-sonnet" }),
    60000,
    "Asset prompt generation"
  );
  return extractText(response);
}

export async function generateSummaryForSEO(script: string, promptModel = "claude-3-5-sonnet"): Promise<string> {
  const response = await withTimeout(
    window.puter.ai.chat(
      `Write a 1-2 sentence description for a YouTube video titled/about: "${script}". Return only the description.`,
      { model: promptModel }
    ),
    60000,
    "SEO summary generation"
  );
  return extractText(response);
}
