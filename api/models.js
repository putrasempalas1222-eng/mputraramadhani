export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const openrouterBase = (process.env.OPENROUTER_API_URL || "").replace(/\/$/, "");
    if (!openrouterBase) throw new Error("OPENROUTER_API_URL belum dikonfigurasi.");
    const upstream = await fetch(`${openrouterBase}/models`);
    if (!upstream.ok) throw new Error("Gagal mengambil daftar model.");
    const data = await upstream.json();
    const models = (data.data || []).filter((model) =>
      model.id.endsWith(":free") ||
      model.id === "openrouter/free" ||
      (model.pricing && Number(model.pricing.prompt) === 0 && Number(model.pricing.completion) === 0)
    );
    res.status(200).json({ models });
  } catch (error) {
    res.status(502).json({ error: error.message || "Gagal mengambil model." });
  }
}
