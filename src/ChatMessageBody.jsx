import React, { useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

export function CodeBlock({ language, code, t }) {
  const [copied, setCopied] = useState(false);
  const copyLabel = t?.copyCode || "Salin";
  const copiedLabel = t?.copiedCode || "Tersalin";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("Gagal menyalin kode:", err);
    }
  };

  const displayLang = language && language !== "code" ? language : "code";

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <div className="code-header-left">
          <span className="code-lang-icon">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </span>
          <span className="code-lang-name">{displayLang}</span>
        </div>

        <button
          type="button"
          className={`code-copy-btn ${copied ? "copied" : ""}`}
          onClick={handleCopy}
          title={copyLabel}
          aria-label={copyLabel}
        >
          {copied ? (
            <>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{copiedLabel}</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>{copyLabel}</span>
            </>
          )}
        </button>
      </div>

      <pre className="code-block-pre">
        <code className={`code-block-code language-${displayLang}`}>{code}</code>
      </pre>
    </div>
  );
}

export function MathBlock({ formula, t }) {
  const [copied, setCopied] = useState(false);
  const copyLabel = t?.copyFormula || "Salin Rumus";
  const copiedLabel = t?.copiedFormula || "Tersalin";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formula);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("Gagal menyalin rumus:", err);
    }
  };

  let renderedHtml = "";
  let renderError = false;
  try {
    renderedHtml = katex.renderToString(formula, {
      displayMode: true,
      throwOnError: false,
      strict: false,
    });
  } catch {
    renderError = true;
  }

  return (
    <div className="math-block-wrapper" role="region" aria-label="Rumus Matematika">
      <div className="math-block-header">
        <div className="math-header-left">
          <span className="math-icon">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16v3l-10 7 10 7v3H4" />
            </svg>
          </span>
          <span className="math-badge-title">RUMUS / FORMULA</span>
        </div>
        <button
          type="button"
          className={`math-copy-btn ${copied ? "copied" : ""}`}
          onClick={handleCopy}
          title="Salin notasi rumus LaTeX"
          aria-label={copyLabel}
        >
          {copied ? (
            <>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{copiedLabel}</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>{copyLabel}</span>
            </>
          )}
        </button>
      </div>

      <div className="math-block-body">
        {renderError ? (
          <pre className="math-raw-fallback">{formula}</pre>
        ) : (
          <div
            className="katex-display-wrapper"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        )}
      </div>
    </div>
  );
}

