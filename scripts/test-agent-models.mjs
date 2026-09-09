import chatHandler from "../api/chat.js";

const candidates = [
  "mputra/cepat",
  "mputra/petir",
  "mputra/seimbang",
  "mputra/v61-flash",
  "mputra/v62-astras-flash",
  "mputra/v62-trunty-flash",
];

function test(model) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    let status = 200;
    let output = "";
    let settled = false;
    const finish = (timedOut = false) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      const chunks = output.split("\n").filter((line) => line.startsWith("data:"));
      let content = "";
      for (const line of chunks) {
        try { content += JSON.parse(line.slice(5)).choices?.[0]?.delta?.content || ""; } catch {}
      }
      resolve({ model, status, ms: Date.now() - startedAt, chars: content.trim().length, timedOut });
    };
    const timeout = setTimeout(() => { status = 408; finish(true); }, 12000);
    const res = {
      setHeader() {},
      status(code) { status = code; return this; },
      send(value) { output += String(value || ""); finish(); },
      json(value) { output += JSON.stringify(value); finish(); },
      write(value) { output += Buffer.from(value).toString("utf8"); },
      end(value) { if (value) output += Buffer.from(value).toString("utf8"); finish(); },
    };
    chatHandler({
      method: "POST",
      body: {
        model,
        stream: true,
        max_tokens: 120,
        temperature: 0,
        messages: [{ role: "user", content: "Tulis satu kalimat formal tentang tujuan penelitian." }],
      },
    }, res).catch((error) => { status = 0; output = String(error?.message || error); finish(); });
  });
}

const results = [];
for (const model of candidates) results.push(await test(model));
console.log(JSON.stringify(results, null, 2));
