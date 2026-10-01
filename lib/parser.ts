import mammoth from 'mammoth';
import { storageService } from './storage.js';

export interface ParseResumeResult {
  text: string;
  ocrReadabilityScore: number;
  wordCount: number;
  isOcrValid: boolean;
}

/**
 * Validates whether the extracted text represents readable ASCII/UTF-8 words
 * rather than an unsearchable flattened bitmap/image scan.
 */
function validateOcrReadability(rawText: string): { isValid: boolean; score: number } {
  if (!rawText || rawText.length < 80) {
    return { isValid: false, score: 0 };
  }

  // Count printable alphanumeric characters
  const alphanumericCount = (rawText.match(/[a-zA-Z0-9]/g) || []).length;
  const ratio = alphanumericCount / rawText.length;

  // Words with at least 2 characters
  const words = rawText.trim().split(/\s+/).filter((w) => w.length >= 2);

  // If alphanumeric ratio is too low (< 40%) or word count < 20, document is likely flat image or corrupted OCR
  const isHealthy = ratio >= 0.45 && words.length >= 25;
  const readabilityScore = Math.min(100, Math.round(ratio * 100));

  return {
    isValid: isHealthy,
    score: readabilityScore,
  };
}

/**
 * Strips formatting, extracts raw text stream, validates OCR readability,
 * and immediately cleans up raw temp files after parsing for 100% data privacy.
 */
export async function extractResumeText(
  fileBuffer: Buffer,
  mimetype: string,
  filename: string,
  tempFilePath?: string
): Promise<ParseResumeResult> {
  let extractedText = '';
  const lowerName = filename.toLowerCase();

  try {
    if (mimetype === 'application/pdf' || lowerName.endsWith('.pdf')) {
      // Dynamic import of pdf-parse to handle CJS/ESM cleanly
      const pdfModule = await import('pdf-parse');
      const pdfParser = (pdfModule as any).default || pdfModule;
      const pdfData = await pdfParser(fileBuffer);
      extractedText = pdfData.text || '';
    } else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/msword' ||
      lowerName.endsWith('.docx') ||
      lowerName.endsWith('.doc')
    ) {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      extractedText = result.value || '';
    } else if (mimetype.startsWith('text/') || lowerName.endsWith('.txt')) {
      extractedText = fileBuffer.toString('utf-8');
    } else {
      // Fallback attempt
      try {
        const pdfModule = await import('pdf-parse');
        const pdfParser = (pdfModule as any).default || pdfModule;
        const pdfData = await pdfParser(fileBuffer);
        extractedText = pdfData.text || '';
      } catch {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        extractedText = result.value || fileBuffer.toString('utf-8');
      }
    }
  } catch (err: any) {
    console.error('[Parser] File extraction error:', err);
    throw new Error(
      `Failed to parse ${filename}: ${err?.message || 'Unsupported format'}. Please upload a standard PDF or DOCX file.`
    );
  } finally {
    // 100% Data Privacy: Immediately purge raw temp file from disk if present
    if (tempFilePath) {
      storageService.cleanupTempFile(tempFilePath);
    }
  }

  // Strip binary/non-printable control chars while preserving newlines and spacing
  const sanitizedText = extractedText
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();

  // OCR Readability & Scanned Image Validation
  const ocrCheck = validateOcrReadability(sanitizedText);
  if (!ocrCheck.isValid) {
    throw new Error(
      'Document OCR validation failed. The uploaded file appears to be a scanned image or empty file without selectable text. Please upload a standard text-based PDF or DOCX resume.'
    );
  }

  const words = sanitizedText.split(/\s+/).filter(Boolean);

  return {
    text: sanitizedText,
    ocrReadabilityScore: ocrCheck.score,
    wordCount: words.length,
    isOcrValid: true,
  };
}