export function TableBlock({ headers, rows, alignments }) {
  const [copied, setCopied] = useState(false);

  const handleCopyTable = async () => {
    try {
      // Salin sebagai format TSV (Tab Separated) agar dapat langsung di-paste ke Excel / Word
      const tsvHeader = headers.join("\t");
      const tsvRows = rows.map((r) => r.join("\t")).join("\n");
      const fullTsv = `${tsvHeader}\n${tsvRows}`;
      await navigator.clipboard.writeText(fullTsv);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn("Gagal menyalin tabel:", e);
    }
  };

  return (
    <div className="chat-table-wrapper" role="region" aria-label="Tabel Data">
      <div className="chat-table-header">
        <div className="chat-table-header-left">
          <span className="chat-table-icon">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
              <path d="M3 15h18" />
              <path d="M9 3v18" />
              <path d="M15 3v18" />
            </svg>
          </span>
          <span className="chat-table-title">TABEL DATA</span>
        </div>
        <button
          type="button"
          className={`chat-table-copy-btn ${copied ? "copied" : ""}`}
          onClick={handleCopyTable}
          title="Salin tabel (format Excel / Word)"
        >
          {copied ? (
            <>
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Tersalin</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>Salin Tabel</span>
            </>
          )}
        </button>
      </div>
      <div className="chat-table-scroll">
        <table className="academic-table">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} style={{ textAlign: alignments[i] || "left" }}>
                  {renderInlineText(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr key={rIdx}>
                {row.map((cell, cIdx) => (
                  <td key={cIdx} style={{ textAlign: alignments[cIdx] || "left" }}>
                    {renderInlineText(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ElicitationsBlock() {
  return null;
}

export function InlineMath({ formula }) {
  try {
    // Normalisasi koma desimal Indonesia dalam rumus (misal 80,00% -> {80,00}\%) agar KaTeX tidak memberi spasi pemisah argumen
    const normalized = (formula || "").replace(/(\d+),(\d+)/g, "{$1,$2}");
    const html = katex.renderToString(normalized, {
      displayMode: false,
      throwOnError: false,
      strict: false,
    });
    return <span className="katex-inline-wrapper" dangerouslySetInnerHTML={{ __html: html }} />;
  } catch {
    return <code className="inline-code math-fallback">{formula}</code>;
  }
}

export function stripCheckmarkAndCrossEmojis(raw) {
  if (!raw) return "";
  return raw
    .replace(/[✅☑️✔️✓❌❎✖️✕✗✘]/gu, "")
    .replace(/[\u2705\u2713\u2714\u2611\u274C\u274E\u2716\u2715\u2717\u2718]/g, "");
}

export function sanitizeTextToken(rawText) {
  if (!rawText) return "";
  let s = stripCheckmarkAndCrossEmojis(rawText);
  // Jika seluruh token hanya berisi asterisk (misal sisa "*" atau "**" atau "***"), buang seluruhnya
  if (/^\s*\*+\s*$/.test(s)) return "";
  // Hapus 2 atau lebih asterisk berturut-turut di dalam teks biasa
  s = s.replace(/\*{2,}/g, "");
  // Hapus asterisk yang menempel di tanda baca (misal :* atau :**)
  s = s.replace(/([.,:;!?])\*+/g, "$1");
  // Hapus asterisk di awal token jika langsung diikuti huruf/angka tanpa spasi
  s = s.replace(/^(\s*)\*(?=[A-Za-z0-9\u00C0-\u024F\u1E00-\u1EFF])/g, "$1");
  // Hapus asterisk di akhir token jika langsung didahului huruf/angka
  s = s.replace(/(?<=[A-Za-z0-9\u00C0-\u024F\u1E00-\u1EFF])\*(\s*)$/g, "$1");
  return s;
}

export function cleanItemTitle(raw) {
  if (!raw) return "";
  let s = stripCheckmarkAndCrossEmojis(raw).trim();

  // Cek apakah judul diawali asterisk dan diakhiri asterisk
  const matchEnclosed = s.match(/^(\*+)([\s\S]+?)(\*+)$/);
  if (matchEnclosed) {
    const leadStars = matchEnclosed[1].length;
    const inner = matchEnclosed[2].trim();
    const trailStars = matchEnclosed[3].length;

    // Jika jumlah bintang tidak seimbang (misal *...*** atau **...*** atau ***...*)
    // atau jika bintang >= 3 (misal ***...*** atau ****...****):
    // Rapikan menjadi **inner** (bold bersih standar tanpa sisa bintang)
    if (leadStars !== trailStars || leadStars >= 3) {
      return `**${inner}**`;
    }
  }

  // Bersihkan sisa asterisk berlebih di ujung judul (misal "Judul***" atau "Label:***")
  s = s.replace(/([.,:;!?\w])\*{2,}\s*$/g, "$1");
  return s;
}

export function parseInline(text) {
  if (!text) return [];
  const tokens = [];
  // Pola regex:
  // 1. Markdown link: [text](url)
  // 2. Inline code: `...`
  // 3. Inline math \(...\): \(...\)
  // 4. Inline math $...$: $...$
  // 5. Standalone URL: https://...
  // 6. Triple asterisks ***...***: bold
  // 7. Bold: **...**
  // 8. Italic: *...*
  // 9. Standalone underscore italic: _..._
  const inlineRegex = /(\[[^\]\n]+\]\((?:https?:\/\/[^\s\)]+|www\.[^\s\)]+|doi:[^\s\)]+)\)|`[^`]+`|\\\([\s\S]+?\\\)|\$(?!\$)(?:\\\$|[^\$\n])+?\$|https?:\/\/[^\s<>"'\)\]]+|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|(?<=\s|^)_[^_]+_(?=\s|$|[.,:;!?]))/g;
  let lastIdx = 0;
  let match;

  while ((match = inlineRegex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      const rawText = text.slice(lastIdx, match.index);
      const cleaned = sanitizeTextToken(rawText);
      if (cleaned) tokens.push({ type: "text", content: cleaned });
    }
    const raw = match[0];
    if (raw.startsWith("[") && raw.includes("](") && raw.endsWith(")")) {
      const matchLink = raw.match(/^\[([^\]\n]+)\]\(([^)]+)\)$/);
      if (matchLink) {
        const textPart = matchLink[1];
        let urlPart = matchLink[2].trim();
        if (urlPart.startsWith("www.")) urlPart = "https://" + urlPart;
        if (urlPart.startsWith("doi:")) urlPart = "https://doi.org/" + urlPart.slice(4).trim();
        tokens.push({ type: "link", content: sanitizeTextToken(textPart) || textPart, href: urlPart });
      }
    } else if (/^https?:\/\//i.test(raw)) {
      tokens.push({ type: "link", content: raw, href: raw });
    } else if (raw.startsWith("`") && raw.endsWith("`")) {
      tokens.push({ type: "code", content: raw.slice(1, -1) });
    } else if (raw.startsWith("\\(") && raw.endsWith("\\)")) {
      tokens.push({ type: "inline-math", content: raw.slice(2, -2) });
    } else if (raw.startsWith("$") && raw.endsWith("$")) {
      tokens.push({ type: "inline-math", content: raw.slice(1, -1) });
    } else if (raw.startsWith("***") && raw.endsWith("***")) {
      tokens.push({ type: "bold", content: sanitizeTextToken(raw.slice(3, -3)) });
    } else if (raw.startsWith("**") && raw.endsWith("**")) {
      tokens.push({ type: "bold", content: sanitizeTextToken(raw.slice(2, -2)) });
    } else if (raw.startsWith("*") && raw.endsWith("*")) {
      tokens.push({ type: "italic", content: sanitizeTextToken(raw.slice(1, -1)) });
    } else if (raw.startsWith("_") && raw.endsWith("_")) {
      tokens.push({ type: "italic", content: sanitizeTextToken(raw.slice(1, -1)) });
    }
    lastIdx = inlineRegex.lastIndex;
  }

  if (lastIdx < text.length) {
    const rawText = text.slice(lastIdx);
    const cleaned = sanitizeTextToken(rawText);
    if (cleaned) tokens.push({ type: "text", content: cleaned });
  }
  return tokens;
}

export function renderInlineText(text) {
  const tokens = parseInline(text);
  return tokens.map((tok, i) => {
    if (tok.type === "link") {
      return (
        <a
          key={i}
          href={tok.href}
          target="_blank"
          rel="noopener noreferrer"
          className="chat-markdown-link"
          title={`Buka tautan: ${tok.href}`}
        >
          <span>{tok.content}</span>
          <svg
            className="chat-link-external-icon"
            viewBox="0 0 24 24"
            width="11"
            height="11"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ marginLeft: 3, verticalAlign: "middle", display: "inline-block" }}
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      );
    }
    if (tok.type === "code") {
      return (
        <code key={i} className="inline-code">
          {tok.content}
        </code>
      );
    }
    if (tok.type === "inline-math") {
      return <InlineMath key={i} formula={tok.content} />;
    }
    if (tok.type === "bold") {
      return <strong key={i}>{tok.content}</strong>;
    }
    if (tok.type === "italic") {
      return <em key={i}>{tok.content}</em>;
    }
    return tok.content;
  });
}

function isTableSeparator(line) {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return false;
  const parts = trimmed.split("|").map((s) => s.trim()).filter((s, idx, arr) => {
    if ((idx === 0 || idx === arr.length - 1) && s === "") return false;
    return true;
  });
  return parts.length > 0 && parts.every((p) => /^:?-{2,}:?$/.test(p));
}

function isTableRow(line) {
  const trimmed = line.trim();
  return trimmed.startsWith("|") || (trimmed.includes("|") && trimmed.endsWith("|"));
}

export function parseMarkdownTable(lines) {
  if (lines.length < 2) return null;
  const headerLine = lines[0].trim();
  const sepLine = lines[1].trim();

  const sepCells = sepLine.split("|").map((s) => s.trim()).filter((s, idx, arr) => {
    if ((idx === 0 || idx === arr.length - 1) && s === "") return false;
    return true;
  });

  if (sepCells.length === 0 || !sepCells.every((c) => /^:?-+:?$/.test(c))) return null;

  const alignments = sepCells.map((c) => {
    const left = c.startsWith(":");
    const right = c.endsWith(":");
    if (left && right) return "center";
    if (right) return "right";
    return "left";
  });

  const parseCells = (line) => {
    const cells = line.trim().split("|").map((c) => c.trim());
    if (cells[0] === "") cells.shift();
    if (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();
    return cells;
  };

  const headers = parseCells(headerLine);
  const rows = [];
  for (let i = 2; i < lines.length; i++) {
    const rowLine = lines[i].trim();
    if (!rowLine || !rowLine.includes("|")) continue;
    rows.push(parseCells(rowLine));
  }

  return { headers, rows, alignments };
}

export function parseMarkdownBlocks(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let currentParagraph = [];
  let currentList = null;
  let currentTableLines = [];
  let blankLineSinceLastContent = false;

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      blocks.push({ type: "p", content: currentParagraph.join("\n") });
      currentParagraph = [];
    }
  };

  const flushList = () => {
    if (currentList && currentList.items.length > 0) {
      // Jika list bernomor (ol) hanya memiliki 1 item dan tanpa subItems,
      // normalkan menjadi ul (bullet) agar tidak tampak ganjil ada angka '1.' sendirian
      if (currentList.type === "ol" && currentList.items.length === 1 && (!currentList.items[0].subItems || currentList.items[0].subItems.length === 0)) {
        currentList.type = "ul";
      }
      blocks.push(currentList);
      currentList = null;
    }
  };

  const flushTable = () => {
    if (currentTableLines.length >= 2) {
      const parsed = parseMarkdownTable(currentTableLines);
      if (parsed) {
        blocks.push({ type: "table", ...parsed });
        currentTableLines = [];
        return;
      }
    }
    if (currentTableLines.length > 0) {
      currentParagraph.push(...currentTableLines);
      currentTableLines = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Baris kosong
    if (!trimmed) {
      flushTable();
      flushParagraph();
      blankLineSinceLastContent = true;
      continue;
    }

    // Deteksi tabel markdown
    if (currentTableLines.length === 0) {
      if (isTableRow(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
        flushParagraph();
        flushList();
        blankLineSinceLastContent = false;
        currentTableLines.push(line);
        continue;
      }
    } else {
      if (isTableRow(line) || isTableSeparator(line)) {
        currentTableLines.push(line);
        continue;
      } else {
        flushTable();
      }
    }

    // Pembatas garis (---, ***, ___)
    if (/^(?:---|\*\*\*|___)$/.test(trimmed)) {
      flushParagraph();
      flushList();
      blankLineSinceLastContent = false;
      blocks.push({ type: "hr" });
      continue;
    }

    // Abaikan baris heading kosong (seperti "###" atau "#")
    if (/^#{1,6}\s*$/.test(trimmed)) {
      continue;
    }

    // Heading #, ##, ###, #### or academic headings like "4.3.2 Keterbatasan"
    const headingMatch = line.match(/^(#{1,6})\s*(.*)$/) || line.match(/^(\d+(?:\.\d+){2,})\s+([A-Z].*)$/);
    if (headingMatch) {
      const headingContent = headingMatch[1].startsWith("#") ? headingMatch[2] : `${headingMatch[1]} ${headingMatch[2]}`;
      const cleanHeading = headingContent.replace(/^\*+|\*+$/g, "").trim();
      if (!cleanHeading) {
        continue;
      }
      flushParagraph();
      flushList();
      blankLineSinceLastContent = false;
      const level = headingMatch[1].startsWith("#") ? Math.min(4, Math.max(1, headingMatch[1].length)) : Math.min(4, headingMatch[1].split(".").length);
      blocks.push({ type: "h" + level, content: cleanHeading });
      continue;
    }

    // Blockquote >
    const bqMatch = line.match(/^>\s?(.*)$/);
    if (bqMatch) {
      flushParagraph();
      flushList();
      blankLineSinceLastContent = false;
      blocks.push({ type: "quote", content: bqMatch[1] });
      continue;
    }

    // List tidak bernomor (*, -, •, +)
    const ulMatch = line.match(/^[\*\-\•\+]\s+(.*)$/);
    if (ulMatch) {
      flushParagraph();
      const itemTitle = cleanItemTitle(ulMatch[1]);
      // Jika sedang di dalam ol yang hanya punya 1 item, ubah list menjadi ul agar seragam
      if (currentList && currentList.type === "ol") {
        if (currentList.items.length === 1 && (!currentList.items[0].subItems || currentList.items[0].subItems.length === 0)) {
          currentList.type = "ul";
        } else if (currentList.items.length > 0) {
          const lastOlItem = currentList.items[currentList.items.length - 1];
          lastOlItem.subItems = lastOlItem.subItems || [];
          lastOlItem.subItems.push(itemTitle);
          blankLineSinceLastContent = false;
          continue;
        }
      }
      if (!currentList || currentList.type !== "ul") {
        flushList();
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push({
        title: itemTitle,
        body: [],
        subItems: [],
      });
      blankLineSinceLastContent = false;
      continue;
    }

    // List bernomor (1., 2., dst.)
    const olMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      flushParagraph();
      const rawNum = parseInt(olMatch[1], 10);
      const itemTitle = cleanItemTitle(olMatch[2]);

      // Cek apakah ada nomor lanjutan (2., 3.) di baris-baris berikutnya
      let hasSubsequentNumbers = false;
      for (let j = i + 1; j < lines.length; j++) {
        const checkTrimmed = lines[j].trim();
        if (/^#{1,6}\s+|^(?:---|\*\*\*|___)$/.test(checkTrimmed)) break;
        if (/^\d+\.\s+/.test(checkTrimmed)) {
          hasSubsequentNumbers = true;
          break;
        }
      }

      // Jika hanya ada angka '1.' tunggal dan tidak ada angka berikutnya, buat sebagai bullet 'ul'
      if (rawNum === 1 && !hasSubsequentNumbers && (!currentList || currentList.type !== "ol")) {
        flushList();
        currentList = {
          type: "ul",
          items: [
            {
              title: itemTitle,
              body: [],
              subItems: [],
            },
          ],
        };
        blankLineSinceLastContent = false;
        continue;
      }

      if (!currentList || currentList.type !== "ol") {
        flushList();
        currentList = {
          type: "ol",
          start: rawNum || 1,
          items: [
            {
              num: rawNum || 1,
              title: itemTitle,
              body: [],
              subItems: [],
            },
          ],
        };
      } else {
        const lastItem = currentList.items[currentList.items.length - 1];
        let nextNum;
        if (rawNum > lastItem.num) {
          nextNum = rawNum;
        } else {
          // Lazy numbering 1., 1. -> 1, 2, 3...
          nextNum = lastItem.num + 1;
        }
        currentList.items.push({
          num: nextNum,
          title: itemTitle,
          body: [],
          subItems: [],
        });
      }
      blankLineSinceLastContent = false;
      continue;
    }

    // Jika sedang dalam list (ol atau ul), apakah baris ini adalah paragraf penjelasan (body)?
    if (currentList && currentList.items.length > 0) {
      const lastItem = currentList.items[currentList.items.length - 1];

      // Jika baris ini adalah label tebal baru (misal **Kebutuhan:** atau **Rencana:**), jadikan item baru di dalam ul
      const isKeyLabel = /^(\*\*[^*]+(?:\*\*:|:\*\*|\*\*)|[A-Za-z0-9\s]{3,25}:)\s*(.*)$/.test(trimmed);
      if (isKeyLabel && currentList.type === "ul") {
        currentList.items.push({
          title: cleanItemTitle(trimmed),
          body: [],
          subItems: [],
        });
        blankLineSinceLastContent = false;
        continue;
      }

      // Cek apakah ada list item lagi di bawahnya dalam seksi ini
      let hasMoreListItemsAhead = false;
      for (let j = i + 1; j < lines.length; j++) {
        const aheadTrimmed = lines[j].trim();
        if (/^#{1,6}\s+|^(?:---|\*\*\*|___)$/.test(aheadTrimmed)) break;
        if (/^\d+\.\s+|^[\*\-\•\+]\s+/.test(aheadTrimmed)) {
          hasMoreListItemsAhead = true;
          break;
        }
      }

      // HANYA serap ke dalam body item list jika ada list item lanjutan di bawahnya DAN tidak dipisahkan baris kosong
      if (hasMoreListItemsAhead && !blankLineSinceLastContent) {
        lastItem.body.push(line);
        blankLineSinceLastContent = false;
        continue;
      }
    }

    // Paragraf biasa di luar list (rata kiri sejajar dengan margin utama)
    flushList();
    blankLineSinceLastContent = false;
    currentParagraph.push(line);
  }

  flushTable();
  flushParagraph();
  flushList();
  return blocks;
}

export function MarkdownTextBlock({ content }) {
  const blocks = parseMarkdownBlocks(content);
  return (
    <>
      {blocks.map((b, i) => {
        if (b.type === "table") {
          return (
            <TableBlock
              key={i}
              headers={b.headers}
              rows={b.rows}
              alignments={b.alignments}
            />
          );
        }
        if (b.type === "hr") return <hr key={i} className="chat-hr" />;
        if (b.type === "h1") return <h2 key={i} className="chat-h1">{renderInlineText(b.content)}</h2>;
        if (b.type === "h2") return <h2 key={i} className="chat-h2">{renderInlineText(b.content)}</h2>;
        if (b.type === "h3") return <h3 key={i} className="chat-h3">{renderInlineText(b.content)}</h3>;
        if (b.type === "h4") return <h4 key={i} className="chat-h4">{renderInlineText(b.content)}</h4>;
        if (b.type === "quote") return <blockquote key={i} className="chat-blockquote">{renderInlineText(b.content)}</blockquote>;
        if (b.type === "ul") {
          return (
            <ul key={i} className="chat-ul">
              {b.items.map((item, j) => {
                const titleText = typeof item === "string" ? item : item.title;
                const bodyParagraphs = typeof item === "object" && item.body ? item.body : [];
                const subItems = typeof item === "object" && item.subItems ? item.subItems : [];
                return (
                  <li key={j} className="chat-li">
                    <span className="chat-li-title">{renderInlineText(titleText)}</span>
                    {bodyParagraphs.map((pText, pIdx) => (
                      <p key={pIdx} className="chat-li-desc">{renderInlineText(pText)}</p>
                    ))}
                    {subItems.length > 0 && (
                      <ul className="chat-sub-ul">
                        {subItems.map((sub, sIdx) => (
                          <li key={sIdx} className="chat-sub-li">{renderInlineText(sub)}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          );
        }
        if (b.type === "ol") {
          return (
            <ol key={i} start={b.start || 1} className="chat-ol">
              {b.items.map((item, j) => {
                const itemNum = typeof item === "object" && item.num ? item.num : (b.start ? b.start + j : j + 1);
                const titleText = typeof item === "string" ? item : item.title;
                const bodyParagraphs = typeof item === "object" && item.body ? item.body : [];
                const subItems = typeof item === "object" && item.subItems ? item.subItems : [];
                return (
                  <li key={j} value={itemNum} className="chat-li">
                    <span className="chat-li-title">{renderInlineText(titleText)}</span>
                    {bodyParagraphs.map((pText, pIdx) => (
                      <p key={pIdx} className="chat-li-desc">{renderInlineText(pText)}</p>
                    ))}
                    {subItems.length > 0 && (
                      <ul className="chat-sub-ul">
                        {subItems.map((sub, sIdx) => (
                          <li key={sIdx} className="chat-sub-li">{renderInlineText(sub)}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ol>
          );
        }
        const cleanPlainText = b.content.replace(/\*+/g, "").trim();
        const isStandaloneAcademicTitle = cleanPlainText.length >= 12 && cleanPlainText.length <= 180 &&
          (/^[A-ZÀ-ÖØ-Þ0-9][A-ZÀ-ÖØ-Þ0-9\s:;,.()\-/]+$/.test(cleanPlainText) || /^(?:TELAAH LITERATUR|BAB\s+[IVX0-9]+|DAFTAR PUSTAKA)\b/i.test(cleanPlainText));
        if (isStandaloneAcademicTitle) {
          return <h2 key={i} className="chat-academic-title">{renderInlineText(cleanPlainText)}</h2>;
        }
        return (
          <p key={i} className="chat-p">
            {renderInlineText(b.content)}
          </p>
        );
      })}
    </>
  );
}

export default function ChatMessageBody({ content, t, onSelectQuery }) {
  if (!content) return null;

  // Hapus semua tag Elicitations dan emoji checkmark / silang X
  const sanitizedContent = stripCheckmarkAndCrossEmojis(content)
    .replace(/<ElicitationsGroup[\s\S]*?(?:<\/ElicitationsGroup>|$)/gi, "")
    .replace(/<Elicitation\s+[^>]*\/?>/gi, "");

  if (!sanitizedContent.trim()) return null;

  // Ekstraksi blok tingkat atas:
  // 1. Code block: ```lang ... ```
  // 2. Display Math: $$ ... $$
  // 3. Display Math: \[ ... \]
  // 4. Standalone LaTeX Environment: \begin{cases}...\end{cases}, \begin{equation}...\end{equation}, dst.
  const blockRegex = /(```[-a-zA-Z0-9_.]*[ \t]*(?:\r?\n)?[\s\S]*?(?:```|$))|(\$\$[\s\S]*?(?:\$\$|$))|(\\\[[\s\S]*?(?:\\\]|$))|(\\begin\{(?:cases|equation|align|matrix|pmatrix|bmatrix|vmatrix)\}[\s\S]*?(?:\\end\{(?:cases|equation|align|matrix|pmatrix|bmatrix|vmatrix)\}|$))/gi;
  const segments = [];
  let lastIndex = 0;
  let match;

  while ((match = blockRegex.exec(sanitizedContent)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: sanitizedContent.slice(lastIndex, match.index),
      });
    }

    const matchedStr = match[0];
    if (matchedStr.startsWith("```")) {
      const firstLineEnd = matchedStr.indexOf("\n");
      let lang = "code";
      let code = "";
      if (firstLineEnd !== -1) {
        lang = matchedStr.slice(3, firstLineEnd).trim().toLowerCase() || "code";
        code = matchedStr.slice(firstLineEnd + 1);
      } else {
        code = matchedStr.slice(3);
      }
      if (code.endsWith("```")) {
        code = code.slice(0, -3);
      }
      segments.push({
        type: "code",
        language: lang,
        code: code.replace(/\n$/, ""),
      });
    } else if (matchedStr.startsWith("$$")) {
      let formula = matchedStr.slice(2);
      if (formula.endsWith("$$")) {
        formula = formula.slice(0, -2);
      }
      segments.push({
        type: "math",
        formula: formula.trim(),
      });
    } else if (matchedStr.startsWith("\\[")) {
      let formula = matchedStr.slice(2);
      if (formula.endsWith("\\]")) {
        formula = formula.slice(0, -2);
      }
      segments.push({
        type: "math",
        formula: formula.trim(),
      });
    } else if (matchedStr.startsWith("\\begin{")) {
      segments.push({
        type: "math",
        formula: matchedStr.trim(),
      });
    }

    lastIndex = blockRegex.lastIndex;
  }

  if (lastIndex < sanitizedContent.length) {
    segments.push({
      type: "text",
      content: sanitizedContent.slice(lastIndex),
    });
  }

  return (
    <div className="msg-content-flow">
      {segments.map((seg, idx) => {
        if (seg.type === "code") {
          return (
            <CodeBlock
              key={`code-${idx}`}
              language={seg.language}
              code={seg.code}
              t={t}
            />
          );
        }
        if (seg.type === "math") {
          return (
            <MathBlock
              key={`math-${idx}`}
              formula={seg.formula}
              t={t}
            />
          );
        }
        return <MarkdownTextBlock key={`text-${idx}`} content={seg.content} />;
      })}
    </div>
  );
}
