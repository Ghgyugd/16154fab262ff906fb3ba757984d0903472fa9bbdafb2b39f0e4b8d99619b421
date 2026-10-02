/**
 * Deterministic ATS Keyword Matching & Algorithmic Scoring Engine
 * Uses Tokenization, TF-IDF Vectorization, and Cosine Similarity (DSA Optimization)
 */

// Curated technical taxonomy with compound keywords
const TECH_TAXONOMY = new Set([
  'react',
  'react.js',
  'next.js',
  'typescript',
  'javascript',
  'node.js',
  'nodejs',
  'express',
  'python',
  'golang',
  'go',
  'java',
  'c++',
  'rust',
  'postgresql',
  'postgres',
  'mysql',
  'mongodb',
  'redis',
  'graphql',
  'rest api',
  'microservices',
  'docker',
  'kubernetes',
  'k8s',
  'aws',
  'aws lambda',
  'amazon web services',
  'gcp',
  'google cloud',
  'azure',
  'ci/cd',
  'github actions',
  'terraform',
  'kafka',
  'rabbitmq',
  'elasticsearch',
  'tailwind',
  'tailwind css',
  'html5',
  'css3',
  'redux',
  'zustand',
  'webpack',
  'vite',
  'system design',
  'distributed systems',
  'unit testing',
  'jest',
  'cypress',
  'playwright',
  'agile',
  'scrum',
  'product management',
  'sql',
  'nosql',
  'prisma',
  'drizzle',
  'linux',
  'git',
  'oauth',
  'security',
  'performance optimization',
]);

// English stop words filter
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'cannot', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for',
  'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him',
  'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'let', 'me', 'more',
  'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other',
  'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some',
  'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these',
  'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we',
  'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you',
  'your', 'yours', 'yourself', 'yourselves', 'looking', 'role', 'team', 'years', 'experience',
  'responsibilities', 'qualifications', 'requirements', 'must', 'plus', 'preferred', 'skills',
]);

export interface AtsMatchAnalysis {
  matchScore: number;
  presentKeywords: string[];
  missingKeywords: string[];
  strengths: string[];
  summary: string;
  cosineSimilarity: number;
  keywordCoverageRatio: number;
  starSuggestions: Array<{ original: string; suggestion: string; keyword: string }>;
}

// Multi-word / hyphen-slash taxonomy entries ("system design", "rest api", "ci/cd").
const COMPOUND_TAXONOMY = Array.from(TECH_TAXONOMY).filter((p) => /[\s/]/.test(p));

function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalizes a raw word token.
 * Returns null when the token carries no signal.
 *
 * Trailing punctuation had to be stripped: "AWS." was kept verbatim by the old
 * sanitizer, so sentence-final skills never matched their taxonomy entry.
 */
function normalizeToken(raw: string): string | null {
  let word = raw.replace(/^[.\-]+/, '');
  // Preserve genuine dotted taxonomy keys such as "node.js" / "next.js".
  if (!TECH_TAXONOMY.has(word)) {
    word = word.replace(/[.\-]+$/, '');
  }
  if (word.length < 2) return null;
  if (word === 'nodejs') word = 'node.js';
  if (word === 'k8s') word = 'kubernetes';
  return word;
}

