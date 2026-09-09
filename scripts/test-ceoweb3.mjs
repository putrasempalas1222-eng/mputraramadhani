// test-ceoweb3.mjs
const start = Date.now();
console.log("Testing CEOWeb3 directly...");
try {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 10000);
  const res = await fetch("https://dashboard.ceoweb3.dev/v1/chat/completions", {
    method: "POST",
    signal: controller.signal,
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer CEO-Free"
    },
    body: JSON.stringify({
      model: "gemini-3.6-flash:free",
      messages: [{ role: "user", content: "hi" }]
    })
  });
  clearTimeout(t);
  console.log("CEOWeb3 Status:", res.status, "in", Date.now() - start, "ms");
  const data = await res.text();
  console.log("CEOWeb3 Response:", data.slice(0, 200));
} catch (e) {
  console.error("CEOWeb3 failed in", Date.now() - start, "ms:", e.message);
}
