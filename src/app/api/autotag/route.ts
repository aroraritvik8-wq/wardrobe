import { NextResponse } from "next/server";

// OpenAI vision-capable model (cheap). gpt-4o also works if you want it sharper.
const MODEL = "gpt-4o-mini";

export async function POST(req: Request) {
  const { image } = await req.json(); // a base64 data URL of the photo
  if (!image) return NextResponse.json({ error: "no image" }, { status: 400 });

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPEN_AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 200,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are tagging ONE clothing item from its photo. Return ONLY a JSON object with these exact keys:
{"name":"...","category":"...","colour":"...","material":"...","season":"..."}
- name: a short descriptive name, 2-4 words, e.g. "Blue Denim Jacket"
- category: exactly one of: top, bottom, shoes, outerwear, dress, accessory
- colour: one common colour word, e.g. white, black, blue, beige, grey
- material: your single best guess, e.g. cotton, denim, leather, wool, polyester, knit. Always guess — never say "unknown".
- season: exactly one of: spring, summer, autumn, winter, all
Always include all five keys. No extra text.`,
            },
            { type: "image_url", image_url: { url: image } },
          ],
        },
      ],
    }),
  });

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "{}";
  let tags = {};
  try { tags = JSON.parse(text); } catch {}
  return NextResponse.json(tags);
}