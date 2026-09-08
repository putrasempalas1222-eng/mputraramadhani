import QRCode from "qrcode";
import crypto from "node:crypto";

const plusPrice = Number(process.env.MIDTRANS_PLUS_PRICE || 500000);

async function paymentBreakdown(voucher, uid) {
  const requested = String(voucher || "").trim().toUpperCase();
  const databaseUrl = (process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL || "").replace(/\/$/, "");
  let issuedVoucher = null;
  if (requested && databaseUrl) {
    const response = await fetch(`${databaseUrl}/vouchers/${encodeURIComponent(requested)}.json`);
    if (response.ok) issuedVoucher = await response.json();
  }
  if (issuedVoucher) {
    const valid = issuedVoucher.status === "active" &&
      (!issuedVoucher.expiresAt || Number(issuedVoucher.expiresAt) > Date.now()) &&
      (!issuedVoucher.targetUid || issuedVoucher.targetUid === uid);
    if (!valid || issuedVoucher.type !== "discount") {
      return { voucherError: "Voucher tidak valid untuk pembayaran." };
    }
  }

  let promo = null;
  if (databaseUrl) {
    const response = await fetch(`${databaseUrl}/promos/current.json`);
    if (response.ok) promo = await response.json();
  }
  const target = String(promo?.target || "").toLowerCase();
  const allowed = target === "all" || ((target === "specific" || target === "random") && promo?.allowedUids?.[uid]);
  const globalCode = String(promo?.status || "").toLowerCase() === "active" && allowed
    ? String(promo?.promoCode || "").trim().toUpperCase()
    : (process.env.MIDTRANS_VOUCHER_CODE || "").trim().toUpperCase();
  const percent = issuedVoucher
    ? Number(issuedVoucher.discountPercent) || 0
    : globalCode && requested === globalCode
      ? Number(promo?.discountPercent ?? process.env.MIDTRANS_VOUCHER_DISCOUNT_PERCENT ?? 0)
      : 0;
  const discount = Math.round(plusPrice * Math.max(0, Math.min(100, percent)) / 100);
  const taxableAmount = plusPrice - discount;
  const tax = Math.round(taxableAmount * 0.11);
  return { subtotal: plusPrice, discount, tax, total: taxableAmount + tax, voucherApplied: discount > 0, voucherId: issuedVoucher?.id || (discount > 0 ? globalCode : null) };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const serverKey = (process.env.MIDTRANS_SERVER_KEY || "").trim();
  if (!serverKey) return res.status(503).json({ error: "Pembayaran QRIS belum dikonfigurasi." });
  const { uid, email, name, method, voucher } = req.body || {};
  if (!uid || typeof uid !== "string") return res.status(400).json({ error: "Sesi pengguna tidak valid." });
  try {
    const breakdown = await paymentBreakdown(voucher, uid);
    if (breakdown.voucherError) return res.status(400).json({ error: breakdown.voucherError });
    const base = (process.env.MIDTRANS_IS_PRODUCTION === "true" ? (process.env.MIDTRANS_API_URL || "") : (process.env.MIDTRANS_SANDBOX_API_URL || "")).replace(/\/$/, "");
    const orderId = `MPRAI-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const headers = { Accept: "application/json", "Content-Type": "application/json", Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}` };
    const paymentType = method === "gopay" ? "gopay" : "qris";
    const upstream = await fetch(`${base}/v2/charge`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        payment_type: paymentType,
        transaction_details: { order_id: orderId, gross_amount: breakdown.total },
        item_details: [{ id: "m-putra-plus-monthly", price: breakdown.total, quantity: 1, name: "Paket Plus M Putra Ramadhani (termasuk PPN)" }],
        customer_details: { first_name: String(name || "Pengguna").slice(0, 80), email: String(email || "").slice(0, 120) },
        custom_field1: uid,
      }),
    });
    const data = await upstream.json();
    if (!upstream.ok) return res.status(upstream.status).json({ error: data.status_message || "Gagal membuat tagihan." });
    const qrAction = (data.actions || []).find((action) => action.name?.includes("generate-qr-code"));
    const deepLink = (data.actions || []).find((action) => action.name === "deeplink-redirect");
    const qrDataUrl = data.qr_string ? await QRCode.toDataURL(data.qr_string, { width: 420, margin: 1, errorCorrectionLevel: "M" }) : null;
    return res.status(200).json({ orderId, transactionId: data.transaction_id, method: paymentType, qrDataUrl, qrUrl: qrAction?.url || null, deepLink: deepLink?.url || null, breakdown, expiresAt: Date.now() + 15 * 60 * 1000 });
  } catch (error) {
    return res.status(502).json({ error: error.message || "Tidak dapat terhubung ke Midtrans." });
  }
}
