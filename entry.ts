// Vercel Function: /api/entry (TypeScript)
import OpenAI from 'openai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });
    const openai = new OpenAI({ apiKey });

    // Read body
    const chunks: Uint8Array[] = [];
    for await (const chunk of req) chunks.push(chunk);
    const bodyStr = Buffer.concat(chunks).toString('utf8') || '{}';
    let body: any;
    try { body = JSON.parse(bodyStr); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
    const transcriptText = (body?.text || '').toString().trim();
    if (!transcriptText) return res.status(400).json({ error: 'Missing "text"' });

    // Generate rewritten story
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Rewrite terse diary notes into a 70–120 word warm, vivid mini-story. Keep it private, no names unless present, no advice.' },
        { role: 'user', content: transcriptText }
      ],
      temperature: 0.7
    });
    const story = completion.choices[0].message.content?.trim() ?? transcriptText;

    // Generate image
    const prompt = `Cinematic, gentle illustration that represents: ${story}\nStyle: soft, modern journal poster, no text.`;
    const img = await openai.images.generate({ model: 'gpt-image-1', prompt, size: '1024x1024' });
    const b64 = img.data[0].b64_json!;
    const imageUrl = `data:image/png;base64,${b64}`;

    return res.status(200).json({ ok: true, transcript: transcriptText, story, imageUrl });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
}
