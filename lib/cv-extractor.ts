/**
 * TAO Recruit AI — CV Text Extractor
 * ============================================================
 * Dedicated, production-ready module for extracting plain text
 * from uploaded CV files (PDF, DOCX, TXT, MD).
 *
 * Design principles:
 * - No fallback/fake text generation under any circumstances.
 * - Returns precise error messages for every failure mode.
 * - Works in Vercel serverless (Node.js 18+ ESM runtime).
 * - PDF: uses pdf-parse (pure Node.js, no workers, no canvas).
 * - DOCX: uses mammoth (pure Node.js).
 * - Validates extracted text length before returning.
 * ============================================================
 */

// Minimum character count to consider extracted text valid
const MIN_TEXT_LENGTH = 100;

export interface CVExtractionResult {
  text: string;
  status: "success" | "failed" | "empty" | "unsupported";
  error?: string;
  charCount: number;
  pageCount?: number;
}

/**
 * Extract all readable text from an uploaded CV file buffer.
 *
 * @param buffer   - Raw file buffer (from arrayBuffer → Buffer.from)
 * @param mimeType - MIME type reported by the upload (e.g. "application/pdf")
 * @param fileName - Original filename (used for logging and type fallback)
 */
export async function extractCVText(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<CVExtractionResult> {
  console.log(`[CVExtractor] Processing: ${fileName} | type: ${mimeType} | size: ${buffer.length} bytes`);

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  // ── PDF ──────────────────────────────────────────────────────
  if (mimeType === "application/pdf" || ext === "pdf") {
    return extractPDF(buffer, fileName);
  }

  // ── DOCX ─────────────────────────────────────────────────────
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword" ||
    ext === "docx" ||
    ext === "doc"
  ) {
    return extractDOCX(buffer, fileName);
  }

  // ── Plain Text / Markdown ─────────────────────────────────────
  if (
    mimeType === "text/plain" ||
    mimeType === "text/markdown" ||
    ext === "txt" ||
    ext === "md"
  ) {
    return extractPlainText(buffer);
  }

  // ── Unsupported format ────────────────────────────────────────
  console.warn(`[CVExtractor] Unsupported file type: ${mimeType} / .${ext}`);
  return {
    text: "",
    status: "unsupported",
    error: `Unsupported CV file format (.${ext}). Please upload a PDF, DOCX, or TXT file.`,
    charCount: 0,
  };
}

// ── PDF Extraction ──────────────────────────────────────────────
// Uses pdf-parse v1.1.1 — a simple buffer-based function with no Web Workers,
// no pdfjs-dist worker bundling, and no canvas dependencies.
// This is the only reliable approach for Vercel serverless functions.
async function extractPDF(buffer: Buffer, fileName: string): Promise<CVExtractionResult> {
  try {
    // Dynamic import avoids Next.js build-time side effects.
    // pdf-parse v1.1.1 exports a single default async function.
    const pdfParse = (await import("pdf-parse")).default;

    const data = await pdfParse(buffer, {
      // max: 0 means extract ALL pages (no page limit)
      max: 0,
    });

    const rawText = data.text ?? "";
    const cleaned = cleanText(rawText);
    const numpages = data.numpages ?? 0;

    console.log(
      `[CVExtractor] PDF extracted: ${numpages} pages, ${cleaned.length} chars`
    );

    if (cleaned.length < MIN_TEXT_LENGTH) {
      return {
        text: "",
        status: "empty",
        error:
          "CV PDF appears to be image-based or has no extractable text. Please upload a text-based PDF.",
        charCount: cleaned.length,
        pageCount: numpages,
      };
    }

    return {
      text: cleaned,
      status: "success",
      charCount: cleaned.length,
      pageCount: numpages,
    };
  } catch (err: any) {
    console.error(`[CVExtractor] PDF extraction failed for ${fileName}:`, err.message);
    return {
      text: "",
      status: "failed",
      error: `PDF text extraction failed: ${err.message}`,
      charCount: 0,
    };
  }
}

// ── DOCX Extraction ─────────────────────────────────────────────
async function extractDOCX(buffer: Buffer, fileName: string): Promise<CVExtractionResult> {
  try {
    const mammoth = await import("mammoth");

    const result = await mammoth.extractRawText({ buffer });

    if (result.messages && result.messages.length > 0) {
      const warnings = result.messages.filter((m) => m.type === "warning");
      if (warnings.length > 0) {
        console.warn(
          `[CVExtractor] DOCX warnings for ${fileName}:`,
          warnings.map((w) => w.message).join("; ")
        );
      }
    }

    const rawText = result.value ?? "";
    const cleaned = cleanText(rawText);

    console.log(`[CVExtractor] DOCX extracted: ${cleaned.length} chars`);

    if (cleaned.length < MIN_TEXT_LENGTH) {
      return {
        text: "",
        status: "empty",
        error: "DOCX file appears to have no readable text content.",
        charCount: cleaned.length,
      };
    }

    return {
      text: cleaned,
      status: "success",
      charCount: cleaned.length,
    };
  } catch (err: any) {
    console.error(`[CVExtractor] DOCX extraction failed for ${fileName}:`, err.message);
    return {
      text: "",
      status: "failed",
      error: `DOCX text extraction failed: ${err.message}`,
      charCount: 0,
    };
  }
}

// ── Plain Text Extraction ───────────────────────────────────────
function extractPlainText(buffer: Buffer): CVExtractionResult {
  try {
    const rawText = buffer.toString("utf-8");
    const cleaned = cleanText(rawText);

    if (cleaned.length < MIN_TEXT_LENGTH) {
      return {
        text: "",
        status: "empty",
        error: "Text file has insufficient content for analysis.",
        charCount: cleaned.length,
      };
    }

    return {
      text: cleaned,
      status: "success",
      charCount: cleaned.length,
    };
  } catch (err: any) {
    return {
      text: "",
      status: "failed",
      error: `Text file read failed: ${err.message}`,
      charCount: 0,
    };
  }
}

// ── Text Cleaning ───────────────────────────────────────────────
/**
 * Normalize extracted text:
 * - Collapse multiple spaces to single space
 * - Collapse 3+ blank lines to 2 (preserve paragraph breaks)
 * - Trim leading/trailing whitespace
 * This reduces token usage while preserving readable structure.
 */
function cleanText(raw: string): string {
  return raw
    .replace(/[ \t]+/g, " ")           // collapse horizontal whitespace
    .replace(/(\r\n|\r)/g, "\n")        // normalize line endings
    .replace(/\n{3,}/g, "\n\n")         // collapse excessive blank lines
    .trim();
}
