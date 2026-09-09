// test-dev-api-chat.mjs
const startedAt = Date.now();
try {
  const res = await fetch("http://localhost:5174/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "mputra/v62-trunty-flash",
      stream: true,
      max_tokens: 150,
      messages: [{ role: "user", content: "Jelaskan konsep dasar Machine Learning secara singkat 1 paragraf." }]
    })
  });
  console.log("Status:", res.status);
  console.log("Headers:", Object.fromEntries(res.headers.entries()));
  if (!res.ok) {
    const errText = await res.text();
    console.log("Error body:", errText);
  } else {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let chars = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      chars += text.length;
      process.stdout.write(text.slice(0, 80));
    }
    console.log(`\nSuccess! Total chars: ${chars} in ${Date.now() - startedAt}ms`);
  }
} catch (e) {
  console.error("Fetch failed:", e);
}
