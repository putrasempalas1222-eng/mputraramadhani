import JSZip from "jszip";

/**
 * Utility to generate a valid, standardized Microsoft Word (.docx) file
 * compliant with Indonesian Higher Education (Dikti) Academic Thesis guidelines.
 * Margins: Top 4cm, Left 4cm, Bottom 3cm, Right 3cm (Standard Skripsi Dikti)
 * Font: Times New Roman 12pt, Spacing 1.5
 */

function escapeXml(str = "") {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cleanLatexSymbols(str = "") {
  return str
    .replace(/\\text\{([^{}]+)\}/g, "$1")
    .replace(/\\text\s+/g, "")
    .replace(/\\times/g, " × ")
    .replace(/\\ge/g, " ≥ ")
    .replace(/\\le/g, " ≤ ")
    .replace(/\\ne/g, " ≠ ")
    .replace(/\\pm/g, " ± ")
    .replace(/\\approx/g, " ≈ ")
    .replace(/\\dots/g, "...")
    .replace(/\\cdots/g, "...")
    .replace(/\\min\b/g, "min")
    .replace(/\\max\b/g, "max")
    .replace(/\\quad/g, "   ")
    .replace(/\\qquad/g, "      ")
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1) / ($2)")
    .replace(/\\left|\\right/g, "")
    .replace(/\\_|\{_\}/g, "_")
    .replace(/[{}]/g, "")
    .replace(/\\/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatLatexFormulaForWord(formulaText = "") {
  let f = formulaText.trim();
  f = f.replace(/^\$\$|\$\$$|^\\\[|\\\]$/g, "").trim();

  const isCases = /\\begin\{cases\}([\s\S]*?)\\end\{cases\}/.test(f);
  if (isCases) {
    const inner = f.match(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/)[1];
    const prefix = f.replace(/\\begin\{cases\}[\s\S]*?\\end\{cases\}/, "").trim();
    const cleanPrefix = cleanLatexSymbols(prefix);

    const rows = inner.split(/\\\\/).map((r) => r.trim()).filter(Boolean);
    const caseLines = rows.map((r) => {
      const parts = r.split("&").map((p) => cleanLatexSymbols(p.trim()));
      if (parts.length >= 2) {
        return `   • ${parts[0]}, ${parts[1]}`;
      }
      return `   • ${parts[0]}`;
    });

    return cleanPrefix ? `${cleanPrefix}\n${caseLines.join("\n")}` : caseLines.join("\n");
  }

  return cleanLatexSymbols(f);
}

function createWordMathBlock(rawFormula) {
  const formattedText = formatLatexFormulaForWord(rawFormula);
  const lines = formattedText.split("\n");

  return lines
    .map(
      (lineText) => `
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="140" w:after="140" w:line="360" w:lineRule="auto"/>
        <w:pBdr>
          <w:left w:val="single" w:sz="18" w:space="12" w:color="CBA874"/>
          <w:top w:val="single" w:sz="4" w:space="6" w:color="E2E4E8"/>
          <w:bottom w:val="single" w:sz="4" w:space="6" w:color="E2E4E8"/>
          <w:right w:val="single" w:sz="4" w:space="6" w:color="E2E4E8"/>
        </w:pBdr>
        <w:shd w:val="clear" w:color="auto" w:fill="F9FAFC"/>
        <w:rPr>
          <w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math" w:cs="Cambria Math"/>
          <w:i/><w:iCs/>
          <w:sz w:val="24"/>
          <w:szCs w:val="24"/>
          <w:color w:val="1A1D24"/>
        </w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math" w:cs="Cambria Math"/>
          <w:i/><w:iCs/>
          <w:sz w:val="24"/>
          <w:szCs w:val="24"/>
          <w:color w:val="1A1D24"/>
        </w:rPr>
        <w:t xml:space="preserve">${escapeXml(lineText)}</w:t>
      </w:r>
    </w:p>
  `
    )
    .join("\n");
}

function parseInlineToRuns(text = "", options = {}) {
  if (!text) return "";
  const defaultFont = options.font || "Times New Roman";
  const defaultSize = options.size || "24"; // 12pt
  const inheritBold = options.isBold || false;
  const inheritItalic = options.isItalic || false;

  // Hapus tag XML bawaan AI yang bocor
  let cleaned = text
    .replace(/<ElicitationsGroup[\s\S]*?<\/ElicitationsGroup>/gi, "")
    .replace(/<Elicitation\s+[^>]*\/?>/gi, "")
    .replace(/<\/?[a-zA-Z0-9]+[^>]*>/g, "");

  const tokens = [];
  const regex = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|(?<=\s|^)_[^_]+_(?=\s|$|[.,:;!?])|`[^`]+`|\$(?!\$)[^\$\n]+\$)/g;
  let lastIdx = 0;
  let match;

  while ((match = regex.exec(cleaned)) !== null) {
    if (match.index > lastIdx) {
      tokens.push({ type: "text", content: cleaned.slice(lastIdx, match.index) });
    }
    const raw = match[0];
    if (raw.startsWith("***") && raw.endsWith("***")) {
      tokens.push({ type: "bold-italic", content: raw.slice(3, -3) });
    } else if (raw.startsWith("**") && raw.endsWith("**")) {
      tokens.push({ type: "bold", content: raw.slice(2, -2) });
    } else if (raw.startsWith("*") && raw.endsWith("*")) {
      tokens.push({ type: "italic", content: raw.slice(1, -1) });
    } else if (raw.startsWith("_") && raw.endsWith("_")) {
      tokens.push({ type: "italic", content: raw.slice(1, -1) });
    } else if (raw.startsWith("`") && raw.endsWith("`")) {
      tokens.push({ type: "code", content: raw.slice(1, -1) });
    } else if (raw.startsWith("$") && raw.endsWith("$")) {
      tokens.push({ type: "math", content: cleanLatexSymbols(raw.slice(1, -1)) });
    }
    lastIdx = regex.lastIndex;
  }

  if (lastIdx < cleaned.length) {
    tokens.push({ type: "text", content: cleaned.slice(lastIdx) });
  }

  return tokens
    .map((t) => {
      if (!t.content) return "";
      const b = inheritBold || t.type === "bold" || t.type === "bold-italic";
      const i = inheritItalic || t.type === "italic" || t.type === "bold-italic" || t.type === "math";
      const font = t.type === "code" ? "Consolas" : t.type === "math" ? "Cambria Math" : defaultFont;
      const sz = t.type === "code" ? "21" : defaultSize;

      // Hapus karakter markdown residual dari konten
      let cleanVal = t.content
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .replace(/`/g, "")
        .replace(/^#{1,6}\s*/, "")
        .replace(/\s+#{1,6}\s+/g, " ");
      const safeText = escapeXml(cleanVal);

      return `
        <w:r>
          <w:rPr>
            <w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/>
            ${b ? "<w:b/><w:bCs/>" : ""}
            ${i ? "<w:i/><w:iCs/>" : ""}
            <w:sz w:val="${sz}"/>
            <w:szCs w:val="${sz}"/>
          </w:rPr>
          <w:t xml:space="preserve">${safeText}</w:t>
        </w:r>
      `;
    })
    .join("");
}

