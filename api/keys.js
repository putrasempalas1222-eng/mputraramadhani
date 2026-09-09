import crypto from "node:crypto";

const toBase64Url = (value) => Buffer.from(value).toString("base64url");

async function getFirebaseUser(idToken) {
  const webApiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!webApiKey) throw new Error("FIREBASE_WEB_API_KEY belum dikonfigurasi.");

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(webApiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!response.ok) throw new Error("Sesi Firebase tidak valid.");
  const payload = await response.json();
  const user = payload?.users?.[0];
  if (!user?.localId) throw new Error("Pengguna Firebase tidak ditemukan.");
  return user;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const signingSecret = process.env.API_KEY_SIGNING_SECRET;
  if (!signingSecret || signingSecret.length < 32) {
    return res.status(503).json({ error: "Penerbitan API key belum dikonfigurasi di server." });
  }

  const authorization = String(req.headers.authorization || "");
  const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!idToken) return res.status(401).json({ error: "Login Firebase diperlukan." });

  try {
    const firebaseUser = await getFirebaseUser(idToken);
    // HMAC untuk UID yang sama selalu menghasilkan satu key yang sama.
    // Tidak ada raw secret yang disimpan di Firebase atau database lain.
    const userPart = toBase64Url(firebaseUser.localId);
    const keyPrefix = `sk-putai_${userPart}`;
    const signature = crypto.createHmac("sha256", signingSecret).update(keyPrefix).digest("base64url");
    return res.status(200).json({ apiKey: `${keyPrefix}.${signature}` });
  } catch (error) {
    return res.status(401).json({ error: error.message || "Penerbitan API key gagal." });
  }
}
