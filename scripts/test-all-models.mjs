import { CURATED_FREE_MODELS } from "../src/models.js";

console.log(`Testing ${CURATED_FREE_MODELS.length} models from CURATED_FREE_MODELS...\n`);

const results = [];

for (const model of CURATED_FREE_MODELS) {
  const t0 = Date.now();
  process.stdout.write(`Testing [${model.id}] (${model.name})... `);
  try {
    const res = await fetch("http://localhost:5174/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model.id,
        messages: [{ role: "user", content: "Halo" }],
        stream: false,
        max_tokens: 20
      }),
      signal: AbortSignal.timeout(12000)
    });

    const elapsed = Date.now() - t0;
    const text = await res.text();
    const is503 = res.status === 503;
    const isOk = res.status === 200;

    results.push({
      id: model.id,
      name: model.name,
      tier: model.tier,
      status: res.status,
      elapsed,
      ok: isOk,
      errorText: isOk ? null : text.slice(0, 100)
    });

    console.log(`Status: ${res.status} in ${elapsed}ms ${isOk ? "✅ OK" : "❌ " + text.slice(0, 50)}`);
  } catch (err) {
    const elapsed = Date.now() - t0;
    results.push({
      id: model.id,
      name: model.name,
      tier: model.tier,
      status: "TIMEOUT/ERROR",
      elapsed,
      ok: false,
      errorText: err.message
    });
    console.log(`ERROR: ${err.message} in ${elapsed}ms`);
  }
}

console.log("\n==================== SUMMARY ====================");
const working = results.filter((r) => r.ok);
const failing = results.filter((r) => !r.ok);
const errors503 = results.filter((r) => r.status === 503);

console.log(`Total models tested: ${results.length}`);
console.log(`Working models (200 OK): ${working.length}`);
console.log(`Failed models: ${failing.length}`);
console.log(`503 models: ${errors503.length}`);

console.log("\n--- FAILING / 503 MODELS ---");
for (const f of failing) {
  console.log(`- [${f.id}] Status: ${f.status} (${f.errorText})`);
}

console.log("\n--- WORKING MODELS ---");
for (const w of working) {
  console.log(`+ [${w.id}] (${w.name}) - ${w.elapsed}ms`);
}
