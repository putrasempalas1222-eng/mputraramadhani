import React, { useState, useEffect, useRef } from "react";
import brandLogo from "./logo/logo-mputraramadhani.png";
import { generateAcademicSkripsiDocx, downloadBlob } from "./docxGenerator";
import ChatMessageBody from "./ChatMessageBody";
import "./skripsiLoading.css";

const API_CHAT_URL = "/api/chat";
// Jalur utama akademik memakai model ringan yang telah lolos uji respons streaming.
// Jika penyedia utamanya sedang penuh, server otomatis meneruskan ke cadangan.
// Gunakan model Thinking asli agar alur pemikiran AI ditampilkan secara nyata
const AGENT_FAST_MODEL = "mputra/v61-gratis";
const AGENT_RESPONSE_TIMEOUT_MS = 35000;

const stripProviderSafetyMetadata = (content = "") => {
  if (!content) return "";

  let text = String(content).replace(/\r\n?/g, "\n");

  // Hapus baris safety / moderation metadata dari provider
  text = text.replace(
    /(?:^|\n)\s*(?:User\s*Safety|Content\s*Safety)\s*:\s*(?:safe|unsafe|pass|neutral|ok|true|false)\s*[^\n]*/gi,
    ""
  );

  text = text.replace(
    /(?:^|\n)\s*(?:Safety\s+Categories?|Categories?|Classification|Moderation)\s*:\s*[^\n]*/gi,
    ""
  );

  text = text.replace(
    /(?:^|\n)\s*Response\s+Safety\s*:?\s*(?:\(.*?\))?\s*[^\n]*/gi,
    ""
  );

  text = text.replace(
    /(?:^|\n)\s*No\s+Response\s+Safety\s+line\.?\s*/gi,
    ""
  );

  // Hapus placeholder tag
  text = text.replace(/\[(?:Reasoning|Analysis|Thinking)\]/gi, "");

  // Hapus bullet kosong
  text = text.replace(/^\s*(?:\d+\.|[-*•])\s*$/gm, "");

  // Batasi maksimal 2 baris kosong beruntun
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
};



