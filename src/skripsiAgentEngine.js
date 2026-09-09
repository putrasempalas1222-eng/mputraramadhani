/**
 * Autonomous AI Skripsi Agent Engine
 * Manages the 13-stage lifecycle, planning, task execution, verification checkpoints,
 * retry loops, human checkpoints, and final document assembly.
 */

export const AGENT_STATUS = {
  IDLE: "IDLE",
  PLANNING: "PLANNING",
  RUNNING: "RUNNING",
  VERIFYING: "VERIFYING",
  WAITING_USER_INPUT: "WAITING_USER_INPUT", // e.g. Stage 2 Title selection
  WAITING_FOR_USER_DATA: "WAITING_FOR_USER_DATA", // e.g. Stage 7 Data upload
  PAUSED: "PAUSED",
  ERROR: "ERROR",
  AUDITING: "AUDITING",
  COMPLETED: "COMPLETED"
};

export const TASK_STATUS = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  VERIFYING: "VERIFYING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED"
};

export const MAX_RETRY = 3;

export const INITIAL_STAGES = [
  {
    id: 1,
    key: "STAGE_1",
    name: "Research Planning",
    desc: "Analisis topik, perumusan problem statement, identifikasi objek, dan penentuan metode riset.",
    tasks: [
      { id: "s1_t1", title: "Analisis Topik & Lingkup Kajian", status: TASK_STATUS.PENDING },
      { id: "s1_t2", title: "Identifikasi Masalah & Fenomena Empiris", status: TASK_STATUS.PENDING },
      { id: "s1_t3", title: "Identifikasi Objek & Konteks Penelitian", status: TASK_STATUS.PENDING },
      { id: "s1_t4", title: "Perumusan Tujuan Riset & Kontribusi Ilmiah", status: TASK_STATUS.PENDING },
      { id: "s1_t5", title: "Identifikasi Kebutuhan Data Penelitian", status: TASK_STATUS.PENDING },
      { id: "s1_t6", title: "Menentukan Rekomendasi Metode Riset", status: TASK_STATUS.PENDING }
    ]
  },
  {
    id: 2,
    key: "STAGE_2",
    name: "Judul & Research Problem",
    desc: "Formulasi judul skripsi terukur, analisis variabel, dan pemilihan judul resmi oleh peneliti.",
    isHumanCheckpoint: true, // User selects or customizes final title
    tasks: [
      { id: "s2_t1", title: "Generate 3-5 Alternatif Judul Skripsi Terukur", status: TASK_STATUS.PENDING },
      { id: "s2_t2", title: "Analisis Variabel Bebas, Terikat & Indikator", status: TASK_STATUS.PENDING },
      { id: "s2_t3", title: "Identifikasi Lokus & Objek Penelitian Spesifik", status: TASK_STATUS.PENDING },
      { id: "s2_t4", title: "Validasi Kelayakan Riset & Novelty", status: TASK_STATUS.PENDING },
      { id: "s2_t5", title: "Konfirmasi Judul Final oleh Peneliti", status: TASK_STATUS.PENDING, requiresUser: true }
    ]
  },
  {
    id: 3,
    key: "STAGE_3",
    name: "BAB I: Pendahuluan",
    desc: "Penyusunan naskah Bab 1 lengkap (Latar Belakang, Rumusan, Batasan, Tujuan, Manfaat, Sistematika).",
    tasks: [
      { id: "s3_t1", title: "1.1 Latar Belakang Masalah (Alur Piramida Terbalik)", status: TASK_STATUS.PENDING },
      { id: "s3_t2", title: "1.2 Identifikasi & Rumusan Masalah (3 Butir Terukur)", status: TASK_STATUS.PENDING },
      { id: "s3_t3", title: "1.3 Batasan Masalah & Lingkup Penelitian", status: TASK_STATUS.PENDING },
      { id: "s3_t4", title: "1.4 Tujuan Penelitian (Sinkron dengan Rumusan)", status: TASK_STATUS.PENDING },
      { id: "s3_t5", title: "1.5 Manfaat Penelitian (Teoritis & Praktis)", status: TASK_STATUS.PENDING },
      { id: "s3_t6", title: "1.6 Sistematika Penulisan Skripsi", status: TASK_STATUS.PENDING },
      { id: "s3_t7", title: "Konsistensi Check Internal BAB I", status: TASK_STATUS.PENDING }
    ]
  },
  {
    id: 4,
    key: "STAGE_4",
    name: "Literature Research & Citations",
    desc: "Pencarian literatur jurnal bereputasi 5-10 tahun terakhir, sintesis studi empiris, dan research gap.",
    tasks: [
      { id: "s4_t1", title: "Menentukan Kata Kunci Pencarian Literatur", status: TASK_STATUS.PENDING },
      { id: "s4_t2", title: "Kompilasi Studi Empiris 5-10 Tahun Terakhir", status: TASK_STATUS.PENDING },
      { id: "s4_t3", title: "Sintesis Temuan & Metodologi Penelitian Terdahulu", status: TASK_STATUS.PENDING },
      { id: "s4_t4", title: "Pemetaan Research Gap & Posisi Kebaruan Riset", status: TASK_STATUS.PENDING },
      { id: "s4_t5", title: "Katalogisasi Sitasi & Referensi Awal", status: TASK_STATUS.PENDING }
    ]
  },
  {
    id: 5,
    key: "STAGE_5",
    name: "BAB II: Tinjauan Pustaka",
    desc: "Landasan teori komprehensif, konsep variabel, tabel penelitian terdahulu, kerangka berpikir, hipotesis.",
    tasks: [
      { id: "s5_t1", title: "2.1 Landasan Teori Variabel Penelitian", status: TASK_STATUS.PENDING },
      { id: "s5_t2", title: "2.2 Landasan Teori Metode / Teknologi Terapan", status: TASK_STATUS.PENDING },
      { id: "s5_t3", title: "2.3 Tinjauan Penelitian Terdahulu (Tabel Komparasi)", status: TASK_STATUS.PENDING },
      { id: "s5_t4", title: "2.4 Kerangka Berpikir Konseptual (Bagan Alur)", status: TASK_STATUS.PENDING },
      { id: "s5_t5", title: "2.5 Hipotesis Penelitian / Proposisi Ilmiah", status: TASK_STATUS.PENDING },
      { id: "s5_t6", title: "Verifikasi Validitas Sitasi & Konsistensi Teori", status: TASK_STATUS.PENDING }
    ]
  },
  {
    id: 6,
    key: "STAGE_6",
    name: "BAB III: Metodologi Penelitian",
    desc: "Desain riset, populasi & sampel, definisi operasional variabel, instrumen riset, teknik pengumpulan & analisis.",
    tasks: [
      { id: "s6_t1", title: "3.1 Desain & Pendekatan Penelitian", status: TASK_STATUS.PENDING },
      { id: "s6_t2", title: "3.2 Tempat, Waktu & Jadwal Penelitian", status: TASK_STATUS.PENDING },
      { id: "s6_t3", title: "3.3 Populasi & Teknik Pengambilan Sampel", status: TASK_STATUS.PENDING },
      { id: "s6_t4", title: "3.4 Definisi Operasional & Indikator Variabel", status: TASK_STATUS.PENDING },
      { id: "s6_t5", title: "3.5 Instrumen Riset & Uji Validitas/Reliabilitas", status: TASK_STATUS.PENDING },
      { id: "s6_t6", title: "3.6 Prosedur Pengumpulan Data Penelitian", status: TASK_STATUS.PENDING },
      { id: "s6_t7", title: "3.7 Teknik Analisis Data & Uji Statistik/Algoritma", status: TASK_STATUS.PENDING }
    ]
  },
  {
    id: 7,
    key: "STAGE_7",
    name: "Data Collection",
    desc: "Pemeriksaan ketersediaan data riset. Agen berhenti jika data riil wajib dari peneliti belum tersedia.",
    isHumanCheckpoint: true, // User provides research dataset or acknowledges sample dataset
    tasks: [
      { id: "s7_t1", title: "Identifikasi Spesifikasi Dataset Riset yang Wajib Ada", status: TASK_STATUS.PENDING },
      { id: "s7_t2", title: "Penerimaan & Upload Dataset Penelitian oleh Peneliti", status: TASK_STATUS.PENDING, requiresUser: true },
      { id: "s7_t3", title: "Validasi Struktur, Format & Integritas Data", status: TASK_STATUS.PENDING },
      { id: "s7_t4", title: "Kompilasi Data Bersih Siap Analisis", status: TASK_STATUS.PENDING }
    ]
  },
  {
    id: 8,
    key: "STAGE_8",
    name: "Data Analysis",
    desc: "Pembersihan data, kalkulasi statistik/tematik riil dari dataset tanpa mengarang angka fiktif.",
    tasks: [
      { id: "s8_t1", title: "Pembersihan Data (Data Cleaning & Normalization)", status: TASK_STATUS.PENDING },
      { id: "s8_t2", title: "Perhitungan Statistik / Analisis Tematik Riil", status: TASK_STATUS.PENDING },
      { id: "s8_t3", title: "Pembuatan Tabel Hasil Uji & Tabulasi Komparatif", status: TASK_STATUS.PENDING },
      { id: "s8_t4", title: "Verifikasi Keaslian Angka Terhadap Dataset Asli", status: TASK_STATUS.PENDING }
    ]
  },
  {
    id: 9,
    key: "STAGE_9",
    name: "BAB IV: Hasil & Pembahasan",
    desc: "Paparan deskripsi objek, hasil analisis empiris, pembahasan teori, serta konfirmasi hipotesis.",
    tasks: [
      { id: "s9_t1", title: "4.1 Gambaran Umum Objek Penelitian", status: TASK_STATUS.PENDING },
      { id: "s9_t2", title: "4.2 Hasil Pengujian Data & Paparan Temuan", status: TASK_STATUS.PENDING },
      { id: "s9_t3", title: "4.3 Tabulasi Data, Grafik & Interpretasi", status: TASK_STATUS.PENDING },
      { id: "s9_t4", title: "4.4 Pembahasan Temuan Mengaitkan ke Teori Bab 2", status: TASK_STATUS.PENDING },
      { id: "s9_t5", title: "4.5 Implikasi Manajerial/Teoritis & Limitasi Riset", status: TASK_STATUS.PENDING },
      { id: "s9_t6", title: "Cross-Check Angka Bab IV dengan Dataset Asli", status: TASK_STATUS.PENDING }
    ]
  },
  {
    id: 10,
    key: "STAGE_10",
    name: "BAB V: Kesimpulan & Saran",
    desc: "Menjawab seluruh poin rumusan masalah secara lugas dan memberikan rekomendasi praktis.",
    tasks: [
      { id: "s10_t1", title: "5.1 Kesimpulan (Menjawab Tuntas Seluruh Rumusan Masalah)", status: TASK_STATUS.PENDING },
      { id: "s10_t2", title: "5.2 Saran Akademik & Rekomendasi Aplikatif", status: TASK_STATUS.PENDING },
      { id: "s10_t3", title: "Verifikasi Konsistensi Tripartit (Rumusan ↔ Hasil ↔ Kesimpulan)", status: TASK_STATUS.PENDING }
    ]
  },
  {
    id: 11,
    key: "STAGE_11",
    name: "References",
    desc: "Kompilasi daftar pustaka format APA 7th / IEEE, verifikasi konsistensi sitasi, eliminasi rujukan fiktif.",
    tasks: [
      { id: "s11_t1", title: "Kompilasi Seluruh Sitasi yang Muncul di Naskah", status: TASK_STATUS.PENDING },
      { id: "s11_t2", title: "Penerapan Format Sitasi Standar APA 7th Edition", status: TASK_STATUS.PENDING },
      { id: "s11_t3", title: "Deteksi & Eliminasi Sitasi Yatim / Rujukan Tanpa Sitasi", status: TASK_STATUS.PENDING },
      { id: "s11_t4", title: "Validasi Final Kelayakan Daftar Pustaka", status: TASK_STATUS.PENDING }
    ]
  },
  {
    id: 12,
    key: "STAGE_12",
    name: "Final Audit Gate",
    desc: "Audit ketat menyeluruh terhadap seluruh naskah BAB I-V, data, sitasi, dan konsistensi sebelum membuka DOCX.",
    tasks: [
      { id: "s12_t1", title: "Audit Kelengkapan Struktur Naskah BAB I - V", status: TASK_STATUS.PENDING },
      { id: "s12_t2", title: "Audit Konsistensi Logika & Koherensi Antar Bab", status: TASK_STATUS.PENDING },
      { id: "s12_t3", title: "Audit Integritas Data & Anti-Halusinasi", status: TASK_STATUS.PENDING },
      { id: "s12_t4", title: "Audit Ragam Bahasa Baku EYD V & Tanpa Klise", status: TASK_STATUS.PENDING },
      { id: "s12_t5", title: "Penerbitan Sertifikat Kelulusan Final Audit Gate", status: TASK_STATUS.PENDING }
    ]
  },
  {
    id: 13,
    key: "STAGE_13",
    name: "DOCX Generation",
    desc: "Kompilasi dokumen final berstandar resmi (Cover, Lembar Pengesahan, Abstrak, Bab I-V, Daftar Pustaka).",
    tasks: [
      { id: "s13_t1", title: "Penyusunan Cover, Lembar Pengesahan & Abstrak", status: TASK_STATUS.PENDING },
      { id: "s13_t2", title: "Penyusunan Kata Pengantar & Daftar Isi", status: TASK_STATUS.PENDING },
      { id: "s13_t3", title: "Kompilasi Naskah Utuh Berstandar Dikti", status: TASK_STATUS.PENDING },
      { id: "s13_t4", title: "Pembuatan File Microsoft Word Final (.docx)", status: TASK_STATUS.PENDING }
    ]
  }
];