export class AtsAlgorithmicEngine {
  /**
   * Tokenizes and normalizes text, extracting single words and compound domain tokens.
   */
  tokenize(text: string): { tokens: string[]; frequency: Map<string, number> } {
    const clean = text.toLowerCase();
    const freq = new Map<string, number>();
    const tokens: string[] = [];

    const bump = (term: string, count: number) => {
      freq.set(term, (freq.get(term) || 0) + count);
      for (let i = 0; i < count; i++) tokens.push(term);
    };

    // 1. Extract compound taxonomy phrases first ("system design", "rest api", "ci/cd").
    // Matched regions are blanked out so their constituent words are not counted
    // a second time by the single-word pass below.
    let residue = clean;
    for (const phrase of COMPOUND_TAXONOMY) {
      const regex = new RegExp(`(?<![a-z0-9])${escapeRegExp(phrase)}(?![a-z0-9])`, 'g');
      if (!regex.test(residue)) continue;
      regex.lastIndex = 0;
      const matches = residue.match(regex);
      if (matches && matches.length) {
        bump(phrase, matches.length);
        residue = residue.replace(regex, ' ');
      }
    }

    // 2. Extract standard word tokens from what is left
    const rawWords = residue
      .replace(/[^a-z0-9+#.]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));

    for (const word of rawWords) {
      const normalized = normalizeToken(word);
      if (normalized) bump(normalized, 1);
    }

    return { tokens, frequency: freq };
  }

  /**
   * Computes term-frequency weights for a document against a corpus vocabulary.
   * Curated technical terms receive an emphasis multiplier.
   */
  private computeTermWeights(
    freqMap: Map<string, number>,
    totalTokens: number,
    vocabulary: Set<string>
  ): Map<string, number> {
    const vector = new Map<string, number>();

    for (const term of vocabulary) {
      const count = freqMap.get(term) || 0;
      const tf = totalTokens > 0 ? count / totalTokens : 0;
      const boost = TECH_TAXONOMY.has(term) ? 2.5 : 1.0;
      vector.set(term, tf * boost);
    }

    return vector;
  }

  /**
   * Calculates Cosine Similarity between two term-frequency vectors.
   */
  private computeCosineSimilarity(vecA: Map<string, number>, vecB: Map<string, number>): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (const [key, valA] of vecA.entries()) {
      const valB = vecB.get(key) || 0;
      dotProduct += valA * valB;
      normA += valA * valA;
    }

    for (const valB of vecB.values()) {
      normB += valB * valB;
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Primary Deterministic Matcher: computes exact keyword delta and calibrated score.
   *
   * The vocabulary is derived from the JOB DESCRIPTION ONLY. Including
   * resume-only terms (the previous behaviour) let an unrelated resume claim
   * "present" keywords and report perfect coverage.
   */
  analyzeMatch(jobDescription: string, resumeText: string): AtsMatchAnalysis {
    const jdData = this.tokenize(jobDescription || '');
    const resumeData = this.tokenize(resumeText || '');

    // Required vocabulary: what the job actually asks for.
    const vocabulary = new Set<string>();
    for (const term of jdData.frequency.keys()) {
      if (TECH_TAXONOMY.has(term) || (jdData.frequency.get(term) || 0) >= 2) {
        vocabulary.add(term);
      }
    }

    const emptyAnalysis = (): AtsMatchAnalysis => ({
      matchScore: 0,
      presentKeywords: [],
      missingKeywords: [],
      strengths: [],
      summary:
        vocabulary.size === 0
          ? 'No recognizable role keywords were found in this job description, so no match score could be computed.'
          : 'No resume text was supplied, so no match score could be computed.',
      cosineSimilarity: 0,
      keywordCoverageRatio: 0,
      starSuggestions: [],
    });

    // No JD signal, or nothing to compare against -> no score rather than a fake one.
    if (vocabulary.size === 0 || jdData.tokens.length === 0 || resumeData.tokens.length === 0) {
      return emptyAnalysis();
    }

    const jdVector = this.computeTermWeights(
      jdData.frequency,
      jdData.tokens.length,
      vocabulary
    );
    const resumeVector = this.computeTermWeights(
      resumeData.frequency,
      resumeData.tokens.length,
      vocabulary
    );

    const cosineSim = this.computeCosineSimilarity(jdVector, resumeVector);

    // Identify Keyword Delta (Present vs Missing in Resume) over JD terms only.
    const presentKeywords: string[] = [];
    const missingCandidates: Array<{ term: string; score: number }> = [];

    for (const [term, weight] of jdVector.entries()) {
      if ((resumeData.frequency.get(term) || 0) > 0) {
        presentKeywords.push(term);
      } else if (weight > 0.005 || TECH_TAXONOMY.has(term)) {
        missingCandidates.push({ term, score: weight });
      }
    }

    // Sort by technical weight. Keep the FULL missing set for scoring; only the
    // displayed list is capped (the old code capped first, which inflated scores
    // for candidates missing dozens of keywords).
    missingCandidates.sort((a, b) => b.score - a.score);
    const MAX_REPORTED_MISSING = 8;
    const totalMissing = missingCandidates.length;
    const missingKeywords = missingCandidates.slice(0, MAX_REPORTED_MISSING).map((m) => m.term);

    const totalRequiredKeywords = presentKeywords.length + totalMissing;
    const keywordCoverage =
      totalRequiredKeywords > 0 ? presentKeywords.length / totalRequiredKeywords : 0;

    // Calibrate final deterministic ATS score (0-100%).
    // 55% Keyword Coverage + 45% Cosine Vector Proximity.
    const rawScore = keywordCoverage * 55 + Math.min(1, cosineSim * 2.2) * 45;
    const matchScore = Math.max(0, Math.min(100, Math.round(rawScore)));

    // Formulate strengths. Nothing is asserted here that the text did not support.
    const strengths: string[] = [];
    if (presentKeywords.length > 0) {
      const topStrengths = presentKeywords.slice(0, 5).map((k) => k.toUpperCase());
      strengths.push(`Resume explicitly evidences: ${topStrengths.join(', ')}.`);
    }
    if (presentKeywords.length >= 8 && matchScore >= 75) {
      strengths.push('Broad keyword overlap with the core requirements in this posting.');
    }

    // Build summary
    let summary: string;
    if (presentKeywords.length === 0) {
      summary = `No overlap found between this job description and the resume across ${totalMissing} required keywords.`;
    } else if (matchScore >= 80) {
      summary = `Strong alignment at ${matchScore}%. The resume evidences ${presentKeywords.slice(0, 4).join(', ')}, covering ${presentKeywords.length} of ${totalRequiredKeywords} required keywords.${totalMissing > 0 ? ` Addressing the ${totalMissing} missing keyword${totalMissing === 1 ? '' : 's'} would strengthen this application.` : ' No required keywords are missing.'}`;
    } else if (matchScore >= 50) {
      summary = `Moderate alignment at ${matchScore}%. The resume evidences ${presentKeywords.slice(0, 4).join(', ')}. It is missing ${totalMissing} required keyword${totalMissing === 1 ? '' : 's'}${missingKeywords.length ? `, including ${missingKeywords.slice(0, 4).join(', ')}` : ''}.`;
    } else {
      summary = `Weak alignment at ${matchScore}%. Only ${presentKeywords.length} of ${totalRequiredKeywords} required keywords are evidenced${missingKeywords.length ? `, and the resume lacks ${missingKeywords.slice(0, 4).join(', ')}` : ''}.`;
    }

    // Deterministic STAR suggestions.
    // These are structural prompts only. No metric, employer or achievement is
    // invented here — the previous version fabricated percentages that users then
    // submitted to real employers.
    const starSuggestions = missingKeywords.slice(0, 3).map((kw) => ({
      original: `(No bullet found that evidences ${kw}.)`,
      suggestion: `Add a bullet from your own experience that demonstrates ${kw}, written as: action + how you did it + measurable result. Substitute your real numbers - do not estimate.`,
      keyword: kw,
    }));

    return {
      matchScore,
      presentKeywords,
      missingKeywords,
      strengths,
      summary,
      cosineSimilarity: Number(cosineSim.toFixed(3)),
      keywordCoverageRatio: Number(keywordCoverage.toFixed(3)),
      starSuggestions,
    };
  }
}

export const atsEngine = new AtsAlgorithmicEngine();