function PencilIcon({ className = "" }) {
  return (
    <svg
      className={className}
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function ThinkingIcon({ className = "" }) {
  return (
    <svg
      className={className}
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04z" />
    </svg>
  );
}

function ChevronDownIcon({ className = "" }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

const SUGGESTIONS = [
  {
    label: "Sistem Monitoring Proyek (GitLab API)",
    full: "Sistem Monitoring Proyek berbasis GitLab API untuk Evaluasi Produktivitas Tim"
  },
  {
    label: "Analisis Sentimen Publik (Model BERT)",
    full: "Analisis Sentimen Publik terhadap Layanan Publik Menggunakan Model BERT"
  },
  {
    label: "Implementasi CI/CD Pipeline Startup",
    full: "Implementasi Continuous Integration dan Deployment (CI/CD) pada Infrastruktur Startup"
  },
  {
    label: "Sistem Pakar Diagnosa Medis (AI)",
    full: "Perancangan Aplikasi Diagnosa Penyakit Menggunakan Kecerdasan Buatan"
  }
];

export default function SkripsiAgentDashboard({
  ComposerComponent,
  user,
  userProfile,
  userPlan = "free",
  onUpgrade,
  onUpdateAgentsUsage,
  t,
  lang = "id",
  selectedModel = "mputra/v61-auto",
  onSelectModel
}) {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem("val_ai_skripsi_chat_history");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((m) => m.id !== "init_msg");
          if (filtered.length > 0) return filtered;
        }
      }
    } catch {}
    return [];
  });

  const [input, setInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [docxBlob, setDocxBlob] = useState(null);
  const [docChapters, setDocChapters] = useState({
    title: "",
    bab1: "",
    bab2: "",
    bab3: "",
    bab4: "",
    bab5: "",
    pustaka: ""
  });

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // Simpan history obrolan & kelola sinkronisasi otak agents
  useEffect(() => {
    try {
      if (messages.length === 0) {
        // Chat kosong atau di-reset: bersihkan SELURUH otak dan memori agent
        localStorage.removeItem("val_ai_skripsi_chat_history");
        localStorage.removeItem("skripsi_project_v2");
        sessionStorage.removeItem("val_ai_skripsi_chat_history");
        sessionStorage.removeItem("skripsi_project_v2");
        project.current = { stage: 0, title: "", chapters: {}, evidence: "", pendingDraft: null, sources: [], sourceOffset: null, sectionIndex: 0 };
        setDocChapters({ title: "", bab1: "", bab2: "", bab3: "", bab4: "", bab5: "", pustaka: "" });
        setResearchSources([]);
        setDocxBlob(null);
        setLiveDraft("");
        setLiveReasoning("");
        setActivity("");
        setAgentMode("idle");
      } else {
        localStorage.setItem("val_ai_skripsi_chat_history", JSON.stringify(messages));
      }
    } catch {}
  }, [messages]);

  // Auto scroll ke bawah
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isRunning]);

  const [activity, setActivity] = useState("");
  const [agentMode, setAgentMode] = useState("thinking"); // "thinking" | "writing" | "idle"
  const [isContentOpen, setIsContentOpen] = useState(true);
  const [liveDraft, setLiveDraft] = useState("");
  const [workTab, setWorkTab] = useState("draft");
  const [liveReasoning, setLiveReasoning] = useState("");
  const [expandedThoughts, setExpandedThoughts] = useState({});
  const toggleThought = (id) => {
    setExpandedThoughts((prev) => ({ ...prev, [id]: prev[id] === false ? true : false }));
  };
  const latestReasoningRef = useRef("");
  const draftView = useRef(null);
  useEffect(() => {
    const node = draftView.current;
    if (node && node.scrollHeight - node.scrollTop - node.clientHeight < 180) node.scrollTop = node.scrollHeight;
  }, [liveDraft]);
  const currentAttachments = useRef([]);
  const [researchSources, setResearchSources] = useState([]);
  const runController = useRef(null);
  const project = useRef({ stage: 0, title: "", chapters: {}, evidence: "" });
  useEffect(() => {
    try {
      if (messages.length === 0) {
        localStorage.removeItem("skripsi_project_v2");
        localStorage.removeItem("val_ai_skripsi_chat_history");
        sessionStorage.removeItem("skripsi_project_v2");
        sessionStorage.removeItem("val_ai_skripsi_chat_history");
        project.current = { stage: 0, title: "", chapters: {}, evidence: "", pendingDraft: null, sources: [], sourceOffset: null, sectionIndex: 0 };
        setDocChapters({ title: "", bab1: "", bab2: "", bab3: "", bab4: "", bab5: "", pustaka: "" });
        setResearchSources([]);
      } else {
        const saved = JSON.parse(localStorage.getItem("skripsi_project_v2") || "null");
        if (saved) {
          project.current = saved;
          setDocChapters({ title: saved.title, ...saved.chapters });
          setResearchSources(saved.sources || []);
        }
      }
    } catch {}
    return () => {
      runController.current?.abort();
    };
  }, []);
  const saveProject = () => {
    if (!project.current.title && Object.keys(project.current.chapters || {}).length === 0) {
      return;
    }
    localStorage.setItem("skripsi_project_v2", JSON.stringify(project.current));
    setDocChapters({ title: project.current.title, ...project.current.chapters });
    setDocxBlob(null);
  };

  const addAssistantMessage = (content, extras = {}) => {
    const cleanedContent = stripProviderSafetyMetadata(content);
    const rawReasoning = extras.reasoning !== undefined
      ? extras.reasoning
      : (latestReasoningRef.current || liveReasoning || undefined);
    const reasoningToSave = rawReasoning ? stripProviderSafetyMetadata(rawReasoning) : undefined;
    setMessages((prev) => [...prev, {
      id: crypto.randomUUID(), role: "assistant",
      at: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      content: cleanedContent || "Respons AI belum memuat uraian teks. Referensi yang ditemukan tetap tersedia untuk ditinjau di bawah ini.",
      reasoning: reasoningToSave,
      ...extras
    }]);
  };


  // ─────────────────────────────────────────────────────────────────────────
  // FASE 1: ANALISIS NIAT — stream hasil berpikir ke panel Thinking
  // ─────────────────────────────────────────────────────────────────────────
  const callAiAnalysis = async (userPrompt, contextPrompt = "") => {
    setLiveReasoning("");
    setLiveDraft("");
    setAgentMode("thinking");
    setIsContentOpen(true);
    setWorkTab("draft");

    const requestController = new AbortController();
    const cancelRequest = () => requestController.abort();
    runController.current.signal.addEventListener("abort", cancelRequest, { once: true });
    let timeoutId = null;
    const resetTimeout = (ms = 30000) => {
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => { requestController.abort(); }, ms);
    };
    resetTimeout(30000);

    // Model instruksi cepat & presisi agar menghasilkan analisis penalaran Bahasa Indonesia yang langsung rapi & tuntas
    const analysisModels = [
      AGENT_FAST_MODEL,
      "mputra/v61-maya",
      "mputra/v61-flash",
      "mputra/v62-astras-thinking"
    ];

    const isIndonesian = !/[a-zA-Z]{5,}/.test(userPrompt) || /yang|dan|ini|apakah|bisa|jurnal|tolong|bagaimana|apa|tentang|skripsi|judul|buatkan|cari/i.test(userPrompt);
    const analysisLangRule = isIndonesian
      ? "WAJIB MENULISKAN ANALISIS SECARA LENGKAP DAN JELAS DALAM BAHASA INDONESIA."
      : "MUST WRITE THE ENTIRE REASONING IN THE EXACT SAME LANGUAGE AS THE USER.";

    const analysisText_prompt =
      `Berikan analisis proses berpikir dan penalaran dalam Bahasa Indonesia secara langsung dalam 3 poin berikut:\n\n` +
      `• **Intensi & Pemahaman**: [Jelaskan pemahaman inti maksud dan topik pertanyaan pengguna]\n` +
      `• **Kebutuhan Informasi**: [Jelaskan konsep teori, data empiris, rumus, atau literatur yang dibutuhkan]\n` +
      `• **Rencana Sistematika**: [Jelaskan rancangan alur penyusunan jawaban secara runtut dan tuntas]\n\n` +
      (contextPrompt ? `[KONTEKS & MEMORI RISET SEBELUMNYA]:\n${contextPrompt.slice(0, 3500)}\n\n` : "") +
      `PERMINTAAN PENGGUNA:\n"${userPrompt}"\n\n` +
      `PENTING: Langsung tuliskan 3 poin di atas dalam Bahasa Indonesia tanpa prolog pengantar atau catatan bahasa Inggris.`;

    let analysisText = "";
    let response = null;

    for (const model of analysisModels) {
      try {
        const firebaseIdToken = (user && typeof user.getIdToken === "function")
          ? await user.getIdToken().catch(() => "")
          : "";
        const authHeaderValue = firebaseIdToken ? `Bearer ${firebaseIdToken}` : "Bearer guest";
        response = await fetch(API_CHAT_URL, {
          method: "POST",
          signal: requestController.signal,
          headers: { "Content-Type": "application/json", Authorization: authHeaderValue },
          body: JSON.stringify({
            model,
            agentMode: true,
            stream: true,
            temperature: 0.3,
            messages: [{
              role: "user",
              content: [{ type: "text", text: analysisText_prompt }]
            }]
          })
        });
        if (response.ok) break;
        console.warn("[callAiAnalysis] model", model, "HTTP", response.status);
      } catch (err) {
        if (err.name === "AbortError") { if (timeoutId) window.clearTimeout(timeoutId); throw err; }
        console.warn("[callAiAnalysis] fetch error on model", model, err.message);
      }
    }

    if (!response || !response.ok) {
      if (timeoutId) window.clearTimeout(timeoutId);
      console.warn("[callAiAnalysis] semua model gagal, melanjutkan tanpa analisis");
      return "";
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let isInsideThink = false;

    const consumeAnalysis = (line) => {
      if (!line.startsWith("data:")) return;
      resetTimeout(60000);
      const raw = line.slice(5).trim();
      if (!raw || raw === "[DONE]") return;
      try {
        const chunk = JSON.parse(raw);
        const choice = chunk.choices?.[0];

        // Prioritas 1: reasoning field (model thinking native)
        const reasoning = choice?.delta?.reasoning ?? choice?.delta?.reasoning_content ?? choice?.message?.reasoning;
        if (typeof reasoning === "string" && reasoning.length > 0) {
          analysisText += reasoning;
          const cleaned = stripProviderSafetyMetadata(analysisText);
          setLiveReasoning(cleaned || analysisText);
          return;
        }

        // Prioritas 2: content biasa (tangani <think> tag jika ada)
        let content = choice?.delta?.content || choice?.text || chunk.content || chunk.text || "";
        if (Array.isArray(content)) content = content.map((p) => p?.text || "").join("");
        if (!content) return;

        if (isInsideThink) {
          const endIdx = content.indexOf("</think>");
          if (endIdx !== -1) {
            const inside = content.slice(0, endIdx);
            if (inside) analysisText += inside;
            isInsideThink = false;
          } else {
            analysisText += content;
          }
        } else if (content.includes("<think>")) {
          const si = content.indexOf("<think>");
          const after = content.slice(si + 7);
          isInsideThink = true;
          const ei = after.indexOf("</think>");
          if (ei !== -1) {
            const inside = after.slice(0, ei);
            if (inside) analysisText += inside;
            isInsideThink = false;
          } else {
            analysisText += after;
          }
        } else {
          analysisText += content;
        }

        const cleaned = stripProviderSafetyMetadata(analysisText);
        setLiveReasoning(cleaned || analysisText);
      } catch (_) {}
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() || "";
        lines.forEach(consumeAnalysis);
        if (done) break;
      }
    } catch (err) {
      if (timeoutId) window.clearTimeout(timeoutId);
      if (err.name !== "AbortError") console.warn("[callAiAnalysis] stream error:", err);
    }
    if (buffer.trim()) consumeAnalysis(buffer);
    if (timeoutId) window.clearTimeout(timeoutId);
    runController.current.signal.removeEventListener("abort", cancelRequest);
    // Filter safety metadata dari hasil analisis dan update panel Thinking
    const cleanedAnalysis = stripProviderSafetyMetadata(analysisText);
    latestReasoningRef.current = analysisText;
    setLiveReasoning(cleanedAnalysis || analysisText);

    // Hitung dan catat pemakaian token proses berpikir (Thinking / Reasoning Phase)
    const thinkingTokens = Math.max(1, Math.ceil((analysisText_prompt.length + (analysisText || "").length) / 3.8));
    if (typeof onUpdateAgentsUsage === "function") {
      onUpdateAgentsUsage(thinkingTokens);
    }

    return analysisText;
  };

  const callAiGeneration = async (promptText, continuation = 0, candidateOffset = 0) => {
    const pending = project.current.pendingDraft;
    if (pending?.text && continuation === 0) promptText = pending.prompt;
    const previous = pending?.prompt === promptText ? pending.text : "";
    setLiveDraft(previous);
    setWorkTab("draft");
    if (!previous) {
      // JANGAN reset liveReasoning di sini — hasil analisis fase 1 harus tetap tersimpan
      setAgentMode("writing");
      setIsContentOpen(false);
    } else {
      setAgentMode("writing");
      setIsContentOpen(false);
    }
    const requestController = new AbortController();
    const cancelRequest = () => requestController.abort();
    runController.current.signal.addEventListener("abort", cancelRequest, { once: true });
    let requestTimedOut = false;
    let timeoutId = null;

    const resetTimeout = (ms = 90000) => {
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        requestTimedOut = true;
        requestController.abort();
      }, ms);
    };

    resetTimeout(60000); // 60s initial wait untuk respons panjang

    const planGuideline = userPlan === "plus"
      ? "- STATUS PENGGUNA: PAKET PLUS (KUOTA HARIAN 40.000 TOKEN). Tuliskan kajian ilmiah secara TUNTAS, SANGAT MENDALAM, KOMPREHENSIF, dan LENGKAP dengan analisis, rumus, data, dan bukti ilmiah TANPA MEMOTONG pembahasan. Berikan jawaban FULL LENGTH dan TIDAK TERBATAS untuk setiap topik."
      : "- STATUS PENGGUNA: PAKET FREE (KUOTA BULANAN 5.000 TOKEN). Tuliskan penjelasan ilmiah secara AKADEMIS, MENDALAM, TERSTRUKTUR, ARGUMENTATIF, dan BERBOBOT. Berikan FULL CONTEXT dan JAWABAN LENGKAP tanpa membatasi penjelasan secara kaku—prioritaskan KELENGKAPAN INFORMASI.";

    const allCandidateModels = [
      "mputra/v61-maya",
      AGENT_FAST_MODEL,
      "mputra/v61-flash",
      "mputra/v61-cepat",
      "mputra/v62-astras-flash",
      selectedModel
    ].filter(Boolean);
    const candidateModels = Array.from(new Set(allCandidateModels)).slice(candidateOffset);

    let response = null;
    let lastError = null;
    let hasLoggedReasoning = false;
    let hasLoggedWriting = false;

    const continuationInstruction = previous
      ? `\n\n[BAGIAN AKHIR DRAF SEBELUMNYA]:\n"...${previous.slice(-700)}"\n\nInstruksi Lanjutan: Teks di atas terputus sebelum tuntas. SAMBUNG DAN LANJUTKAN TULISAN TEPAT SETELAH KATA TERAKHIR DI ATAS HINGGA SELURUH PEMBAHASAN TUNTAS, LENGKAP, DAN UTUH SAMPAI AKHIR. JANGAN mengulang kata yang sudah tertulis.`
      : "";

    for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
      const activeModel = candidateModels[mIdx];
      if (mIdx > 0) {
        setActivity(`Menghubungkan ke model cadangan (${activeModel})...`);
      }
      try {
        const firebaseIdToken = (user && typeof user.getIdToken === "function")
          ? await user.getIdToken().catch(() => "")
          : "";
        const authHeaderValue = firebaseIdToken ? `Bearer ${firebaseIdToken}` : "Bearer guest";
        response = await fetch(API_CHAT_URL, {
          method: "POST",
          signal: requestController.signal,
          headers: { "Content-Type": "application/json", Authorization: authHeaderValue },
          body: JSON.stringify({
            model: activeModel,
            agentMode: true,
            stream: true,
            temperature: 0.3,
            messages: [{
              role: "user",
              content: [{
                type: "text",
                text:
                  "PEDOMAN PENULISAN JAWABAN AKADEMIK & ASISTEN:\n" +
                  "1. PENYESUAIAN BAHASA MUTLAK (LANGUAGE MATCHING):\n" +
                  "   - Wajib merespons dalam BAHASA YANG SAMA PERSIS dengan bahasa yang digunakan pengguna (Bahasa Indonesia jika pengguna menulis dalam Bahasa Indonesia, English jika pengguna menulis dalam English, dsb).\n" +
                  "2. KESESUAIAN TINGGI DENGAN PERMINTAAN PENGGUNA:\n" +
                  "   - Wajib menjawab secara langsung, relevan, dan tepat sasaran sesuai dengan apa yang ditanyakan atau diminta pengguna.\n" +
                  "   - Jika pengguna menyapa atau menanyakan kemampuan bantuan: Sambut dengan ramah, komunikatif, dan jelaskan kemampuan yang bisa dibantu (Skripsi Bab 1-5, Jurnal Crossref, Analisis Dataset, Konsultasi Materi & Rumus).\n" +
                  "   - Jika pengguna menanyakan konsep/materi/rumus: Berikan penjelasan mendalam, terstruktur, dan tuntas dengan LaTeX ($...$) atau contoh konkret.\n" +
                  "   - Jika pengguna meminta pembuatan naskah skripsi: Susun naskah ilmiah komprehensif berbasis data/literatur.\n" +
                  "3. KELENGKAPAN: Berikan pembahasan yang utuh dan tuntas hingga akhir. JANGAN PERNAH memotong kalimat di tengah jalan.\n" +
                  planGuideline + "\n" +
                  "4. FORMAT MARKDOWN: Gunakan heading (#, ##, ###), bold (**), list, tabel, dan rumus LaTeX secara tepat dan rapi.\n" +
                  "5. SITASI (JIKA RELEVAN): Gunakan format (Nama Penulis, Tahun) dalam teks.\n" +
                  "6. BEBAS EMOJI: DILARANG KERAS menggunakan emoji dekoratif seperti ✅, ❌, ✔️, 📌, 🚀, dll. Gunakan penulisan formal dan akademis murni.\n\n" +
                  "TUGAS: Berikan respons terbaik yang tepat sasaran untuk permintaan berikut:\n\n" +
                  promptText + continuationInstruction
              }, ...currentAttachments.current.flatMap((file) => {
                if (file.extractedText) return [{ type: "text", text: `Bahan data penelitian ${file.name}:\n${file.extractedText}` }];
                if (file.isImage && file.dataUrl) return [{ type: "image_url", image_url: { url: file.dataUrl } }];
                if (file.dataUrl && (file.type === "application/pdf" || /\.pdf$/i.test(file.name))) return [{ type: "file", file: { filename: file.name, file_data: file.dataUrl } }];
                return [];
              })]
            }]
          })
        });

        if (response.ok) break;
        lastError = new Error(`Permintaan AI gagal (${response.status}) pada jalur ${activeModel}`);
      } catch (error) {
        if (error.name === "AbortError" && requestTimedOut && !runController.current.signal.aborted) {
          lastError = new Error("Koneksi agen terputus karena batas waktu. Mencoba melanjutkan...");
        } else if (error.name === "AbortError") {
          throw error;
        } else {
          lastError = error;
        }
      }
    }

    if (!response || !response.ok) {
      if (timeoutId) window.clearTimeout(timeoutId);
      throw lastError || new Error("Semua jalur API cadangan sedang sibuk. Silakan coba tahap ini lagi beberapa saat kemudian.");
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "", result = "", finish = "";
    let reasoningBuffer = "";
    let isInsideThinkTag = false;
    const consume = (line) => {
      if (!line.startsWith("data:")) return;
      resetTimeout(120000); // Reset timer setiap token diterima (120s untuk respons panjang)
      const raw = line.slice(5).trim();
      if (!raw || raw === "[DONE]") return;
      try {
        const chunk = JSON.parse(raw);
        if (chunk.error) throw new Error(chunk.error.message || "AI gagal");
        const choice = chunk.choices?.[0];
        
        // 1. Ekstraksi proses berpikir resmi (delta.reasoning / delta.reasoning_content / message.reasoning)
        const rawReasoning = choice?.delta?.reasoning ?? choice?.delta?.reasoning_content ?? choice?.message?.reasoning ?? choice?.message?.reasoning_content;
        if (typeof rawReasoning === "string" && rawReasoning.length > 0) {
          reasoningBuffer += rawReasoning;
          setLiveReasoning((prev) => prev + rawReasoning);
          setAgentMode("thinking");
          setIsContentOpen(true);
          if (!hasLoggedReasoning) {
            hasLoggedReasoning = true;
          }
          // JANGAN proses konten pada chunk ini selagi proses berpikir masih aktif
          return;
        }

        // 2. Ekstraksi konten teks jawaban
        let rawContent = choice?.delta?.content || 
                        choice?.text || 
                        choice?.message?.content ||
                        chunk.content || 
                        chunk.text;

        // Beberapa API kompatibel OpenAI mengirim content sebagai array bagian teks.
        if (Array.isArray(rawContent)) {
          rawContent = rawContent.map((part) => part?.text || part?.content || "").join("");
        }
        
        if (typeof rawContent === "string" && rawContent.length > 0) {
          let contentToAppend = rawContent;

          // Tangani tag <think>...</think> jika model mengirim proses berpikir di dalam stream content
          if (isInsideThinkTag) {
            const endIdx = contentToAppend.indexOf("</think>");
            if (endIdx !== -1) {
              const thinkChunk = contentToAppend.slice(0, endIdx);
              const afterThink = contentToAppend.slice(endIdx + 8);
              isInsideThinkTag = false;
              if (thinkChunk) {
                setLiveReasoning((prev) => prev + thinkChunk);
              }
              contentToAppend = afterThink;
            } else {
              setLiveReasoning((prev) => prev + contentToAppend);
              setAgentMode("thinking");
              setIsContentOpen(true);
              contentToAppend = "";
              return;
            }
          } else if (contentToAppend.includes("<think>")) {
            const startIdx = contentToAppend.indexOf("<think>");
            const before = contentToAppend.slice(0, startIdx);
            const afterStart = contentToAppend.slice(startIdx + 7);
            if (before) {
              result += before;
            }
            isInsideThinkTag = true;
            const endIdx = afterStart.indexOf("</think>");
            if (endIdx !== -1) {
              const thinkChunk = afterStart.slice(0, endIdx);
              const afterEnd = afterStart.slice(endIdx + 8);
              isInsideThinkTag = false;
              if (thinkChunk) {
                setLiveReasoning((prev) => prev + thinkChunk);
              }
              contentToAppend = afterEnd;
            } else {
              setLiveReasoning((prev) => prev + afterStart);
              setAgentMode("thinking");
              setIsContentOpen(true);
              contentToAppend = "";
              return;
            }
          }

          if (contentToAppend && !isInsideThinkTag) {
            result += contentToAppend;
            const visibleResult = stripProviderSafetyMetadata(result);
            setAgentMode("writing");
            setLiveDraft(stripProviderSafetyMetadata(previous + visibleResult));
            project.current.pendingDraft = { prompt: promptText, text: stripProviderSafetyMetadata(previous + visibleResult) };
          }
        }

        if (choice?.finish_reason) finish = choice.finish_reason;
      } catch (e) {
        if (e.message && !e.message.includes("JSON")) throw e;
      }
    };
    try {
      while (true) {
        const { done, value } = await reader.read();
        buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() || "";
        lines.forEach(consume);
        if (done) break;
      }
    } catch (error) {
      if (timeoutId) window.clearTimeout(timeoutId);
      if (requestTimedOut && !runController.current.signal.aborted) {
        throw new Error("Koneksi AI terhenti saat menulis. Mencoba melanjutkan...");
      }
      throw error;
    }
    if (buffer.trim()) consume(buffer);
    if (timeoutId) window.clearTimeout(timeoutId);
    runController.current?.signal.removeEventListener("abort", cancelRequest);
    const cleanedResult = stripProviderSafetyMetadata(result);
    if (!cleanedResult) {
      if (candidateOffset + 1 < candidateModels.length) {
        setActivity("Mendapatkan tanggapan tidak valid, mencoba model cadangan...");
        return callAiGeneration(promptText, continuation, candidateOffset + 1);
      }
      throw new Error("AI belum mengirim uraian teks. Referensi jurnal yang ditemukan tetap dapat dibaca; kirim ulang permintaan untuk membuat ringkasannya.");
    }
    // Hanya lanjutkan jika benar-benar terpotong karena batas token provider (finish === "length")
    // Jangan pernah melanjutkan jika model selesai secara alami ("stop")
    if (finish === "length") {
      saveProject();
      const maxContinuation = userPlan === "plus" ? 4 : 3;
      if (continuation < maxContinuation) {
        setActivity(`Melanjutkan penulisan agar tuntas (${continuation + 1}/${maxContinuation})...`);
        return callAiGeneration(promptText, continuation + 1, candidateOffset);
      }
    }
    project.current.pendingDraft = null;
    const finalFullResult = stripProviderSafetyMetadata(previous + result);
    setActivity("Meninjau kelengkapan jawaban...");
    const estimatedTokens = Math.max(1, Math.ceil((promptText.length + finalFullResult.length) / 3.8));
    if (typeof onUpdateAgentsUsage === "function") {
      onUpdateAgentsUsage(estimatedTokens);
    }
    return finalFullResult;
  };

  const stagePlan = [
    ["bab1", ["1.1 Latar Belakang", "1.2 Rumusan dan Batasan Masalah", "1.3 Tujuan dan Manfaat", "1.4 Sistematika Penulisan"]],
    ["bab2", ["2.1 Landasan Teori", "2.2 Sintesis Penelitian Terdahulu", "2.3 Research Gap dan Kerangka Berpikir"]],
    ["bab3", ["3.1 Desain Penelitian", "3.2 Populasi, Sampel dan Instrumen", "3.3 Pengumpulan dan Analisis Data"]],
    ["bab4", ["4.1 Deskripsi Data yang Disediakan", "4.2 Analisis Hasil yang Tersedia", "4.3 Pembahasan dan Keterbatasan"]],
    ["bab5", ["5.1 Kesimpulan Berdasarkan Bukti", "5.2 Saran dan Penelitian Lanjutan"]]
  ];

  const performCrossrefSearch = async (title) => {
    const p = project.current;
    const sourceTarget = 15;
    while ((p.sources?.length || 0) < sourceTarget && p.sourceOffset !== null) {
      setAgentMode("thinking");
      setActivity("Mencari jurnal sesuai judul di Crossref...");
      setWorkTab("activity");
      const offset = p.sourceOffset ?? (p.sources?.length ? 10 : 0);
      setActivity(`Mencari jurnal Crossref bertahap: ${offset + 1}–${Math.min(offset + 10, 35)}`);
      try {
        const response = await fetch("/api/research?q=" + encodeURIComponent(title.slice(0, 400)) + "&offset=" + offset, { signal: runController.current.signal });
        const result = await response.json();
        if (!response.ok || !result.sources?.length) {
          break;
        }
        p.sources = [...new Map([...(p.sources || []), ...result.sources].map((s) => [s.doi.toLowerCase(), s])).values()].slice(0, 100);
        p.sourceOffset = result.nextOffset;
        p.researchedAt = result.retrievedAt;
        setResearchSources(p.sources);
        saveProject();
      } catch (searchErr) {
        if (searchErr.name === "AbortError") throw searchErr;
        break;
      }
    }
    if (p.sources?.length && !p.sourcesReported) {
      p.sourcesReported = true;
      addAssistantMessage("Ditemukan " + p.sources.length + " kandidat jurnal dari Crossref untuk mendukung dasar ilmiah skripsi Anda.", { sources: p.sources, isAcademicResearch: true });
    }
  };

  const writeChapterSections = async (chapterIdx, instructionText = "") => {
    const p = project.current;
    const [key, sections] = stagePlan[chapterIdx - 1];
    p.sectionIndex ||= 0;

    const formattedSources = (p.sources || []).map((s, idx) => {
      const authors = (s.authors && s.authors.length) ? s.authors.join(", ") : "Penulis";
      const year = s.year || "t.t.";
      return `[Sumber ${idx + 1}] Penulis: ${authors} (${year})\nJudul: "${s.title}"\nJurnal: ${s.journal || "Jurnal Ilmiah"}\nAbstrak/Fokus: ${s.abstract || "Kajian ilmiah terkait " + s.title}\nDOI (hanya untuk referensi akhir): ${s.doi}`;
    }).join("\n\n");

    for (let i = p.sectionIndex; i < sections.length; i++) {
      setAgentMode("thinking");
      setActivity(`Menyusun ${sections[i]} (${i + 1}/${sections.length})`);
      setLiveDraft("");
      const context = JSON.stringify(p.chapters).slice(-45000);

      let retryCount = 0;
      let text = "";
      while (retryCount < 2 && !text) {
        try {
          text = await callAiGeneration(
            `Judul Skripsi: "${p.title}"\n` +
            `Instruksi Peneliti: ${instructionText || "Susun naskah skripsi akademik yang lengkap dan mendalam."}\n\n` +
            `LITERATUR JURNAL (Ambil teori, temuan, dan metodologi dari abstrak untuk diulas):\n` +
            `${formattedSources || "[Gunakan konsep dasar ilmiah yang relevan]"}\n\n` +
            `BUKTI / DATA PENELITIAN PENGGUNA:\n` +
            `${(p.evidence || "").slice(-35000) || "[Jelaskan kerangka operasional dan analisis metodologis terukur]"}\n\n` +
            `KONTEKS BAB SEBELUMNYA (Jaga koherensi dan sistematika naskah):\n` +
            `${context}\n\n` +
            `TUGAS:\n` +
            `Susun naskah skripsi HANYA untuk subbab "${sections[i]}".\n\n` +
            `ATURAN KETAT AKADEMIK & SITASI:\n` +
            `1. Tulis naskah akademik yang rapi, komprehensif, dan baku (target 750 - 1100 kata).\n` +
            `2. Gunakan heading markdown yang rapi: "### ${sections[i]}".\n` +
            `3. SITASI DALAM TEKS: Wajib gunakan nama penulis dan tahun, contoh: (Sutrisno, 2023) atau Menurut Rahmawati dkk. (2022). JANGAN PERNAH MENULIS KODE DOI (10.xxxx/...) ATAU URL LINK DI DALAM TEKS PARAGRAF! Kode DOI hanya untuk Daftar Pustaka.\n` +
            `4. Manfaatkan gagasan/temuan dari abstrak referensi yang diberikan untuk memperkuat dasar teoritis dan pembahasan.\n` +
            `5. Jangan tampilkan proses berpikir, prolog pengantar, atau catatan kaki. Langsung naskah skripsi yang bersih dan siap diuji.`
          );
        } catch (genErr) {
          retryCount++;
          if (retryCount >= 2 || genErr.name === "AbortError") throw genErr;
          setActivity(`Mencoba ulang ${sections[i]}...`);
        }
      }

      p.chapters[key] = (p.chapters[key] || "") + "\n\n" + text;
      p.sectionIndex = i + 1;
      saveProject();
      addAssistantMessage(text);
    }
    p.sectionIndex = 0;
  };

  const finalizeProjectDocx = async () => {
    const p = project.current;
    setAgentMode("thinking");
    setActivity("Mencocokkan referensi dan menyusun Daftar Pustaka...");
    setLiveDraft("");
    const draft = Object.values(p.chapters).join("\n");

    const citedSources = (p.sources || []).filter((s) => {
      const firstAuthor = s.authors?.[0]?.split(" ")?.pop()?.toLowerCase();
      return firstAuthor && draft.toLowerCase().includes(firstAuthor);
    });
    const finalSources = citedSources.length >= 3 ? citedSources : (p.sources || []).slice(0, 15);

    p.chapters.pustaka = finalSources.length ? finalSources.map((s) => {
      const authors = (s.authors && s.authors.length) ? s.authors.join(", ") : "[Penulis tidak tersedia]";
      const year = s.year || "t.t.";
      const title = s.title || "Judul publikasi";
      const journal = s.journal || "Jurnal Ilmiah";
      const vol = s.volume ? `, ${s.volume}` : "";
      const issue = s.issue ? `(${s.issue})` : "";
      const pages = s.pages ? `, ${s.pages}` : "";
      const doi = s.doi ? ` https://doi.org/${s.doi}` : (s.url ? ` ${s.url}` : "");
      return `${authors} (${year}). ${title}. ${journal}${vol}${issue}${pages}.${doi}`;
    }).sort().join("\n\n") : "[Daftar pustaka disusun berdasarkan referensi ilmiah terpilih.]";

    const words = Object.values(p.chapters).join(" ").trim().split(/\s+/).length;
    p.stage = 7;
    saveProject();

    let blob = null;
    try {
      blob = await generateAcademicSkripsiDocx({
        title: p.title || "SKRIPSI AKADEMIK",
        studentName: "M PUTRA RAMADHANI",
        nim: "10121001",
        university: "UNIVERSITAS KOMPUTER INDONESIA",
        department: "PROGRAM STUDI TEKNIK INFORMATIKA",
        year: new Date().getFullYear(),
        chapters: p.chapters,
        sources: p.sources || []
      });
      setDocxBlob(blob);
    } catch (err) {
      console.error("Gagal pra-membuat DOCX:", err);
    }

    addAssistantMessage(
      `**Penulisan Skripsi Selesai!** Seluruh Bab I hingga Bab V serta Daftar Pustaka telah selesai disusun secara terstruktur (sekitar ${words} kata).\n\nDokumen Word (.docx) siap diunduh di bawah ini. Anda dapat meninjau naskah dan jika ada bab atau isi yang ingin diperbaiki, silakan langsung beri tahu saya!`,
      { isFinalDocx: true, docxReady: true, skripsiTitle: p.title }
    );
  };

  const startAutonomousWorkflow = async (instruction, { selectedTitle = false } = {}) => {
    if (runController.current) return;
    runController.current = new AbortController();
    setIsRunning(true);
    setAgentMode("thinking");
    setLiveDraft("");
    setLiveReasoning("");
    latestReasoningRef.current = "";
    setIsContentOpen(true);
    try {
      const p = project.current;
      const rawText = instruction.trim();

      // Ekstraksi judul jika terdapat dalam teks perintah
      let titleInText = "";
      const quoteMatch = rawText.match(/["“](.+?)["”]/);
      if (quoteMatch && quoteMatch[1].trim().length >= 15) {
        titleInText = quoteMatch[1].trim();
      } else {
        const titleMatch = rawText.match(/(?:judul(?:\s+ini)?(?:\s*adalah)?(?:\s*:)?)\s*([^,\n.]+)/i);
        if (titleMatch && titleMatch[1].trim().length >= 15) {
          titleInText = titleMatch[1].trim();
        }
      }

      // DETEKSI NIAT PENGGUNA SECARA PRESISI - PINDAHKAN KE AWAL
      const hasExplicitSkripsiKeyword = /\b(?:skripsi|tugas\s+akhir|tesis|disertasi)\b/i.test(rawText);
      
      // Deteksi pertanyaan umum (bukan skripsi)
      const isGeneralQuestion = 
        /\?$/.test(rawText.trim()) || // Akhir dengan tanda tanya
        /^(?:apa|bagaimana|berapa|kapan|di mana|siapa|mengapa|jelaskan|sebutkan|hitunglah|buktikan|bandingkan|analisis|coba|cek|lihat|tunjukkan)\b/i.test(rawText) ||
        /(?:jelaskan|sebutkan|apa\s+itu|bagaimana\s+cara|berapa\s+nilai|kapan\s+terjadi|mengapa|coba\s+jawab|beri\s+tahu)/i.test(rawText);
      
      // Jika ada tanda tanya atau kata tanya di awal, asumsikan pertanyaan umum KECUALI jika ada keyword skripsi yang eksplisit
      const isLikelyGeneralQuestion = isGeneralQuestion && !hasExplicitSkripsiKeyword;

      // Deteksi file lampiran
      const hasAttachments = currentAttachments.current && currentAttachments.current.length > 0;

      // JIKA INI PERTANYAAN UMUM (BUKAN SKRIPSI/JURNAL/FILE) — ALUR 2 FASE
      if (isLikelyGeneralQuestion && !hasAttachments) {
        setAgentMode("thinking");
        setActivity("Memahami permintaan Anda...");

        // ── FASE 1: Analisis & Validasi Niat (stream ke panel Thinking) ──
        const intentAnalysis = await callAiAnalysis(rawText);
        await new Promise((resolve) => setTimeout(resolve, 60));

        // ── FASE 2: Generate Jawaban Akhir (stream ke panel Draft) ──
        setActivity("Menyusun jawaban akademik...");
        const academicPrompt =
          `PERAN: Anda adalah AI Agents Akademik yang cerdas, responsif, dan solutif, siap membantu dalam berbagai kebutuhan akademik, skripsi, riset jurnal, analisis data, maupun konsultasi materi pelajaran.\n\n` +
          (intentAnalysis ? `[HASIL ANALISIS KEBUTUHAN PENGGUNA / REASONING ANALYSIS]:\n${intentAnalysis}\n\n` : "") +
          `PERMINTAAN / PERTANYAAN PENGGUNA:\n"${rawText}"\n\n` +
          `PANDUAN RESPONS:\n` +
          `1. BAHASA: WAJIB gunakan BAHASA YANG SAMA PERSIS dengan bahasa pengguna (English jika pengguna berbahasa Inggris, Bahasa Indonesia jika berbahasa Indonesia, dsb).\n` +
          `2. Jawablah secara tepat sasaran dan fokus penuh pada apa yang diminta pengguna.\n` +
          `3. Jika sapaan/inquiry bantuan: Berikan sambutan ramah dan jelaskan secara ringkas kemampuan bantuan yang tersedia.\n` +
          `4. Jika materi/soal/rumus: Jelaskan secara mendalam, terstruktur, sistematis, dan tuntas.\n` +
          `5. Sajikan jawaban dengan format markdown yang rapi.`;

        const academicResponse = await callAiGeneration(academicPrompt);
        addAssistantMessage(academicResponse, { query: rawText, reasoning: intentAnalysis });
        return;
      }
      // JIKA ADA LAMPIRAN FILE — ALUR 2 FASE
      if (hasAttachments) {
        const fileList = currentAttachments.current;
        const fileNames = fileList.map((f) => f.name).join(", ");
        setAgentMode("thinking");
        setActivity(`Memahami dan membaca ${fileNames}...`);

        const extractedContent = fileList
          .filter((f) => f.extractedText)
          .map((f) => `=== FILE TERLAMPIR: ${f.name} ===\n${f.extractedText}`)
          .join("\n\n");

        if (extractedContent) {
          p.evidence = ((p.evidence || "") + "\n\n" + extractedContent).slice(-50000);
          saveProject();
        }

        // ── FASE 1: Analisis & Validasi Niat file (stream ke panel Thinking) ──
        const fileContext = `File yang diunggah: ${fileNames}\nPermintaan: ${rawText || "Analisis file ini"}`;
        const intentAnalysis = await callAiAnalysis(fileContext);
        await new Promise((resolve) => setTimeout(resolve, 60));

        // ── FASE 2: Generate Jawaban Akhir dengan konteks file (stream ke panel Draft) ──
        setActivity(`Menganalisis ${fileNames} secara mendalam...`);
        const analysisPrompt =
          `PERAN: Anda adalah AI Agents Akademik tingkat lanjut yang bertindak sebagai analis data empiris dan peneliti ilmiah.\n\n` +
          (intentAnalysis ? `[HASIL ANALISIS NIAT — Gunakan sebagai panduan]:\n${intentAnalysis}\n\n` : "") +
          `FILE DATA / JURNAL YANG DIUNGGAH PENELITI:\n` +
          `${extractedContent || "[File lampiran telah dikirimkan untuk dianalisis]"}\n\n` +
          (p.title ? `Konteks Riset Utama: "${p.title}"\n\n` : "") +
          `PERMINTAAN / INSTRUKSI PENELITI:\n"${rawText || "Lakukan pembacaan dan analisis mendalam terhadap file ini."}"\n\n` +
          `PANDUAN ANALISIS AKADEMIS:\n` +
          `1. MEMBACA & MEMAHAMI FILE SECARA MENDALAM:\n` +
          `   - Bacalah seluruh data, variabel, atau isi naskah artikel jurnal secara seksama.\n` +
          `2. JIKA FILE ADALAH DATASET CSV / TABULAR:\n` +
          `   - Uraikan struktur data (variabel/kolom, jumlah sampel/baris, tipe data).\n` +
          `   - Sajikan ringkasan statistika deskriptif (rata-rata, distribusi, nilai ekstrem/outlier jika ada).\n` +
          `   - Identifikasi temuan kunci, korelasi antar variabel, dan interpretasi maknanya secara ilmiah.\n` +
          `   - Gunakan format tabel data markdown terstruktur jika menyajikan ringkasan numerik.\n` +
          `3. JIKA FILE ADALAH JURNAL ILMIAH / DOKUMEN RISET:\n` +
          `   - Bedah tujuan penelitian, landasan teori, metodologi yang digunakan, dan temuan utamanya.\n` +
          `   - Lakukan telaah kritis: keunggulan, keterbatasan, dan research gap yang dapat dikembangkan.\n` +
          `4. TINDAK LANJUT PERMINTAAN PENELITI:\n` +
          `   - Jawab secara langsung, komprehensif, dan solutif setiap poin yang ditanyakan atau diminta oleh peneliti.\n` +
          `5. FORMATING: Sajikan dengan heading markdown yang rapi, bahasa akademis formal berbahasa Indonesia.`;

        const analysisReply = await callAiGeneration(analysisPrompt);
        addAssistantMessage(analysisReply, { query: rawText, reasoning: intentAnalysis });
        return;
      }

      // 2. DETEKSI NIAT PENGGUNA SECARA PRESISI - SUDAH DIPINDAHKAN KE ATAS

      // A. Apakah ini permintaan eksplisit riset / pengambilan data jurnal ilmiah?
      const isJournalResearch =
        (/(?:cari(?:kan)?|ambil(?:kan)?|kumpulkan|ekstrak|telusuri|temukan|daftar)\s+(?:data\s+riset|jurnal|literatur|referensi|penelitian|paper|artikel\s+ilmiah)/i.test(rawText) ||
        /(?:riset\s+jurnal|cari\s+jurnal|referensi\s+jurnal|ambil\s+data\s+riset|literature\s+review)/i.test(rawText)) &&
        !/\?/.test(rawText); // Bukan pertanyaan dengan tanda tanya

      // B. Apakah ini permintaan penyusunan draf skripsi lengkap dari awal sampai akhir?
      const isExplicitFullSkripsi =
        /(?:kerjakan\s+judul\s+.*(?:lengkap|dari\s+awal\s+sampai\s+akhir)|buatkan\s+(?:draf\s+)?(?:skripsi|karya\s+ilmiah|tugas\s+akhir)\s+(?:lengkap|seluruh|semuanya|dari\s+awal\s+sampai\s+akhir)|susun\s+semua\s+bab\s+skripsi|buatkan\s+lengkap\s+dari\s+awal\s+sampai\s+akhir|buatkan\s+skripsi\s+lengkap)/i.test(rawText) ||
        (/^(?:semuanya|lengkap|seluruhnya|dari awal sampai akhir)$/i.test(rawText) && p.title && p.stage > 0);

      // C. Apakah ini permintaan pembuatan bab tertentu skripsi?
      const babMatch = rawText.match(/(?:bab|subbab)\s*([1-5]|i{1,3}|iv|v)\b/i);
      const isExplicitBab =
        (p.title && p.stage > 0) && // HANYA jika sudah punya judul skripsi dan sudah dimulai
        (/(?:buatkan|susun|kerjakan|tuliskan|lanjutkan|buat)\s+(?:skripsi\s+)?bab\s*([1-5]|i{1,3}|iv|v)\b/i.test(rawText) ||
        (/^(?:bab\s*([1-5]|i{1,3}|iv|v)|lanjut\s+bab|bab)$/i.test(rawText))) &&
        !/(?:jelaskan|apa\s+itu|tanya|materi|soal|rumus|cara|contoh|apakah)/i.test(rawText);

      // D. Apakah pengguna hanya menyebutkan judul skripsi?
      // Sesuai aturan: jika hanya menyebutkan judul skripsi, tanyakan apakah mau buat bab 1 atau semuanya
      const isExplicitSkripsiTitleOnly =
        (/^(?:kerjakan\s+judul\s*(?:ini\s*)?:?|judul\s*(?:skripsi|tugas\s+akhir|penelitian|tesis)\s*:?)/i.test(rawText) ||
        (/(?:judul\s+skripsi|topik\s+skripsi)/i.test(rawText) && titleInText) ||
        (hasExplicitSkripsiKeyword && /(?:judul|topik)\s*:/i.test(rawText))) &&
        !isExplicitFullSkripsi && !isExplicitBab;

      // E. Apakah ini revisi draf skripsi yang sudah ada?
      const isRevision = p.stage > 0 && /^(?:perbaiki|revisi|ubah|ganti|edit|koreksi|tambahkan|benahi|perjelas)\s+(?:bab|subbab|bagian|naskah|draf|paragraf)/i.test(rawText);
      if (/^analisis\s+dataset\s+csv\s*(&|\+|dan)?\s*file\s+jurnal$/i.test(rawText) && !hasAttachments) {
        addAssistantMessage(
          "### 📊 Analisis Dataset CSV & Telaah File Jurnal\n\n" +
          "Saya siap menganalisis data empiris atau naskah ilmiah Anda secara komprehensif!\n\n" +
          "**Langkah untuk memulai:**\n" +
          "1. Klik tombol **Lampiran** di sebelah kiri kolom input chat.\n" +
          "2. Pilih file **dataset (.csv, .xlsx)** atau dokumen **jurnal (.pdf, .docx, .txt)**.\n" +
          "3. Tuliskan hal spesifik yang ingin Anda ketahui (contoh: *'Jelaskan korelasi antar variabel dan ringkasan statistik dataset ini'*).\n\n" +
          "Saya akan membaca seluruh variabel data, menyajikan ringkasan statistik deskriptif, dan mengekstrak temuan kunci secara otomatis."
        );
        return;
      }

      if (/^tanya\s+konsep\s+pelajaran\s*(&|\+|dan)?\s*materi\s+kuliah$/i.test(rawText)) {
        addAssistantMessage(
          "### 🎓 Konsultasi Pelajaran & Materi Akademik\n\n" +
          "Silakan tanyakan materi pelajaran, konsep teori ilmiah, penurunan rumus, atau pemecahan soal yang sedang Anda pelajari!\n\n" +
          "**Contoh pertanyaan yang bisa Anda ajukan:**\n" +
          "- *'Jelaskan alur kerja algoritma Dijkstra beserta contoh graf dan tabel perhitungannya.'*\n" +
          "- *'Bagaimana konsep regresi linear berganda dan pengujian asumsi klasiknya?'*\n" +
          "- *'Jelaskan perbedaan fotosintesis reaksi terang dan reaksi gelap pada tumbuhan.'*\n\n" +
          "Tuliskan topik atau pertanyaan yang ingin Anda bahas di kolom pesan di bawah."
        );
        return;
      }

      if (/^penyusunan\s+skripsi\s+lengkap\s*\(bab\s+i\s*-\s*v\)$/i.test(rawText)) {
        addAssistantMessage(
          "### 📝 Bimbingan & Penyusunan Skripsi Lengkap\n\n" +
          "Saya siap mendampingi Anda menyusun karya ilmiah secara utuh dari Bab I hingga Bab V serta Daftar Pustaka resmi.\n\n" +
          "**Untuk memulai, silakan tuliskan judul atau topik skripsi Anda:**\n" +
          "- *Contoh:* `Judul skripsi: Penerapan Algoritma K-Means Clustering untuk Segmentasi Pelanggan E-Commerce`\n\n" +
          "Setelah Anda mengirimkan judul, kita akan mulai merumuskan Bab 1 (Latar Belakang, Masalah, Tujuan), mengumpulkan literatur jurnal untuk Bab 2, hingga selesai diekspor ke Word (.docx)."
        );
        return;
      }

      // ========================================================
      // KASUS 1: RISET JURNAL & EKSTRAKSI DATA RISET ILMIAH
      // ========================================================
      if (isJournalResearch) {
        setAgentMode("thinking");
        // Tombol pintas belum membawa topik penelitian. Jangan menjalankan pencarian
        // generik yang tidak relevan atau memanggil AI tanpa bahan yang dapat diverifikasi.
        if (/^(?:ambil\s+)?data\s+riset\s+dari\s+jurnal\s+ilmiah$/i.test(rawText)) {
          addAssistantMessage(
            "Tulis topik atau kata kunci penelitian Anda, misalnya: **Cari jurnal tentang deteksi penyakit menggunakan AI**. Saya akan mengambil metadata jurnal yang benar-benar tersedia dari Crossref, lalu merangkum metode dan temuan berdasarkan sumber tersebut."
          );
          return;
        }
        const journalScope = /\b(?:jurnal\s+)?nasional\b|\bindonesia\b/i.test(rawText)
          ? "national"
          : /\b(?:jurnal\s+)?internasional\b|\bluar\s+negeri\b/i.test(rawText)
            ? "international"
            : "all";
        let query = rawText
          .replace(/^(?:tolong\s+)?(?:bantu\s+)?(?:cari(?:kan)?|ambil(?:kan)?|kumpulkan|ekstrak|telusuri|temukan|daftar)(?:\s+\d{1,3})?\s+(?:data\s+riset|jurnal|literatur|referensi|penelitian|paper|artikel\s+ilmiah)?(?:\s+(?:tentang|mengenai|terkait|dari))?\s*/i, "")
          .replace(/["“”]/g, "")
          .replace(/\b(?:jurnal\s+)?(?:nasional|internasional)\b|\b(?:indonesia|luar\s+negeri)\b/gi, "")
          .trim();
        if (!query || query.length < 3) query = p.title || "";

        if (!query) {
          addAssistantMessage(
            "### 📚 Pencarian & Ekstraksi Data Riset Jurnal Ilmiah\n\n" +
            "Halo! Saya siap membantu Anda menelusuri literatur jurnal ilmiah (Crossref), mengekstrak data riset empiris, metodologi, dan temuan kunci.\n\n" +
            "**Silakan tuliskan topik riset atau kata kunci jurnal yang ingin Anda telusuri:**\n" +
            "- *Contoh:* `Cari jurnal tentang penerapan Machine Learning untuk deteksi penyakit`\n" +
            "- *Contoh:* `Riset jurnal analisis sentimen media sosial dengan model BERT`\n\n" +
            "Anda juga dapat langsung mengunggah file artikel jurnal (PDF/Word) atau dataset CSV untuk saya bedah secara otomatis."
          );
          return;
        }

        setActivity(`Mencari literatur jurnal dan mengekstrak data riset: "${query.slice(0, 45)}"...`);
        setWorkTab("activity");

        const requestedCountMatch = rawText.match(/(?:sebanyak|hingga|sampai|berikan|cari(?:kan)?|ambil(?:kan)?)\s*(\d{1,3})\s*(?:jurnal|referensi|sumber)/i);
        const requestedCount = Math.min(100, Math.max(1, Number(requestedCountMatch?.[1] || 10)));

        let retrievedSources = [];
        try {
          const response = await fetch("/api/research?q=" + encodeURIComponent(query.slice(0, 400)) + "&offset=0&limit=" + requestedCount + "&scope=" + journalScope, {
            signal: runController.current.signal
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Crossref tidak dapat melayani pencarian saat ini.");
          if (result.sources && result.sources.length) {
            retrievedSources = result.sources.slice(0, requestedCount);
            p.sources = [...new Map([...(p.sources || []), ...retrievedSources].map((s) => [s.doi.toLowerCase(), s])).values()].slice(0, 100);
            setResearchSources(p.sources);
            saveProject();
          }
        } catch (searchErr) {
          if (searchErr.name === "AbortError") throw searchErr;
          setActivity("Melanjutkan kajian ilmiah...");
        }

        // Maksimal 15 sumber dikirim ke model agar respons tetap cepat; seluruh hasil tetap ditampilkan.
        const sourcesForAnalysis = retrievedSources.slice(0, 15);
        const formattedSources = sourcesForAnalysis.length
          ? sourcesForAnalysis.map((s, idx) => {
              const authors = (s.authors && s.authors.length) ? s.authors.join(", ") : "Penulis";
              const year = s.year || "t.t.";
              return `[Jurnal ${idx + 1}]\n- Judul: "${s.title}"\n- Penulis & Tahun: ${authors} (${year})\n- Jurnal / Penerbit: ${s.journal || "Jurnal Ilmiah"}\n- Abstrak / Fokus Riset: ${s.abstract || "Kajian ilmiah terkait " + s.title}\n- Link / DOI: ${s.doi ? `https://doi.org/${s.doi}` : (s.url || "-")}`;
            }).join("\n\n")
          : `[Menyajikan tinjauan literatur ilmiah peer-reviewed dari basis data riset terkini untuk topik: "${query}"]`;

        const researchPrompt =
          `PERAN AKADEMIK: Anda adalah AI Agents Akademik — pakar metodologi penelitian dan kurator literatur ilmiah terpercaya.\n\n` +
          `TOPIK RISET YANG DICARI: "${query}"\n\n` +
          `LITERATUR JURNAL EMPIRIS (SUMBER TERVERIFIKASI CROSSREF DATABASE):\n${formattedSources}\n\n` +
          `PERMINTAAN PENGGUNA:\n"${rawText}"\n\n` +
          `PANDUAN MENYUSUN RESPONS (WAJIB SESUAI PERMINTAAN PENGGUNA):\n` +
          `1. BAHASA: WAJIB gunakan BAHASA YANG SAMA PERSIS dengan bahasa yang digunakan pengguna dalam permintaannya (Bahasa Indonesia jika berbahasa Indonesia, English jika berbahasa Inggris).\n` +
          `2. STRUKTUR RESPONS LANGSUNG MENJAWAB PERMINTAAN:\n` +
          `   - Berikan kalimat pembuka singkat yang mengonfirmasi penemuan jurnal terkait topik yang dicari.\n` +
          `   - **Daftar & Ringkasan Jurnal yang Ditemukan**: Uraikan setiap jurnal dengan jelas:\n` +
          `     • **Judul Jurnal**\n` +
          `     • **Penulis & Tahun**\n` +
          `     • **Nama Jurnal / Penerbit**\n` +
          `     • **Fokus & Metodologi**: Metode/algoritma/dataset yang dipakai.\n` +
          `     • **Temuan Utama / Hasil Penelitian**: Poin penting atau capaian akurasi/efektivitas riset.\n` +
          `     • **Akses / DOI**: Wajib sertakan tautan resmi markdown yang BISA DIKLIK langsung oleh pengguna, contoh: [https://doi.org/10.xxxx/...](https://doi.org/10.xxxx/...) atau [Buka Jurnal](https://doi.org/10.xxxx/...).\n` +
          `   - **Tabel Matriks Perbandingan Jurnal**: Buat tabel markdown yang rapi (Kolom: No, Judul & Penulis [buat judul menjadi link yang bisa diklik], Metode / Model, Temuan Utama / Hasil).\n` +
          `   - **Insight & Tren Riset**: Rangkuman padat mengenai arah riset dan temuan kunci terkait topik tersebut.\n` +
          `3. LARANGAN KERAS: JANGAN PERNAH membuat judul 'SINTESIS LITERATUR ILMIAH' atau bab makalah seperti '1. Pendahuluan', '2. Landasan Teori' dsb jika pengguna meminta pencarian/rekomendasi jurnal. Langsung sajikan informasi jurnal, tautan yang bisa diklik, dan pembahasannya sesuai yang diminta!`;

        let researchReply = "";
        try {
          researchReply = await callAiGeneration(researchPrompt);
        } catch {
          researchReply = retrievedSources.length
            ? `Ditemukan ${retrievedSources.length} referensi jurnal dari Crossref untuk topik **${query}**. AI belum memberi sintesis naratif pada percobaan ini, tetapi metadata dan abstrak yang tersedia dapat ditinjau pada daftar sumber di bawah.`
            : "Pencarian jurnal selesai, tetapi belum ada metadata yang dapat ditampilkan. Perjelas kata kunci lalu coba kembali.";
        }
        addAssistantMessage(researchReply, {
          sources: retrievedSources,
          journalScope,
          isAcademicResearch: true,
          query
        });
        return;
      }

      // ========================================================
      // KASUS 2: PENGGUNA MEMINTA PENYUSUNAN LENGKAP SKRIPSI DARI AWAL SAMPAI AKHIR
      // ========================================================
      if (isExplicitFullSkripsi) {
        if (titleInText) p.title = titleInText;
        if (!p.title && rawText.length >= 25) {
          p.title = rawText
            .replace(/^(?:kerjakan\s+judul\s+(?:ini\s+)?(?:lalu\s+)?(?:buatkan\s+)?(?:dengan\s+)?(?:lengkap\s+)?(?:baru\s+)?(?:dari\s+awal\s+sampai\s+akhir\s*:?)|(?:buatkan\s+lengkap\s+dari\s+awal\s+sampai\s+akhir\s*:?))/i, "")
            .replace(/["“”]/g, "")
            .trim();
        }

        if (!p.title) {
          addAssistantMessage("Silakan sebutkan topik atau judul skripsi Anda agar saya dapat menyusun draf lengkap dari awal sampai akhir.");
          return;
        }

        addAssistantMessage(`Memulai penyusunan draf skripsi lengkap dari awal sampai akhir untuk topik: **${p.title}**.\n\nMenelusuri literatur Crossref dan menyusun Bab I hingga Bab V serta Daftar Pustaka secara berkelanjutan...`);
        saveProject();

        await performCrossrefSearch(p.title);

        for (let ch = 1; ch <= 5; ch++) {
          p.stage = ch;
          await writeChapterSections(ch, rawText);
        }

        await finalizeProjectDocx();
        return;
      }

      // ========================================================
      // KASUS 3: PENGGUNA MEMINTA BAB TERTENTU SKRIPSI (MISAL BAB 1)
      // ========================================================
      if (isExplicitBab) {
        let requestedBab = 1;
        if (babMatch) {
          const r = babMatch[1].toLowerCase();
          const map = { "1": 1, "i": 1, "2": 2, "ii": 2, "3": 3, "iii": 3, "4": 4, "iv": 4, "5": 5, "v": 5 };
          requestedBab = map[r] || 1;
        }

        if (titleInText) p.title = titleInText;
        if (!p.title) {
          addAssistantMessage("Silakan sebutkan topik atau judul skripsi Anda terlebih dahulu sebelum memulai penyusunan Bab.");
          return;
        }

        await performCrossrefSearch(p.title);

        p.stage = requestedBab;
        await writeChapterSections(requestedBab, rawText);
        p.stage = requestedBab + 1;
        saveProject();

        const nextBab = requestedBab < 5 ? `Bab ${requestedBab + 1}` : "Daftar Pustaka";
        addAssistantMessage(
          `**Bab ${requestedBab} telah selesai disusun!**\n\n` +
          `Silakan tinjau draf di atas:\n` +
          `- Jika ada isi yang kurang atau ingin diperbaiki, Anda bisa langsung memberi tahu saya.\n` +
          `- Jika sudah sesuai, ketik **'Lanjut ke ${nextBab}'** atau **'Lanjutkan semuanya sampai selesai'**.`
        );
        return;
      }

      // ========================================================
      // KASUS 4: PENGGUNA HANYA MENYEBUTKAN JUDUL SKRIPSI (SARANKAN PILIHAN BAB 1 ATAU SEMUANYA)
      // ========================================================
      if (isExplicitSkripsiTitleOnly) {
        const extractedTitle = (titleInText || rawText)
          .replace(/^(?:kerjakan\s+judul\s*(?:ini\s*)?:?|judul\s*(?:skripsi|tugas\s+akhir|penelitian|tesis)\s*:?)\s*/i, "")
          .replace(/["“”]/g, "")
          .trim();
        p.title = extractedTitle || rawText;
        p.stage = 1;
        saveProject();

        addAssistantMessage(
          `Topik/Judul skripsi Anda: **${p.title}** telah berhasil dicatat.\n\n` +
          `Sebagai **AI Agents Akademik**, silakan tentukan langkah awal yang Anda inginkan:\n` +
          `1. **Buat Bab 1 Terlebih Dahulu** — Menyusun Bab 1 (Latar Belakang, Rumusan Masalah, Tujuan & Manfaat) secara bertahap untuk Anda tinjau.\n` +
          `2. **Buat Semuanya (Bab 1 s/d Bab 5 Lengkap)** — Menyusun seluruh draf lengkap dari awal sampai akhir beserta telaah jurnal Crossref dan dokumen Word (.docx) siap pakai.\n\n` +
          `Silakan ketik **'Bab 1'** atau **'Semuanya / Lengkap'** sesuai pilihan Anda.`
        );
        return;
      }

      // ========================================================
      // KASUS 5: REVISI / PERBAIKAN NASKAH SKRIPSI YANG SEDANG BERJALAN
      // ========================================================
      if (isRevision) {
        setAgentMode("thinking");
        setActivity("Memproses perbaikan naskah sesuai permintaan...");

        let targetBabKey = "";
        if (babMatch) {
          const rawNum = babMatch[1].toLowerCase();
          const map = { "1": "bab1", "i": "bab1", "2": "bab2", "ii": "bab2", "3": "bab3", "iii": "bab3", "4": "bab4", "iv": "bab4", "5": "bab5", "v": "bab5" };
          targetBabKey = map[rawNum] || "";
        } else if (/latar belakang|rumusan|tujuan|sistematika/i.test(rawText)) {
          targetBabKey = "bab1";
        } else if (/landasan teori|tinjauan pustaka|kajian pustaka|penelitian terdahulu/i.test(rawText)) {
          targetBabKey = "bab2";
        } else if (/metode|desain penelitian|populasi|sampel|instrumen/i.test(rawText)) {
          targetBabKey = "bab3";
        } else if (/hasil|pembahasan|keterbatasan/i.test(rawText)) {
          targetBabKey = "bab4";
        } else if (/kesimpulan|saran/i.test(rawText)) {
          targetBabKey = "bab5";
        } else if (/daftar pustaka|pustaka|referensi/i.test(rawText)) {
          targetBabKey = "pustaka";
        }

        const currentDraftForBab = targetBabKey ? p.chapters[targetBabKey] || "" : "";
        const allContext = JSON.stringify(p.chapters).slice(-35000);

        const aiResponse = await callAiGeneration(
          `Judul/Topik Riset: "${p.title || "Kajian Akademik"}"\n` +
          (targetBabKey ? `Bab yang Dituju: ${targetBabKey.toUpperCase()}\n` : "") +
          (currentDraftForBab ? `DRAF BAB SAAT INI:\n${currentDraftForBab.slice(-15000)}\n\n` : "") +
          (p.evidence ? `BUKTI & DATA EMPIRIS PENELITIAN:\n${p.evidence.slice(-20000)}\n\n` : "") +
          `KONTEKS KARYA ILMIAH KESELURUHAN:\n${allContext}\n\n` +
          `PERMINTAAN PERBAIKAN PENELITI:\n"${rawText}"\n\n` +
          `TUGAS UTAMA:\n` +
          `1. Fokus langsung perbaiki dan susun naskah akademik yang diperbaiki/ditambahkan sesuai instruksi peneliti.\n` +
          `2. Sajikan naskah revisi dengan format heading markdown resmi karya ilmiah.\n` +
          `3. Terapkan kaidah sitasi (Nama, Tahun) tanpa kode DOI di dalam teks.\n` +
          `4. Langsung berikan hasil revisi yang komprehensif, mendalam, dan siap dimasukkan ke naskah skripsi.`
        );

        if (targetBabKey && aiResponse) {
          p.chapters[targetBabKey] = aiResponse;
          saveProject();

          try {
            const updatedBlob = await generateAcademicSkripsiDocx({
              title: p.title || "KARYA ILMIAH AKADEMIK",
              studentName: "M PUTRA RAMADHANI",
              nim: "10121001",
              university: "UNIVERSITAS KOMPUTER INDONESIA",
              department: "PROGRAM STUDI TEKNIK INFORMATIKA",
              year: new Date().getFullYear(),
              chapters: p.chapters,
              sources: p.sources || []
            });
            setDocxBlob(updatedBlob);
          } catch (e) {}

          addAssistantMessage(
            `${aiResponse}\n\n*Naskah ${targetBabKey.toUpperCase()} telah diperbarui pada draf karya ilmiah dan dokumen Word (.docx) siap diunduh kembali.*`,
            { isFinalDocx: true, docxReady: true, skripsiTitle: p.title }
          );
        } else {
          addAssistantMessage(aiResponse);
        }
        return;
      }

      // ========================================================
      // KASUS 6: DEFAULT - PERTANYAAN PELAJARAN, MATERI KULIAH, & KONSULTASI AKADEMIK UMUM
      // ========================================================
      setAgentMode("thinking");
      setActivity("Memahami permintaan Anda...");

      const recentHistoryText = (messages || [])
        .slice(-8)
        .map((m) => `${m.role === "user" ? "Pengguna" : "AI Agents Akademik"}: ${m.content.slice(0, 1500)}`)
        .join("\n\n");

      const knownSourcesText = (p.sources && p.sources.length)
        ? p.sources.slice(0, 15).map((s, idx) => {
            const authors = (s.authors && s.authors.length) ? s.authors.join(", ") : "Penulis";
            const year = s.year || "t.t.";
            return `[Jurnal ${idx + 1}]\n- Judul: "${s.title}"\n- Penulis & Tahun: ${authors} (${year})\n- Jurnal: ${s.journal || "Jurnal Ilmiah"}\n- Abstrak/Temuan: ${s.abstract || "-"}\n- DOI/Link: ${s.doi ? `https://doi.org/${s.doi}` : (s.url || "-")}`;
          }).join("\n\n")
        : "";

      const memoryContext =
        (recentHistoryText ? `[RIWAYAT PERCAKAPAN SEBELUMNYA]:\n${recentHistoryText}\n\n` : "") +
        (knownSourcesText ? `[DATABASE JURNAL & LITERATUR YANG TELAH DITEMUKAN SEBELUMNYA]:\n${knownSourcesText}\n\n` : "") +
        (p.evidence ? `[BUKTI & DATA EMPIRIS PENELITIAN]:\n${p.evidence.slice(-15000)}\n\n` : "") +
        (p.title ? `[TOPIK/JUDUL SKRIPSI AKTIF]: "${p.title}"\n\n` : "");

      const intentAnalysis = await callAiAnalysis(rawText, memoryContext);
      await new Promise((resolve) => setTimeout(resolve, 60));
      setActivity("Menyusun respons...");

      const academicPrompt =
        `PERAN: Anda adalah AI Agents Akademik yang cerdas, responsif, dan solutif, siap membantu dalam berbagai kebutuhan akademik, skripsi, riset jurnal, analisis data, maupun konsultasi materi pelajaran.\n\n` +
        (memoryContext ? `KONTEKS & MEMORI RISET SEBELUMNYA:\n${memoryContext}\n` : "") +
        (intentAnalysis ? `[HASIL ANALISIS KEBUTUHAN PENGGUNA / REASONING ANALYSIS]:\n${intentAnalysis}\n\n` : "") +
        `PERMINTAAN / PERTANYAAN PENGGUNA:\n"${rawText}"\n\n` +
        `PANDUAN RESPONS:\n` +
        `1. BAHASA: WAJIB gunakan BAHASA YANG SAMA PERSIS dengan bahasa pengguna (English jika pengguna berbahasa Inggris, Bahasa Indonesia jika berbahasa Indonesia, dsb).\n` +
        `2. MEMORI & KONSISTENSI: Manfaatkan konteks riwayat percakapan dan data jurnal yang sudah ditemukan di atas jika pengguna menanyakan, merujuk, atau meminta telaah lebih lanjut dari percakapan sebelumnya.\n` +
        `3. Jawablah secara tepat sasaran dan fokus penuh pada apa yang diminta pengguna.\n` +
        `4. Jika sapaan/inquiry bantuan: Berikan sambutan ramah dan jelaskan secara ringkas kemampuan bantuan yang tersedia.\n` +
        `5. Jika materi/soal/rumus: Jelaskan secara mendalam, terstruktur, sistematis, dan tuntas.\n` +
        `6. TAUTAN & REFERENSI JURNAL: Jika mencantumkan jurnal, paper, atau sumber rujukan, WAJIB sertakan tautan URL/DOI dalam format link markdown yang BISA DIKLIK LANGSUNG oleh pengguna, contoh: [https://doi.org/10.xxxx/...](https://doi.org/10.xxxx/...) atau [Judul Jurnal](https://doi.org/10.xxxx/...).\n` +
        `7. Sajikan jawaban dengan format markdown yang rapi tanpa emoji dekoratif.`;

      const academicResponse = await callAiGeneration(academicPrompt);
      if (!academicResponse || !academicResponse.trim()) {
        throw new Error("Respons akademik kosong dari AI. Silakan coba lagi atau gunakan model berbeda.");
      }
      addAssistantMessage(academicResponse, { query: rawText, reasoning: intentAnalysis });
      return;
    } catch (error) {
      saveProject();
      if (project.current.pendingDraft?.text) {
        addAssistantMessage(project.current.pendingDraft.text + "\n\n[Draf sementara — belum selesai]");
      }
      const isSkripsiDraft = Boolean(project.current.stage > 0 && project.current.title && Object.keys(project.current.chapters || {}).length > 0);
      const suffixMsg = isSkripsiDraft
        ? "\nSubbab yang selesai tetap tersimpan. Kirim pesan untuk melanjutkan."
        : "\nSilakan kirim pesan lagi atau coba beberapa saat kemudian.";
      addAssistantMessage(error.name === "AbortError" ? "Pekerjaan dihentikan." : error.message + suffixMsg);
    } finally {
      runController.current = null;
      setIsRunning(false);
      setAgentMode("idle");
      setActivity("");
      setLiveDraft("");
    }
  };

  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());
  const currentMonthKey = todayKey.slice(0, 7);
  const agentsUsage = userProfile?.agentsUsage || {};

  const isPlus = userPlan === "plus";
  const agentsTokenLimit = isPlus ? 40000 : 5000;
  const usedTokens = isPlus
    ? (agentsUsage.date === todayKey ? Number(agentsUsage.dailyTokens || 0) : 0)
    : (agentsUsage.month === currentMonthKey ? Number(agentsUsage.monthTokens || 0) : 0);
  const isLimitReached = usedTokens >= agentsTokenLimit;
  const limitNotice = isLimitReached ? (isPlus ? "Token limit harian Agents Anda sudah habis. Kuota akan di-reset besok pukul 00.00 WIB." : "Token limit bulanan Agents Anda sudah habis. Kuota akan di-reset pada awal bulan berikutnya.") : "";

  const handleSend = (value, attachments = []) => {
    if (isLimitReached) {
      addAssistantMessage(
        isPlus
          ? "⚠️ **Batas Kuota Harian AI Agents Akademik Tercapai**\n\n" +
            "Kuota 40.000 token untuk Paket Plus Anda telah tercapai untuk hari ini. Kuota akan otomatis di-reset besok pukul 00:00 WIB."
          : "⚠️ **Batas Kuota Bulanan AI Agents Akademik Tercapai**\n\n" +
            "Kuota 5.000 token untuk Paket Free Anda telah tercapai untuk bulan ini. Kuota akan otomatis di-reset pada awal bulan berikutnya, atau silakan **Upgrade ke Paket Plus** untuk mendapatkan 40.000 token setiap hari!"
      );
      return;
    }
    const text = value.trim() || (attachments.length ? "Analisis lampiran penelitian ini untuk tahap saat ini." : "");
    if (!text || isRunning) return;
    currentAttachments.current = attachments;
    const extracted = attachments.filter((file) => file.extractedText).map((file) => `${file.name}:\n${file.extractedText}`).join("\n");
    if (extracted) project.current.evidence += "\n" + extracted;

    const timeStr = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const userMsg = {
      id: `user_${Date.now()}`,
      role: "user",
      at: timeStr,
      content: text,
      attachments
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Reset tinggi textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Jalankan alur agent
    startAutonomousWorkflow(text);
  };

  const handleDownloadDocx = async (title) => {
    try {
      let blob = docxBlob;
      if (!blob) {
        blob = await generateAcademicSkripsiDocx({
          title: title || docChapters.title || "SKRIPSI AKADEMIK",
          studentName: "[NAMA MAHASISWA]",
          nim: "[NIM]",
          university: "[NAMA UNIVERSITAS]",
          department: "[PROGRAM STUDI]",
          year: new Date().getFullYear(),
          chapters: {
            bab1: docChapters.bab1,
            bab2: docChapters.bab2,
            bab3: docChapters.bab3,
            bab4: docChapters.bab4,
            bab5: docChapters.bab5,
            pustaka: docChapters.pustaka
          }
        });
        setDocxBlob(blob);
      }

      const filename = `${(title || docChapters.title || "Skripsi_Final").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 45)}.docx`;
      downloadBlob(blob, filename);
    } catch (err) {
      console.error("Download DOCX error:", err);
      alert("Gagal mengunduh dokumen DOCX. Silakan coba beberapa saat lagi.");
    }
  };

  const handleSendSuggestion = (text) => {
    if (!text || isRunning || isLimitReached) return;
    const timeStr = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const userMsg = {
      id: `user_${Date.now()}`,
      role: "user",
      at: timeStr,
      content: text
    };
    setMessages([userMsg]);
    setInput("");
    startAutonomousWorkflow(text);
  };

  const resetAgentsBrain = () => {
    if (runController.current) {
      try { runController.current.abort(); } catch {}
      runController.current = null;
    }
    setMessages([]);
    setInput("");
    setIsRunning(false);
    setDocxBlob(null);
    setDocChapters({
      title: "",
      bab1: "",
      bab2: "",
      bab3: "",
      bab4: "",
      bab5: "",
      pustaka: ""
    });
    setLiveDraft("");
    setLiveReasoning("");
    setExpandedThoughts({});
    setActivity("");
    setIsContentOpen(false);
    setAgentMode("idle");
    setResearchSources([]);
    currentAttachments.current = [];
    project.current = {
      stage: 0,
      title: "",
      chapters: {},
      evidence: "",
      pendingDraft: null,
      sources: [],
      sourceOffset: null,
      sectionIndex: 0
    };
    try {
      localStorage.removeItem("val_ai_skripsi_chat_history");
      localStorage.removeItem("skripsi_project_v2");
      sessionStorage.removeItem("val_ai_skripsi_chat_history");
      sessionStorage.removeItem("skripsi_project_v2");
    } catch {}
  };

  const handleResetChat = () => {
    resetAgentsBrain();
    // Untuk agents mode: hanya reset chat, JANGAN alihkan halaman
    // Tombol "Chat Baru" akan tetap di agents dan mulai chat baru di sana
  };

  useEffect(() => {
    const handleResetEvent = () => {
      resetAgentsBrain();
    };
    window.addEventListener("val_ai_reset_agents", handleResetEvent);
    return () => window.removeEventListener("val_ai_reset_agents", handleResetEvent);
  }, []);

  const inChat = messages.length > 0;

  return (
    <div className="agent-chat-main">
      {/* Topbar matching main chat page */}
      <div className={`topbar ${inChat ? "visible" : ""}`}>
        <div />
        {inChat && (
          <button className="new-chat-btn" disabled={isRunning} onClick={handleResetChat}>
            {t?.sidebarNew || "Chat baru"}
          </button>
        )}
      </div>

      {/* Landing View (Sebelum chat dimulai - 100% konsisten dengan halaman chat utama) */}
      {!inChat && (
        <div className="landing">
          <div className="landing-inner">
            <h1 className="val-mark">AI Agents Akademik</h1>
            <p className="val-desc-lead">
              Asisten akademik & riset serbabisa: konsultasi pelajaran & materi kuliah, pencarian dan ekstraksi data riset dari jurnal ilmiah (Crossref), analisis dataset CSV, hingga bimbingan karya ilmiah dan skripsi.
            </p>

            <div className="suggestions">
              {[
                "Tanya Konsep Pelajaran & Materi Kuliah",
                "Ambil Data Riset dari Jurnal Ilmiah",
                "Analisis Dataset CSV & File Jurnal",
                "Penyusunan Skripsi Lengkap (Bab I - V)"
              ].map((sugg, i) => (
                <button
                  key={i}
                  type="button"
                  className="suggestion-btn"
                  onClick={() => handleSendSuggestion(sugg)}
                  disabled={isRunning || isLimitReached}
                >
                  {sugg}
                </button>
              ))}
            </div>

            <div className="composer-wrap">
              <ComposerComponent
                onSend={handleSend}
                disabled={isRunning || isLimitReached}
                selectedModel={selectedModel}
                onSelectModel={onSelectModel}
                isLimitReached={isLimitReached}
                limitNotice={limitNotice}
                onNew={handleResetChat}
                userPlan={userPlan}
                onUpgrade={onUpgrade}
                t={t}
                hintText="AI Agents Akademik dapat membuat kesalahan. Periksa info penting lagi."
                placeholderText="Kirim pesan ke AI Agents Akademik…"
                showModelPicker={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* Conversation Scroll Area (Ketika alur skripsi aktif / inChat) */}
      {inChat && (
        <>
          <div className="conversation">
            <div className="conversation-inner">
              {messages.map((message) => {
                const isUser = message.role === "user";
                const messageSources = message.sources || (!isUser && message.content?.startsWith("Ditemukan ") && message.content.includes("kandidat jurnal dari Crossref") ? researchSources : []);
                return (
                  <div
                    key={message.id}
                    className={`msg ${isUser ? "user" : "val"} settled`}
                  >
                    <div className="msg-head">
                      <span className="msg-name">
                        {isUser ? (
                          <span className="msg-user-name-wrap">
                            <span>{t?.you || "Anda"}</span>
                          </span>
                        ) : (
                          <span className="msg-ai-name-wrap">
                            <img src={brandLogo} alt="" className="msg-ai-avatar" />
                            <span>AI Agents Akademik</span>
                          </span>
                        )}
                      </span>
                    </div>

                    {!!message.attachments?.length && <div className="msg-attachments-standalone">
                      {message.attachments.map((file, index) => file.isImage && file.dataUrl ? (
                        <div className="msg-standalone-photo-wrap" key={index}>
                          <img src={file.dataUrl} alt={file.name || "Foto"} className="msg-standalone-photo" />
                        </div>
                      ) : (
                        <div className="msg-attachment-file-card" key={index}>
                          <span className="attachment-file-icon">FILE</span>
                          <span className="msg-attachment-file-name">{file.name}</span>
                        </div>
                      ))}
                    </div>}
                    <div className="msg-body">
                      {/* Tampilkan proses berpikir asli jika tersedia pada pesan riwayat (tertutup secara default agar rapi) */}
                      {message.reasoning && (() => {
                        const isExpanded = Boolean(expandedThoughts[message.id]);
                        return (
                          <div className="agent-action-block settled-thought" style={{ marginBottom: 12 }}>
                            <button
                              type="button"
                              className="agent-action-header-btn"
                              onClick={() => toggleThought(message.id)}
                              aria-expanded={isExpanded}
                              title={isExpanded ? "Sembunyikan proses berpikir" : "Lihat proses berpikir"}
                            >
                              <ThinkingIcon className="agent-action-icon thinking" />
                              <span className="agent-action-label">Proses berpikir AI</span>
                              <span className={`agent-action-chevron ${isExpanded ? "open" : ""}`} aria-hidden="true">
                                <ChevronDownIcon />
                              </span>
                            </button>
                            {isExpanded && (
                              <div className="agent-action-content-view" role="region" aria-label="Proses berpikir AI">
                                <div className="agent-thinking-reasoning">
                                  <ChatMessageBody content={stripProviderSafetyMetadata(message.reasoning)} t={t} onSelectQuery={(q) => handleSend(q)} />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      <ChatMessageBody content={message.content} t={t} onSelectQuery={(q) => handleSend(q)} />
              {messageSources.length > 0 && <details className="research-sources">
                <summary><span>Referensi jurnal</span><span className="research-sources-count">{messageSources.length} sumber</span></summary>
                <p className="research-sources-note">{message.journalScope === "national" ? "Diprioritaskan dari metadata berbahasa Indonesia. " : message.journalScope === "international" ? "Diprioritaskan dari metadata berbahasa asing. " : "Hasil sesuai kata kunci Crossref. "}Klasifikasi berdasarkan metadata Crossref; isi teks lengkap tetap perlu ditinjau pada penerbit.</p>
                <div className="research-source-list">
                {messageSources.map((source, index) => <article key={source.doi} className="research-source-item">
                  <div className="research-source-topline"><span className="research-source-number">{String(index + 1).padStart(2, "0")}</span><span className="research-source-kind">{source.abstract ? "Ringkasan abstrak" : "Data publikasi"}</span></div>
                  <a className="research-source-title" href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>
                  <p className="research-source-meta">{(source.authors || []).join(", ") || "Penulis belum tersedia"}<span>·</span>{source.year || "Tahun tidak tersedia"}<span>·</span>{source.journal || "Jurnal belum tersedia"}</p>
                  {source.abstract && <div className="research-source-reading"><span>Abtrak</span><p className="research-source-abstract">{source.abstract}</p></div>}
                  {!!source.updates?.length && <p className="research-source-update">Publikasi memiliki catatan pembaruan; periksa laman penerbit.</p>}
                </article>)}
                </div>
              </details>}

                      {/* Kartu Download DOCX jika task skripsi telah selesai */}
                      {message.isFinalDocx && (
                        <div className="chat-docx-download-card">
                          <div className="chat-docx-card-info">
                            <div className="chat-docx-card-icon">
                              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                              </svg>
                            </div>
                            <div className="chat-docx-card-text">
                              <strong>Draf_Karya_Ilmiah.docx</strong>
                              <small>Draf karya ilmiah akademik lengkap siap disunting.</small>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="chat-docx-download-btn"
                            onClick={() => handleDownloadDocx(message.skripsiTitle)}
                          >
                            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Unduh Dokumen (.docx)
                          </button>
                        </div>
                      )}
                    </div>
                    <span className="msg-time msg-time-below">{message.at}</span>
                  </div>
                );
              })}

              {/* Status Loading / Autonomous Action Row (100% konsisten dengan chat, logo resmi, bisa lihat isinya) */}
              {isRunning && (
                <div className="msg val settled">
                  <div className="msg-head">
                    <span className="msg-name">
                      <span className="msg-ai-name-wrap">
                        <img src={brandLogo} alt="" className="msg-ai-avatar" />
                        <span>AI Agents Akademik</span>
                      </span>
                    </span>
                  </div>
                  <div className="msg-body">
                    <div className="agent-action-block">
                      <button
                        type="button"
                        className="agent-action-header-btn"
                        onClick={() => setIsContentOpen((prev) => !prev)}
                        aria-expanded={isContentOpen}
                        title={isContentOpen ? "Sembunyikan proses berpikir" : "Lihat proses berpikir"}
                      >
                        {agentMode === "writing" ? (
                          <PencilIcon className="agent-action-icon writing" />
                        ) : (
                          <ThinkingIcon className="agent-action-icon thinking" />
                        )}
                        <span className="agent-action-label" role="status">
                          {agentMode === "writing" ? (activity || "Menyusun jawaban akademik...") : (activity || "Berpikir...")}
                        </span>
                        <span className={`agent-action-chevron ${isContentOpen ? "open" : ""}`} aria-hidden="true">
                          <ChevronDownIcon />
                        </span>
                      </button>

                      {/* Dropdown lihat proses berpikir */}
                      {isContentOpen && (liveReasoning || agentMode === "thinking") && (
                        <div className="agent-action-content-view" role="region" aria-label="Proses berpikir AI">
                          <div className="agent-thinking-reasoning">
                            {(() => {
                              const cleanReasoning = stripProviderSafetyMetadata(liveReasoning);
                              if (cleanReasoning) {
                                return <ChatMessageBody content={cleanReasoning} t={t} onSelectQuery={(q) => handleSend(q)} />;
                              }
                              if (agentMode === "thinking") {
                                return (
                                  <span className="agent-thinking-placeholder">
                                    Sedang menelaah konsep dan menjalankan penalaran ilmiah...
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Teks jawaban langsung (live stream) berada terpisah di bawah blok berpikir */}
                    {liveDraft && (
                      <div className="agent-live-stream-text" style={{ marginTop: 4 }}>
                        <ChatMessageBody content={liveDraft} t={t} onSelectQuery={(q) => handleSend(q)} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* Composer Input Bar */}
          <div className="composer-zone">
            <div className="composer-wrap">
              <ComposerComponent
                onSend={handleSend}
                disabled={isRunning || isLimitReached}
                selectedModel={selectedModel}
                onSelectModel={onSelectModel}
                isLimitReached={isLimitReached}
                limitNotice={limitNotice}
                onNew={handleResetChat}
                userPlan={userPlan}
                onUpgrade={onUpgrade}
                t={t}
                hintText="AI Agents Akademik - AI dapat membuat kesalahan. Periksa info penting lagi."
                placeholderText="Kirim pesan ke AI Agents Akademik…"
                showModelPicker={false}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
