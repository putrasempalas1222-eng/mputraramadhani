async function fetchFallbackTTS(text, lang = "id") {
  const targetLang = lang === "en" ? "en" : "id";
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return null;

  const chunks = [];
  let remaining = clean;
  while (remaining.length > 0) {
    if (remaining.length <= 180) {
      chunks.push(remaining);
      break;
    }
    let splitIdx = -1;
    const searchSlice = remaining.slice(0, 180);
    const punctuationMatch = searchSlice.match(/.*[.?!,;:]\s/);
    if (punctuationMatch && punctuationMatch[0].length > 40) {
      splitIdx = punctuationMatch[0].length;
    } else {
      splitIdx = searchSlice.lastIndexOf(" ");
      if (splitIdx <= 30) splitIdx = 180;
    }
    chunks.push(remaining.slice(0, splitIdx).trim());
    remaining = remaining.slice(splitIdx).trim();
  }

  const audioBuffers = [];
  for (const chunk of chunks.slice(0, 25)) {
    if (!chunk) continue;
    try {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${targetLang}&client=tw-ob`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://translate.google.com/",
        },
      });
      if (res.ok) {
        const buf = await res.arrayBuffer();
        audioBuffers.push(Buffer.from(buf));
      }
    } catch (e) {
      console.warn("TTS fallback chunk fetch failed:", e);
    }
  }

  if (audioBuffers.length > 0) {
    return Buffer.concat(audioBuffers);
  }
  return null;
}

const exhaustedKeys = new Set();
let lastExhaustedReset = Date.now();

function checkExhaustedCacheReset() {
  if (Date.now() - lastExhaustedReset > 3600000) {
    exhaustedKeys.clear();
    lastExhaustedReset = Date.now();
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text, voiceId, gender, modelId, lang } = req.body || {};
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Teks tidak valid." });
  }

  // Mengumpulkan seluruh API key ElevenLabs dari .env (ELEVENLABS_API_KEY, ELEVENLABS_API_KEY_FALLBACK_2, 3, dst.)
  const rawKeys = [
    process.env.ELEVENLABS_API_KEY,
    process.env.ELEVENLABS_API_KEY_FALLBACK,
    ...Object.keys(process.env)
      .filter((k) => /^ELEVENLABS_API_KEY(?:_FALLBACK)?(?:_\d+)?$/i.test(k))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((k) => process.env[k]),
  ];
  const allApiKeys = [...new Set(rawKeys.map((k) => (k || "").trim()).filter(Boolean))];

  // Prioritaskan key yang masih aktif (yang belum habis kuota) di posisi terdepan
  checkExhaustedCacheReset();
  const apiKeys = [
    ...allApiKeys.filter((k) => !exhaustedKeys.has(k)),
    ...allApiKeys.filter((k) => exhaustedKeys.has(k)),
  ];

  const maleVoice = (process.env.ELEVENLABS_VOICE_ID_MALE || process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb").trim();
  const femaleVoice = (process.env.ELEVENLABS_VOICE_ID_FEMALE || "EXAVITQu4vr4xnSDxMaL").trim();
  const targetVoiceId = (voiceId || (gender === "female" ? femaleVoice : maleVoice)).trim();
  const textStr = String(text);
  const defaultShortModel = (process.env.ELEVENLABS_MODEL_ID || "eleven_flash_v2_5").trim();
  const defaultLongModel = (process.env.ELEVENLABS_MODEL_ID_LONG || "eleven_multilingual_v2").trim();
  // Jika teks > 1000 karakter, otomatis beralih ke model multilingual v2 agar seluruh teks dibaca tuntas
  const targetModel = (modelId || (textStr.length > 1000 ? defaultLongModel : defaultShortModel)).trim();

  const elevenLabsBase = (process.env.ELEVENLABS_API_URL || "").replace(/\/$/, "");

  let lastStatus = 502;
  let lastError = "Gagal memproses audio suara ElevenLabs.";

  if (elevenLabsBase && apiKeys.length > 0) {
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
          exhaustedKeys.delete(currentKey);
          console.info(`[ElevenLabs] Audio berhasil di-generate menggunakan key (${currentKey.slice(0, 10)}...)`);
          res.setHeader("Content-Type", "audio/mpeg");
          res.setHeader("Cache-Control", "no-cache");
          const buffer = await upstream.arrayBuffer();
          return res.send(Buffer.from(buffer));
        }

        const errText = await upstream.text();
        if (errText.includes("quota_exceeded") || upstream.status === 429) {
          exhaustedKeys.add(currentKey);
          console.warn(`[ElevenLabs] Key (${currentKey.slice(0, 10)}...) kuota habis. Otomatis beralih ke key ElevenLabs berikutnya.`);
        } else {
          console.warn(`[ElevenLabs] Key (${currentKey.slice(0, 10)}...) gagal [HTTP ${upstream.status}]:`, errText);
        }
        lastStatus = upstream.status;
        lastError = errText;
      } catch (err) {
        console.warn(`[ElevenLabs] Key (${currentKey.slice(0, 10)}...) network exception:`, err);
        lastError = err.message || "Network error";
      }
    }
  }

  // Fallback cadangan otomatis jika seluruh key ElevenLabs habis kuota
  try {
    const fallbackBuffer = await fetchFallbackTTS(textStr, lang);
    if (fallbackBuffer && fallbackBuffer.length > 0) {
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Cache-Control", "no-cache");
      return res.send(fallbackBuffer);
    }
  } catch (fallbackErr) {
    console.warn("Fallback TTS gagal:", fallbackErr);
  }

  return res.status(lastStatus).send(lastError);
}
