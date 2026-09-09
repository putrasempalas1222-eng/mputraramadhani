const cases = [
  { alias: "MPutraAI V5.9 Nano", base: process.env.APINEX_API_URL, key: process.env.APINEX_API_KEY, model: process.env.MODEL_MPUTRA_CEPAT },
  { alias: "MPutraAI V5.9 Speed", base: process.env.APINEX_API_URL, key: process.env.APINEX_API_KEY, model: process.env.MODEL_MPUTRA_PETIR },
  { alias: "MPutraAI V6.1 Flash", base: process.env.KIRA_API_URL, key: process.env.KIRA_API_KEY, model: process.env.MODEL_MPUTRA_V61_FLASH },
  { alias: "MPutraAI V6.2 Astras Flash", base: process.env.CEOWEB3_API_URL, key: process.env.CEOWEB3_API_KEY, model: process.env.MODEL_MPUTRA_V62_ASTRAS_FLASH },
  { alias: "MPutraAI V6.2 Trunty Flash", base: process.env.CEOWEB3_API_URL, key: process.env.CEOWEB3_API_KEY, model: process.env.MODEL_MPUTRA_V62_TRUNTY_FLASH },
];

for (const item of cases) {
  const started = Date.now();
  try {
    const response = await fetch(`${item.base.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${item.key}` },
      body: JSON.stringify({ model: item.model, stream: false, max_tokens: 80, temperature: 0, messages: [{ role: "user", content: "Tulis satu kalimat tujuan penelitian formal." }] }),
    });
    const body = await response.json().catch(() => ({}));
    const content = body.choices?.[0]?.message?.content || "";
    console.log(JSON.stringify({ alias: item.alias, status: response.status, ms: Date.now() - started, chars: content.trim().length }));
  } catch (error) {
    console.log(JSON.stringify({ alias: item.alias, status: error.name === "TimeoutError" ? 408 : 0, ms: Date.now() - started, chars: 0 }));
  }
}
