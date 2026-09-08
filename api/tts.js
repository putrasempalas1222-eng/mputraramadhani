export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text, voiceId, gender, modelId } = req.body || {};
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Teks tidak valid." });
  }

  const rawKeys = [
    process.env.ELEVENLABS_API_KEY,
    process.env.ELEVENLABS_API_KEY_FALLBACK,
    process.env.ELEVENLABS_API_KEY_FALLBACK_2,
    process.env.ELEVENLABS_API_KEY_FALLBACK_3,
    process.env.ELEVENLABS_API_KEY_FALLBACK_4,
    process.env.ELEVENLABS_API_KEY_FALLBACK_5,
    process.env.ELEVENLABS_API_KEY_FALLBACK_6,
    process.env.ELEVENLABS_API_KEY_FALLBACK_7,
    process.env.ELEVENLABS_API_KEY_FALLBACK_8,
  ];
  const apiKeys = [...new Set(rawKeys.map((k) => (k || "").trim()).filter(Boolean))];
  const maleVoice = (process.env.ELEVENLABS_VOICE_ID_MALE || process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb").trim();
  const femaleVoice = (process.env.ELEVENLABS_VOICE_ID_FEMALE || "EXAVITQu4vr4xnSDxMaL").trim();
  const targetVoiceId = (voiceId || (gender === "female" ? femaleVoice : maleVoice)).trim();
  const textStr = String(text);
  const defaultShortModel = (process.env.ELEVENLABS_MODEL_ID || "eleven_flash_v2_5").trim();
  const defaultLongModel = (process.env.ELEVENLABS_MODEL_ID_LONG || "eleven_multilingual_v2").trim();
  // Jika teks > 1000 karakter, otomatis beralih ke model multilingual v2 agar seluruh teks dibaca tuntas
  const targetModel = (modelId || (textStr.length > 1000 ? defaultLongModel : defaultShortModel)).trim();

  const elevenLabsBase = (process.env.ELEVENLABS_API_URL || "").replace(/\/$/, "");
  if (!elevenLabsBase) return res.status(500).json({ error: "ELEVENLABS_API_URL belum dikonfigurasi." });

  let lastStatus = 502;
  let lastError = "Gagal memproses audio suara ElevenLabs.";

  for (let i = 0; i < apiKeys.length; i += 1) {
    const currentKey = apiKeys[i];
    try {
      const upstream = await fetch(`${elevenLabsBase}/text-to-speech/${encodeURIComponent(targetVoiceId)}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: {
          "xi-api-key": currentKey,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg",
        },
        body: JSON.stringify({
          text: textStr.slice(0, 10000),
          model_id: targetModel,
          voice_settings: {
            stability: 0.32,
            similarity_boost: 0.82,
            style: 0.35,
            use_speaker_boost: true,
          },
        }),
      });

      if (upstream.ok) {
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Cache-Control", "no-cache");
        const buffer = await upstream.arrayBuffer();
        return res.send(Buffer.from(buffer));
      }

      const errText = await upstream.text();
      console.warn(`ElevenLabs key #${i + 1} (${currentKey.slice(0, 7)}...) failed [HTTP ${upstream.status}]:`, errText);
      lastStatus = upstream.status;
      lastError = errText;
    } catch (err) {
      console.warn(`ElevenLabs key #${i + 1} network exception:`, err);
      lastError = err.message || "Network error";
    }
  }

  return res.status(lastStatus).send(lastError);
}
