// test-openrouter.mjs
import dotenv from "dotenv";
dotenv.config();

const start = Date.now();
const key = process.env.OPENROUTER_API_KEY;
console.log("Testing OpenRouter with key:", key?.slice(0, 15) + "...");
try {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`
    },
    body: JSON.stringify({
      model: "openrouter/free",
      messages: [{ role: "user", content: "Jawab satu kata: Halo" }]
    })
  });
  console.log("OpenRouter Status:", res.status, "in", Date.now() - start, "ms");
  const data = await res.json();
  console.log("OpenRouter Response:", JSON.stringify(data?.choices?.[0]?.message || data).slice(0, 200));
} catch (e) {
  console.error("OpenRouter failed in", Date.now() - start, "ms:", e.message);
}
