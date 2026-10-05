import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Packer,
  BorderStyle,
} from 'docx';

export interface DocxResumeOptions {
  /**
   * Real candidate name. `null`/`''` omits the name block entirely rather than
   * printing a literal "CANDIDATE NAME" placeholder into a real application.
   */
  candidateName?: string | null;
  jobTitle?: string | null;
  email?: string;
  phone?: string;
  linkedin?: string;
  tailoredText: string;
}

export interface DocxIntegrityReport {
  verified: boolean;
  /** Characters of text read back out of the generated file. */
  extractedCharacters: number;
  /** Share (0-1) of the source content lines found in the extracted text. */
  contentCoverage: number;
  missingSamples: string[];
  detail: string;
}

function normalizeForCompare(value: string): string {
  return value
    // The Word file re-emits list items with its own bullet glyph and a tab, so
    // list markers are dropped before comparing. Content integrity is about the
    // words surviving the round trip, not about the bullet character.
    .replace(/^[\s\-•*·◦▪‣⁃]+/, '')
    .replace(/^[\s•*·◦▪‣⁃]+\t/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Reads the generated .docx back and confirms the text survived packing.
 *
 * A DOCX that opens but lost its content is a silent data-loss bug, so the
 * export endpoint must fail loudly rather than hand the user an empty document.
 */
export async function verifyDocxIntegrity(
  buffer: Buffer,
  sourceText: string
): Promise<DocxIntegrityReport> {
  const { extractRawText } = await import('mammoth');
  const { value } = await extractRawText({ buffer });
  const extracted = normalizeForCompare(value || '');

  const sourceLines = (sourceText || '')
    .split('\n')
    .map((line) => normalizeForCompare(line))
    .filter((line) => line.length >= 12);

  if (sourceLines.length === 0) {
    return {
      verified: extracted.length > 0,
      extractedCharacters: extracted.length,
      contentCoverage: extracted.length > 0 ? 1 : 0,
      missingSamples: [],
      detail:
        extracted.length > 0
          ? 'The Word file was re-opened and contains readable text.'
          : 'The Word file was re-opened but contains no readable text.',
    };
  }

  const missingSamples: string[] = [];
  let found = 0;
  for (const line of sourceLines) {
    if (extracted.includes(line)) {
      found += 1;
    } else if (missingSamples.length < 3) {
      missingSamples.push(line.slice(0, 80));
    }
  }

  const contentCoverage = found / sourceLines.length;
  return {
    verified: contentCoverage >= 0.95,
    extractedCharacters: extracted.length,
    contentCoverage: Number(contentCoverage.toFixed(3)),
    missingSamples,
    detail:
      contentCoverage >= 0.95
        ? `${found} of ${sourceLines.length} content lines were read back out of the generated Word file.`
        : `Only ${found} of ${sourceLines.length} content lines survived the Word export. This document is not safe to send.`,
  };
}

export async function generateResumeDocx(options: DocxResumeOptions): Promise<Buffer> {
  const trimmedName = (options.candidateName || '').trim();
  const trimmedTitle = (options.jobTitle || '').trim();
  const { tailoredText } = options;

  const lines = tailoredText.split('\n').map(l => l.trim()).filter(Boolean);
  const children: Paragraph[] = [];

  // Top header: Name. Omitted entirely when no real name is known — printing
  // "CANDIDATE NAME" into a document a candidate submits is a defect.
  if (trimmedName) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: trimmedName.toUpperCase(),
            bold: true,
            size: 32, // 16pt
            font: 'Calibri',
            color: '1A202C',
          }),
        ],
      })
    );
  }

  // Subtitle: Target Job Title
  if (trimmedTitle) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: trimmedName ? 180 : 300 },
        children: [
          new TextRun({
            text: trimmedTitle,
            bold: true,
            size: 24, // 12pt
            font: 'Calibri',
            color: '2B6CB0',
          }),
        ],
      })
    );
  }

  // Contact line
  const contactParts = [options.email, options.phone, options.linkedin].filter(Boolean);
  if (contactParts.length > 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
        children: [
          new TextRun({
            text: contactParts.join('  •  '),
            size: 20, // 10pt
            font: 'Calibri',
            color: '718096',
          }),
        ],
      })
    );
  }

  // Parse lines into sections
  for (const line of lines) {
    const isMajorHeading =
      /^(PROFESSIONAL SUMMARY|CORE COMPETENCIES|TECHNICAL SKILLS|PROFESSIONAL EXPERIENCE|WORK EXPERIENCE|EDUCATION|PROJECTS|CERTIFICATIONS|ACHIEVEMENTS)/i.test(
        line
      ) || (line === line.toUpperCase() && line.length > 4 && line.length < 40 && !line.startsWith('-'));

    const isBullet = line.startsWith('-') || line.startsWith('•') || line.startsWith('*');

    if (isMajorHeading) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 280, after: 100 },
          border: {
            bottom: {
              color: 'CBD5E0',
              space: 4,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          },
          children: [
            new TextRun({
              text: line.toUpperCase(),
              bold: true,
              size: 22, // 11pt
              font: 'Calibri',
              color: '2D3748',
            }),
          ],
        })
      );
    } else if (isBullet) {
      const cleanBullet = line.replace(/^[-•*]\s*/, '');
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { before: 60, after: 60 },
          children: [
            new TextRun({
              text: cleanBullet,
              size: 21, // 10.5pt
              font: 'Calibri',
              color: '2D3748',
            }),
          ],
        })
      );
    } else {
      // Standard paragraph or role title
      const isRoleOrCompany = line.includes('|') || line.includes('–') || line.includes('-');
      children.push(
        new Paragraph({
          spacing: { before: isRoleOrCompany ? 140 : 80, after: 60 },
          children: [
            new TextRun({
              text: line,
              bold: isRoleOrCompany,
              size: 21,
              font: 'Calibri',
              color: isRoleOrCompany ? '1A202C' : '4A5568',
            }),
          ],
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 in
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