export function createInitialAgentState(projectTopic = "") {
  return {
    topic: projectTopic,
    title: "",
    titleOptions: [],
    studentName: "M PUTRA RAMADHANI",
    university: "UNIVERSITAS INDONESIA",
    department: "PROGRAM STUDI AKADEMIK",
    year: new Date().getFullYear(),
    currentStageIndex: 0,
    currentTaskId: null,
    status: AGENT_STATUS.IDLE,
    retryCount: 0,
    datasetInfo: null,
    stages: JSON.parse(JSON.stringify(INITIAL_STAGES)),
    documentState: {
      abstrak: "",
      kataPengantar: "",
      bab1: "",
      bab2: "",
      bab3: "",
      bab4: "",
      bab5: "",
      pustaka: "",
      rawDataNotes: ""
    },
    logs: [
      {
        at: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }),
        type: "system",
        message: "AI Skripsi Agent diinisialisasi. Siap menganalisis topik dan menyusun planning."
      }
    ],
    auditReport: {
      passed: false,
      checks: [
        { label: "Kelengkapan BAB I", passed: false },
        { label: "Kelengkapan BAB II", passed: false },
        { label: "Kelengkapan BAB III", passed: false },
        { label: "Kelengkapan BAB IV", passed: false },
        { label: "Kelengkapan BAB V", passed: false },
        { label: "Konsistensi Rumusan Masalah vs Kesimpulan", passed: false },
        { label: "Integritas Dataset & Nilai Temuan", passed: false },
        { label: "Validitas Sitasi & Daftar Pustaka", passed: false },
        { label: "Standar Bahasa EYD V Bebas Klise", passed: false }
      ]
    },
    docxReady: false
  };
}

const STORAGE_KEY = "val_ai_skripsi_autonomous_state";

export function loadSavedAgentState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn("Gagal membaca saved state agent:", err);
    return null;
  }
}

export function persistAgentState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("Gagal menyimpan state agent:", err);
  }
}

export function clearAgentState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
