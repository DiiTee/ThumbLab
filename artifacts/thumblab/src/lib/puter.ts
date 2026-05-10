declare global {
  interface Window {
    puter: {
      ai: {
        chat: (
          prompt: string | Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }>,
          options?: { model?: string; stream?: boolean }
        ) => Promise<{ message: { content: [{ text: string }] } } | { toString: () => string }>;
        txt2img: (
          prompt: string,
          options?: { model?: string; width?: number; height?: number }
        ) => Promise<{ src: string } | string>;
      };
    };
  }
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
${script ? `Video script/title: ${script}` : ""}
${nexlevNotes ? `NexLev Strategy Notes:\n${nexlevNotes}` : ""}

Generate two distinct, highly detailed image prompts for YouTube thumbnails (${aspectRatio} aspect ratio).
Prompt A should be cinematic and dramatic.
Prompt B should be high-contrast and aggressive/bold.

Return ONLY this JSON:
{
  "promptA": "detailed image generation prompt for variant A (200+ words, cinematic, include lighting, composition, style)",
  "promptB": "detailed image generation prompt for variant B (200+ words, high-contrast, bold, include lighting, composition, style)"
}`;

  const response = await window.puter.ai.chat(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { model: "claude-sonnet-4-5" }
  );

  const text = typeof response === "string" ? response : response.message?.content?.[0]?.text || response.toString();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse AI response");
  const parsed = JSON.parse(jsonMatch[0]);
  return { promptA: parsed.promptA || "", promptB: parsed.promptB || "" };
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
  return typeof response === "string" ? response : response.message?.content?.[0]?.text || response.toString();
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

Return ONLY valid JSON.`,
        },
        {
          type: "image_url",
          image_url: { url: imageBase64 },
        },
      ],
    },
  ], { model: "claude-sonnet-4-5" });

  const text = typeof response === "string" ? response : response.message?.content?.[0]?.text || response.toString();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse vision response");
  return JSON.parse(jsonMatch[0]);
}

export async function generateSummaryForSEO(script: string): Promise<string> {
  const response = await window.puter.ai.chat(
    `Write a 1-2 sentence description for a YouTube video titled/about: "${script}". Return only the description.`,
    { model: "claude-sonnet-4-5" }
  );
  return typeof response === "string" ? response : response.message?.content?.[0]?.text || response.toString();
}

export async function generateImage(
  prompt: string,
  model: string,
  width: number,
  height: number
): Promise<string> {
  const result = await window.puter.ai.txt2img(prompt, { model, width, height });
  if (typeof result === "string") return result;
  if (result && typeof result === "object" && "src" in result) return (result as { src: string }).src;
  throw new Error("Image generation failed");
}
