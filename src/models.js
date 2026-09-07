// Model AI M Putra Ramadhani
// Disesuaikan untuk project M Putra Ramadhani - Ai Indonesia

export const CURATED_FREE_MODELS = [
  {
    id: "openrouter/free",
    name: "M Putra Ramadhani Auto",
    provider: "M Putra Ramadhani",
    contextLength: "128K",
    description: "Model ringan untuk percakapan dasar sehari-hari paket Free.",
    badge: "Free",
    tier: "free",
    recommended: true,
  },
  {
    id: "nvidia/nemotron-3.5-lightning:free",
    name: "M Putra Ramadhani Lightning",
    provider: "M Putra Ramadhani",
    contextLength: "1M",
    description: "Respon super responsif & instan untuk percakapan tingkat lanjut.",
    badge: "Sangat Cepat",
    tier: "plus",
    recommended: true,
  },
  {
    id: "google/gemma-4-31b-it:free",
    name: "M Putra Ramadhani Genius 31B",
    provider: "M Putra Ramadhani",
    contextLength: "262K",
    description: "Penalaran tingkat tinggi dan kemampuan pemahaman teks mendalam.",
    badge: "Pintar & Nalar",
    tier: "plus",
    recommended: true,
  },
  {
    id: "google/gemma-4-26b-a4b-it:free",
    name: "M Putra Ramadhani Balanced 26B",
    provider: "M Putra Ramadhani",
    contextLength: "262K",
    description: "Obrolan santai seimbang, ramah, dan hemat latensi.",
    badge: "Seimbang",
    tier: "plus",
    recommended: true,
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    name: "M Putra Ramadhani Ultra 550B",
    provider: "M Putra Ramadhani",
    contextLength: "1M",
    description: "Kapasitas raksasa 550B untuk analisis mendalam & pertanyaan kompleks.",
    badge: "Kapasitas Raksasa",
    tier: "plus",
    recommended: true,
  },
  {
    id: "nvidia/nemotron-3-super-120b-a12b:free",
    name: "M Putra Ramadhani Logic 120B",
    provider: "M Putra Ramadhani",
    contextLength: "262K",
    description: "Logika analitis tangguh dan pemikiran terstruktur.",
    badge: "Logika Kuat",
    tier: "plus",
    recommended: false,
  },
  {
    id: "minimax/minimax-m3:free",
    name: "M Putra Ramadhani Chat M3",
    provider: "M Putra Ramadhani",
    contextLength: "1M",
    description: "Karakter ekspresif, hangat, dan alami untuk teman mengobrol.",
    badge: "Ekspresif",
    tier: "plus",
    recommended: true,
  },
  {
    id: "minimax/minimax-m2.7:free",
    name: "M Putra Ramadhani Creative",
    provider: "M Putra Ramadhani",
    contextLength: "196K",
    description: "Respon luwes, kreatif, dan dinamis untuk ide serta tulisan.",
    badge: "Kreatif",
    tier: "plus",
    recommended: false,
  },
  {
    id: "thinkingmachines/inkling:free",
    name: "M Putra Ramadhani Inkling",
    provider: "M Putra Ramadhani",
    contextLength: "1M",
    description: "Kemampuan interaktif serbaguna dengan konteks ultra panjang.",
    badge: "Fleksibel",
    tier: "plus",
    recommended: false,
  },
  {
    id: "thinkingmachines/inkling-small:free",
    name: "M Putra Ramadhani Lite",
    provider: "M Putra Ramadhani",
    contextLength: "1M",
    description: "Versi gesit dengan performa efisien tingkat tinggi.",
    badge: "Ringan",
    tier: "plus",
    recommended: false,
  },
  {
    id: "cohere/north-mini-code:free",
    name: "M Putra Ramadhani Code Pro",
    provider: "M Putra Ramadhani",
    contextLength: "256K",
    description: "Spesialis logika pemrograman, debugging kode, dan algoritma.",
    badge: "Kode & Logika",
    tier: "plus",
    recommended: false,
  },
  {
    id: "liquid/lfm-2.5-2.6b:free",
    name: "M Putra Ramadhani Neural Nano",
    provider: "M Putra Ramadhani",
    contextLength: "65K",
    description: "Arsitektur neural ringkas dengan efisiensi respon tingkat tinggi.",
    badge: "Efisien",
    tier: "plus",
    recommended: false,
  },
];

const STORAGE_KEY = "val_ai_selected_model";
const DEFAULT_MODEL = "openrouter/free";

export function getSavedModel() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
  } catch {}
  return DEFAULT_MODEL;
}

export function saveModel(modelId) {
  try {
    localStorage.setItem(STORAGE_KEY, modelId);
  } catch {}
}

export function findModel(modelId, customList = CURATED_FREE_MODELS) {
  const found = customList.find((m) => m.id === modelId);
  if (found) return found;
  const rawName = modelId.split("/").pop()?.replace(":free", "") || modelId;
  return {
    id: modelId,
    name: rawName.startsWith("M Putra") ? rawName : `M Putra Ramadhani ${rawName}`,
    provider: "M Putra Ramadhani",
    contextLength: "Free",
    description: "Model kecerdasan M Putra Ramadhani.",
    badge: "Free",
    tier: modelId === DEFAULT_MODEL ? "free" : "plus",
  };
}
