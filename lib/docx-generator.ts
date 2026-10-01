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
  candidateName?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  tailoredText: string;
}

export async function generateResumeDocx(options: DocxResumeOptions): Promise<Buffer> {
  const { candidateName = 'CANDIDATE NAME', jobTitle = 'Target Role', tailoredText } = options;

  const lines = tailoredText.split('\n').map(l => l.trim()).filter(Boolean);
  const children: Paragraph[] = [];

  // Top header: Name
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: candidateName.toUpperCase(),
          bold: true,
          size: 32, // 16pt
          font: 'Calibri',
          color: '1A202C',
        }),
      ],
    })
  );

  // Subtitle: Target Job Title
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: jobTitle,
          bold: true,
          size: 24, // 12pt
          font: 'Calibri',
          color: '2B6CB0',
        }),
      ],
    })
  );

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
