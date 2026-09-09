export default async function handler(req, res) {
  // Daftar model internal tidak pernah menjadi endpoint publik.
  res.status(404).json({ error: "Endpoint tidak ditemukan." });
}