function createWordTable(tableLines) {
  if (tableLines.length < 2) return "";
  const headerLine = tableLines[0].trim();
  const sepLine = tableLines[1].trim();

  const parseCells = (line) => {
    let cells = line.trim().split("|").map((c) => c.trim());
    if (cells[0] === "") cells.shift();
    if (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();
    return cells;
  };

  const sepCells = parseCells(sepLine);
  const alignments = sepCells.map((c) => {
    const left = c.startsWith(":");
    const right = c.endsWith(":");
    if (left && right) return "center";
    if (right) return "right";
    return "left";
  });

  const headers = parseCells(headerLine);
  const dataRows = [];
  for (let i = 2; i < tableLines.length; i++) {
    const rowLine = tableLines[i].trim();
    if (!rowLine || !rowLine.includes("|")) continue;
    dataRows.push(parseCells(rowLine));
  }

  const headerXml = `
    <w:tr>
      <w:trPr>
        <w:tblHeader/>
        <w:cantSplit/>
        <w:spacing w:before="60" w:after="60"/>
      </w:trPr>
      ${headers
        .map(
          (h, colIdx) => `
        <w:tc>
          <w:tcPr>
            <w:shd w:val="clear" w:color="auto" w:fill="F2F4F7"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="${alignments[colIdx] || "left"}"/>
              <w:spacing w:before="60" w:after="60" w:line="240" w:lineRule="auto"/>
            </w:pPr>
            ${parseInlineToRuns(h, { isBold: true, size: "22" })}
          </w:p>
        </w:tc>
      `
        )
        .join("")}
    </w:tr>
  `;

  const rowsXml = dataRows
    .map(
      (row) => `
    <w:tr>
      <w:trPr>
        <w:cantSplit/>
      </w:trPr>
      ${row
        .map(
          (cell, colIdx) => `
        <w:tc>
          <w:tcPr>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="${alignments[colIdx] || "left"}"/>
              <w:spacing w:before="40" w:after="40" w:line="240" w:lineRule="auto"/>
            </w:pPr>
            ${parseInlineToRuns(cell, { size: "22" })}
          </w:p>
        </w:tc>
      `
        )
        .join("")}
    </w:tr>
  `
    )
    .join("\n");

  return `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="0" w:type="auto"/>
        <w:jc w:val="center"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="12" w:space="0" w:color="000000"/>
          <w:bottom w:val="single" w:sz="12" w:space="0" w:color="000000"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="D0D0D0"/>
          <w:left w:val="none"/>
          <w:right w:val="none"/>
          <w:insideV w:val="none"/>
        </w:tblBorders>
        <w:tblCellMar>
          <w:top w:w="120" w:type="dxa"/>
          <w:left w:w="160" w:type="dxa"/>
          <w:bottom w:w="120" w:type="dxa"/>
          <w:right w:w="160" w:type="dxa"/>
        </w:tblCellMar>
      </w:tblPr>
      ${headerXml}
      ${rowsXml}
    </w:tbl>
    <w:p><w:pPr><w:spacing w:after="140" w:line="360" w:lineRule="auto"/></w:pPr></w:p>
  `;
}

export function cleanMarkdownToXmlRuns(text = "", isBold = false, isItalic = false) {
  if (!text) return "";
  const lines = text.split("\n");
  const paragraphs = [];

  let inTable = false;
  let currentTable = [];

  let inMath = false;
  let currentMath = [];

  let lastNumberedVal = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Math block detection ($$ ... $$ or \[ ... \])
    if (!inTable) {
      if (trimmed.startsWith("$$") && trimmed.endsWith("$$") && trimmed.length > 4) {
        paragraphs.push(createWordMathBlock(trimmed));
        continue;
      }
      if (trimmed.startsWith("$$") || trimmed.startsWith("\\[")) {
        inMath = true;
        currentMath = [trimmed];
        continue;
      }
      if (inMath) {
        currentMath.push(trimmed);
        if (trimmed.endsWith("$$") || trimmed.endsWith("\\]") || trimmed.includes("\\end{cases}")) {
          inMath = false;
          paragraphs.push(createWordMathBlock(currentMath.join("\n")));
          currentMath = [];
        }
        continue;
      }
      if (/^\\begin\{(cases|equation|align)\}/.test(trimmed)) {
        inMath = true;
        currentMath = [trimmed];
        continue;
      }
    }

    // 2. Table detection (| ... |)
    if (trimmed.startsWith("|") && trimmed.includes("|")) {
      currentTable.push(trimmed);
      inTable = true;
      continue;
    } else if (inTable) {
      inTable = false;
      if (currentTable.length >= 2) {
        paragraphs.push(createWordTable(currentTable));
      }
      currentTable = [];
    }

    // 3. Empty line
    if (!trimmed) {
      paragraphs.push(`<w:p><w:pPr><w:spacing w:after="120" w:line="360" w:lineRule="auto"/></w:pPr></w:p>`);
      continue;
    }

    // 4. Strip unwanted XML tags like <ElicitationsGroup...>, </ElicitationsGroup>, etc.
    if (/^<\/?(?:ElicitationsGroup|Elicitation|think|thought)[^>]*>$/i.test(trimmed)) {
      continue;
    }

    // 5. Heading 1 (BAB I, BAB II, etc. or # ...)
    if (/^#\s+|^BAB\s+[IVXLC]+/i.test(trimmed)) {
      lastNumberedVal = 0;
      const headingText = trimmed.replace(/^#+\s*/, "").replace(/\*\*/g, "");
      paragraphs.push(`
        <w:p>
          <w:pPr>
            <w:jc w:val="center"/>
            <w:spacing w:before="280" w:after="180" w:line="360" w:lineRule="auto"/>
            <w:rPr>
              <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
              <w:b/><w:bCs/>
              <w:sz w:val="28"/>
              <w:szCs w:val="28"/>
            </w:rPr>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
              <w:b/><w:bCs/>
              <w:sz w:val="28"/>
              <w:szCs w:val="28"/>
            </w:rPr>
            <w:t>${escapeXml(headingText)}</w:t>
          </w:r>
        </w:p>
      `);
      continue;
    }

    // 6. Heading 2 (e.g. ## 1.1 Latar Belakang or 1.1 Latar Belakang)
    if (/^##\s+|^\d+\.\d+\s+[A-Z]/i.test(trimmed)) {
      lastNumberedVal = 0;
      const headingText = trimmed.replace(/^#+\s*/, "").replace(/\*\*/g, "");
      paragraphs.push(`
        <w:p>
          <w:pPr>
            <w:jc w:val="left"/>
            <w:spacing w:before="240" w:after="120" w:line="360" w:lineRule="auto"/>
            <w:rPr>
              <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
              <w:b/><w:bCs/>
              <w:sz w:val="24"/>
              <w:szCs w:val="24"/>
            </w:rPr>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
              <w:b/><w:bCs/>
              <w:sz w:val="24"/>
              <w:szCs w:val="24"/>
            </w:rPr>
            <w:t>${escapeXml(headingText)}</w:t>
          </w:r>
        </w:p>
      `);
      continue;
    }

    // 7. Heading 3 (e.g. ### 1.2.1 Rumusan Masalah or 1.2.1 Rumusan Masalah)
    if (/^###\s+|^\d+\.\d+\.\d+\s+[A-Z]/i.test(trimmed)) {
      lastNumberedVal = 0;
      const headingText = trimmed.replace(/^#+\s*/, "").replace(/\*\*/g, "");
      paragraphs.push(`
        <w:p>
          <w:pPr>
            <w:jc w:val="left"/>
            <w:spacing w:before="180" w:after="100" w:line="360" w:lineRule="auto"/>
            <w:rPr>
              <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
              <w:b/><w:bCs/>
              <w:sz w:val="24"/>
              <w:szCs w:val="24"/>
            </w:rPr>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
              <w:b/><w:bCs/>
              <w:sz w:val="24"/>
              <w:szCs w:val="24"/>
            </w:rPr>
            <w:t>${escapeXml(headingText)}</w:t>
          </w:r>
        </w:p>
      `);
      continue;
    }

    // 8. Heading 4, 5, 6 (e.g. #### 1.2.1.1 or ##### 1.3.2.1 Manfaat)
    if (/^#{4,6}\s+|^\d+\.\d+\.\d+\.\d+(?:\.\d+)?\s+[A-Z]/i.test(trimmed)) {
      lastNumberedVal = 0;
      const headingText = trimmed.replace(/^#+\s*/, "").replace(/\*\*/g, "").replace(/\*/g, "");
      paragraphs.push(`
        <w:p>
          <w:pPr>
            <w:jc w:val="left"/>
            <w:spacing w:before="140" w:after="80" w:line="360" w:lineRule="auto"/>
            <w:rPr>
              <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
              <w:b/><w:bCs/>
              <w:i/><w:iCs/>
              <w:sz w:val="24"/>
              <w:szCs w:val="24"/>
            </w:rPr>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
              <w:b/><w:bCs/>
              <w:i/><w:iCs/>
              <w:sz w:val="24"/>
              <w:szCs w:val="24"/>
            </w:rPr>
            <w:t>${escapeXml(headingText)}</w:t>
          </w:r>
        </w:p>
      `);
      continue;
    }

    // 8b. Fallback: Any remaining heading hash prefixes
    if (/^#{1,6}\s+/.test(trimmed)) {
      lastNumberedVal = 0;
      const headingText = trimmed.replace(/^#+\s*/, "").replace(/\*\*/g, "").replace(/\*/g, "");
      paragraphs.push(`
        <w:p>
          <w:pPr>
            <w:jc w:val="left"/>
            <w:spacing w:before="140" w:after="80" w:line="360" w:lineRule="auto"/>
            <w:rPr>
              <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
              <w:b/><w:bCs/>
              <w:sz w:val="24"/>
              <w:szCs w:val="24"/>
            </w:rPr>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
              <w:b/><w:bCs/>
              <w:sz w:val="24"/>
              <w:szCs w:val="24"/>
            </w:rPr>
            <w:t>${escapeXml(headingText)}</w:t>
          </w:r>
        </w:p>
      `);
      continue;
    }

    // 9. Bullet Points & Numbered lists
    const isBullet = /^[-*•]\s+/.test(trimmed);
    const isNumbered = /^\d+(?:\.\d+)*\.\s+/.test(trimmed);
    if (isBullet || isNumbered) {
      let cleanItem = trimmed;
      let bulletOrNumber = "";
      if (isBullet) {
        cleanItem = trimmed.replace(/^[-*•]\s+/, "");
        bulletOrNumber = "•   ";
      } else if (isNumbered) {
        const numMatch = trimmed.match(/^(\d+)\.\s+([\s\S]*)$/);
        if (numMatch) {
          const rawNum = parseInt(numMatch[1], 10);
          if (rawNum > lastNumberedVal) {
            lastNumberedVal = rawNum;
          } else {
            lastNumberedVal = lastNumberedVal + 1;
          }
          bulletOrNumber = `${lastNumberedVal}. `;
          cleanItem = numMatch[2];
        } else {
          const subMatch = trimmed.match(/^(\d+(?:\.\d+)*\.\s+)([\s\S]*)$/);
          if (subMatch) {
            bulletOrNumber = subMatch[1];
            cleanItem = subMatch[2];
          }
        }
      }
      paragraphs.push(`
        <w:p>
          <w:pPr>
            <w:ind w:left="720" w:hanging="360"/>
            <w:spacing w:after="100" w:line="360" w:lineRule="auto"/>
            <w:jc w:val="both"/>
          </w:pPr>
          ${
            bulletOrNumber
              ? `
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
                <w:sz w:val="24"/>
                <w:szCs w:val="24"/>
              </w:rPr>
              <w:t xml:space="preserve">${escapeXml(bulletOrNumber)}</w:t>
            </w:r>
          `
              : ""
          }
          ${parseInlineToRuns(cleanItem)}
        </w:p>
      `);
      continue;
    }

    // 10. Standard Academic Paragraph (RATA KANAN & KIRI / JUSTIFIED)
    // First-line indent 1.27cm = 720 dxa, Spacing 1.5 = 360, Justify: <w:jc w:val="both"/>
    paragraphs.push(`
      <w:p>
        <w:pPr>
          <w:ind w:firstLine="720"/>
          <w:spacing w:after="140" w:line="360" w:lineRule="auto"/>
          <w:jc w:val="both"/>
        </w:pPr>
        ${parseInlineToRuns(trimmed, { isBold, isItalic })}
      </w:p>
    `);
  }

  if (inTable && currentTable.length >= 2) {
    paragraphs.push(createWordTable(currentTable));
  }
  if (inMath && currentMath.length > 0) {
    paragraphs.push(createWordMathBlock(currentMath.join("\n")));
  }

  return paragraphs.join("\n");
}

function createPageBreak() {
  return `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
}

export async function generateAcademicSkripsiDocx(projectData = {}) {
  const zip = new JSZip();

  const title = (projectData.title || "SKRIPSI AKADEMIK").toUpperCase();
  const studentName = projectData.studentName || "M PUTRA RAMADHANI";
  const nim = projectData.nim || "10121001";
  const university = projectData.university || "UNIVERSITAS KOMPUTER INDONESIA";
  const department = projectData.department || "PROGRAM STUDI TEKNIK INFORMATIKA";
  const year = projectData.year || new Date().getFullYear();

  const chapters = projectData.chapters || {};

  // Build document.xml body content
  let bodyContent = `
    <!-- COVER PAGE -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="720" w:after="480" w:line="360" w:lineRule="auto"/>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
          <w:b/>
          <w:sz w:val="32"/>
          <w:szCs w:val="32"/>
        </w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
          <w:b/>
          <w:sz w:val="32"/>
          <w:szCs w:val="32"/>
        </w:rPr>
        <w:t>${escapeXml(title)}</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="360" w:after="720" w:line="360" w:lineRule="auto"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
          <w:i/>
          <w:sz w:val="24"/>
          <w:szCs w:val="24"/>
        </w:rPr>
        <w:t>Diajukan untuk Memenuhi Sebagian Persyaratan Mencapai Derajat Sarjana</w:t>
      </w:r>
    </w:p>

    <w:p><w:pPr><w:spacing w:before="1200" w:after="240"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>Disusun oleh:</w:t></w:r></w:p>
    <w:p><w:pPr><w:spacing w:before="120" w:after="60"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t>${escapeXml(studentName)}</w:t></w:r></w:p>
    <w:p><w:pPr><w:spacing w:before="60" w:after="1440"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>NIM: ${escapeXml(nim)}</w:t></w:r></w:p>

    <w:p><w:pPr><w:spacing w:before="360" w:after="120"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t>${escapeXml(department)}</w:t></w:r></w:p>
    <w:p><w:pPr><w:spacing w:before="120" w:after="120"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr><w:t>${escapeXml(university)}</w:t></w:r></w:p>
    <w:p><w:pPr><w:spacing w:before="120" w:after="240"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>${escapeXml(String(year))}</w:t></w:r></w:p>

    ${createPageBreak()}

    <!-- ABSTRAK -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="360" w:after="240" w:line="360" w:lineRule="auto"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
          <w:b/>
          <w:sz w:val="28"/>
          <w:szCs w:val="28"/>
        </w:rPr>
        <w:t>ABSTRAK</w:t>
      </w:r>
    </w:p>
    ${cleanMarkdownToXmlRuns(chapters.abstrak || "Abstrak penelitian skripsi ini menyajikan ringkasan latar belakang, metodologi, dan temuan utama riset.")}

    ${createPageBreak()}

    <!-- KATA PENGANTAR -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="360" w:after="240" w:line="360" w:lineRule="auto"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
          <w:b/>
          <w:sz w:val="28"/>
          <w:szCs w:val="28"/>
        </w:rPr>
        <w:t>KATA PENGANTAR</w:t>
      </w:r>
    </w:p>
    ${cleanMarkdownToXmlRuns(chapters.kataPengantar || "Puji syukur kami panjatkan ke hadirat Tuhan Yang Maha Esa atas rahmat dan karunia-Nya sehingga penyusunan skripsi ini dapat terselesaikan dengan baik.")}

    ${createPageBreak()}

    <!-- BAB I: PENDAHULUAN -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="360" w:after="120" w:line="360" w:lineRule="auto"/>
      </w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr><w:t>BAB I</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="0" w:after="360" w:line="360" w:lineRule="auto"/>
      </w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr><w:t>PENDAHULUAN</w:t></w:r>
    </w:p>
    ${cleanMarkdownToXmlRuns(chapters.bab1 || "1.1 Latar Belakang Masalah\nLatar belakang penelitian ini disusun berdasarkan pengamatan empiris dan kesenjangan penelitian...")}

    ${createPageBreak()}

    <!-- BAB II: TINJAUAN PUSTAKA -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="360" w:after="120" w:line="360" w:lineRule="auto"/>
      </w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr><w:t>BAB II</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="0" w:after="360" w:line="360" w:lineRule="auto"/>
      </w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr><w:t>TINJAUAN PUSTAKA</w:t></w:r>
    </w:p>
    ${cleanMarkdownToXmlRuns(chapters.bab2 || "2.1 Landasan Teori\nTeori komprehensif yang melandasi variabel penelitian...")}

    ${createPageBreak()}

    <!-- BAB III: METODOLOGI PENELITIAN -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="360" w:after="120" w:line="360" w:lineRule="auto"/>
      </w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr><w:t>BAB III</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="0" w:after="360" w:line="360" w:lineRule="auto"/>
      </w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr><w:t>METODOLOGI PENELITIAN</w:t></w:r>
    </w:p>
    ${cleanMarkdownToXmlRuns(chapters.bab3 || "3.1 Desain Penelitian\nMetode penelitian dan rancangan pengumpulan data...")}

    ${createPageBreak()}

    <!-- BAB IV: HASIL DAN PEMBAHASAN -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="360" w:after="120" w:line="360" w:lineRule="auto"/>
      </w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr><w:t>BAB IV</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="0" w:after="360" w:line="360" w:lineRule="auto"/>
      </w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr><w:t>HASIL DAN PEMBAHASAN</w:t></w:r>
    </w:p>
    ${cleanMarkdownToXmlRuns(chapters.bab4 || "4.1 Deskripsi Objek Penelitian\nHasil pengujian dan pembahasan empiris...")}

    ${createPageBreak()}

    <!-- BAB V: KESIMPULAN DAN SARAN -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="360" w:after="120" w:line="360" w:lineRule="auto"/>
      </w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr><w:t>BAB V</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="0" w:after="360" w:line="360" w:lineRule="auto"/>
      </w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr><w:t>KESIMPULAN DAN SARAN</w:t></w:r>
    </w:p>
    ${cleanMarkdownToXmlRuns(chapters.bab5 || "5.1 Kesimpulan\nBerdasarkan hasil analisis data, dapat ditarik kesimpulan sebagai berikut...")}

    ${createPageBreak()}

    <!-- DAFTAR PUSTAKA -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="360" w:after="360" w:line="360" w:lineRule="auto"/>
      </w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr><w:t>DAFTAR PUSTAKA</w:t></w:r>
    </w:p>
    ${cleanMarkdownToXmlRuns(chapters.pustaka || "Daftar referensi akademik standar APA 7th Edition...")}
  `;

  // Standard Page Layout Settings (Dikti: Top 4cm=2268 dxa, Left 4cm=2268 dxa, Bottom 3cm=1701 dxa, Right 3cm=1701 dxa, A4: 11906 x 16838 dxa)
  const sectPr = `
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="2268" w:right="1701" w:bottom="1701" w:left="2268" w:header="708" w:footer="708" w:gutter="0"/>
      <w:cols w:space="708"/>
      <w:docGrid w:linePitch="360"/>
    </w:sectPr>
  `;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${bodyContent}
    ${sectPr}
  </w:body>
</w:document>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;

  zip.file("[Content_Types].xml", contentTypesXml);
  zip.file("_rels/.rels", relsXml);
  zip.file("word/_rels/document.xml.rels", docRelsXml);
  zip.file("word/document.xml", documentXml);

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  });

  return blob;
}

export function downloadBlob(blob, filename = "Naskah_Skripsi_Lengkap.docx") {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 300);
}
