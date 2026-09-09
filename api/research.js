// Shared handler for Vercel, Express and Vite. No API key required.
const cache = new Map();
const plain = (value, limit = 6000) => String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, limit);
const INDONESIAN_MARKERS = /\b(?:dan|yang|untuk|dengan|pada|dalam|berbasis|terhadap|menggunakan|analisis|perancangan|penelitian|sistem|aplikasi|kecerdasan|penyakit)\b/i;
const isIndonesianMetadata = (item) => String(item.language || "").toLowerCase().startsWith("id") || INDONESIAN_MARKERS.test(`${item.title?.[0] || ""} ${plain(item.abstract, 900)}`);
const isInternationalMetadata = (item) => String(item.language || "").toLowerCase().startsWith("en") || /\b(?:the|and|for|with|using|analysis|system|application|research|detection|artificial)\b/i.test(`${item.title?.[0] || ""} ${plain(item.abstract, 900)}`);

export default async function research(req, res) {
  const send = (status, body) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(body));
  };
  if (req.method !== "GET") return send(405, { error: "Gunakan GET." });
  const search = new URL(req.url, "http://localhost").searchParams;
  const query = search.get("q")?.trim();
  const offset = Number(search.get("offset") || 0);
  const requestedLimit = Number(search.get("limit") || 10);
  const scope = String(search.get("scope") || "all").toLowerCase();
  if (!Number.isInteger(offset) || offset < 0 || offset >= 100) return send(400, { error: "Tahap pencarian tidak valid." });
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 100) return send(400, { error: "Jumlah jurnal harus 1–100." });
  if (!["all", "national", "international"].includes(scope)) return send(400, { error: "Jenis jurnal tidak valid." });
  const rows = Math.min(requestedLimit, 100 - offset);
  const cacheKey = JSON.stringify([query, offset]);
  if (!query || query.length < 5 || query.length > 400) return send(400, { error: "Judul/kata kunci harus 5–400 karakter." });
  const cached = cache.get(cacheKey);
  if (cached && cached.until > Date.now()) return send(200, cached.data);
  try {
    const params = new URLSearchParams({ "query.bibliographic": query, filter: "type:journal-article", rows: String(rows), offset: String(offset), sort: "relevance" });
    const response = await fetch(`https://api.crossref.org/works?${params}`, {
      headers: { Accept: "application/json", "User-Agent": "MPutraAcademicResearch/1.0" },
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) return send(response.status === 429 ? 429 : 502, { error: "Crossref sedang membatasi atau gagal melayani pencarian. Coba lagi nanti." });
    const json = await response.json();
    if (!Array.isArray(json.message?.items)) throw new Error("Invalid response");
    const seen = new Set();
    const sources = json.message.items.filter((item) => {
      if (!item.DOI || !item.title?.[0] || seen.has(item.DOI)) return false;
      if (scope === "national" && !isIndonesianMetadata(item)) return false;
      if (scope === "international" && !isInternationalMetadata(item)) return false;
      seen.add(item.DOI); return true;
    }).map((item) => ({
      doi: item.DOI, url: `https://doi.org/${encodeURIComponent(item.DOI)}`,
      title: plain(item.title[0], 600),
      authors: (item.author || []).slice(0, 30).map((a) => plain(a.name || [a.given, a.family].filter(Boolean).join(" "), 160)),
      year: item.issued?.["date-parts"]?.[0]?.[0] || null,
      journal: plain(item["container-title"]?.[0], 400),
      volume: plain(item.volume, 30), issue: plain(item.issue, 30), pages: plain(item.page, 80),
      abstract: plain(item.abstract),
      evidenceLevel: item.abstract ? "metadata-and-abstract" : "metadata-only",
      locale: isIndonesianMetadata(item) ? "national" : "international",
      fullTextRead: false,
      updates: (item["update-to"] || []).map((u) => ({ type: u.type, doi: u.DOI }))
    }));
    const nextOffset = offset + rows;
    const data = { query, scope, sources, nextOffset: nextOffset < 100 && json.message.items.length === rows ? nextOffset : null, retrievedAt: new Date().toISOString(), provider: "Crossref" };
    if (cache.size >= 100) cache.delete(cache.keys().next().value);
    cache.set(cacheKey, { until: Date.now() + 900000, data });
    return send(200, data);
  } catch {
    return send(502, { error: "Pencarian Crossref gagal atau terlalu lama. Silakan coba lagi; referensi tidak dibuat secara otomatis dari ingatan AI." });
  }
}
