// /api/entry.js  (CommonJS for Vercel)
const OpenAI = require("openai");

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    const openai = new OpenAI({ apiKey });

    const { text } = req.body || {};
    const transcript = (text || "").toString().trim();
    if (!transcript) return res.status(400).json({ error: 'Missing "text"' });

    // Rewrite into a 70–120‑word warm mini‑story
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Rewrite terse diary notes into a 70–120 word warm, vivid mini-story. Keep it private, no names unless mentioned, and don’t give advice." },
      { role: "user", content: transcript }
      ],
      temperature: 0.7
    });
    const story = (completion.choices?.[0]?.message?.content || transcript).trim();

    // Generate an image (base64) to represent the story
    const prompt = `Cinematic, gentle illustration that represents: ${story}\nStyle: soft, modern journal poster, no text, safe for all ages.`;
    const img = await openai.images.generate({ model: "gpt-image-1", prompt, size: "1024x1024" });
    const b64 = img.data[0].b64_json;
    const imageUrl = `data:image/png;base64,${b64}`;

    res.status(200).json({ ok: true, transcript, story, imageUrl });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e?.message || "Server error" });
  }
};
