export default async function handler(req, res) {
  const isDirectBrowserNavigation = req.headers?.["sec-fetch-dest"] === "document" || String(req.headers?.accept || "").includes("text/html");
  if (isDirectBrowserNavigation || req.method !== "GET") return res.status(404).json({ error: "Endpoint tidak ditemukan." });
  const serverKey = (process.env.MIDTRANS_SERVER_KEY || "").trim();
  if (!serverKey) return res.status(503).json({ error: "Pembayaran QRIS belum dikonfigurasi." });
  try {
    const base = (process.env.MIDTRANS_IS_PRODUCTION === "true" ? (process.env.MIDTRANS_API_URL || "") : (process.env.MIDTRANS_SANDBOX_API_URL || "")).replace(/\/$/, "");
    const headers = {
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`,
    };
    const response = await fetch(`${base}/v2/${encodeURIComponent(req.query.orderId)}/status`, { headers });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.status_message || "Gagal memeriksa pembayaran." });
    const paid = data.transaction_status === "settlement" && (!data.fraud_status || data.fraud_status === "accept");
    return res.status(200).json({ status: data.transaction_status, paid });
  } catch (error) {
    return res.status(502).json({ error: error.message || "Tidak dapat memeriksa status pembayaran." });
  }
}
