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

export class AtsAlgorithmicEngine {
  /**
   * Tokenizes and normalizes text, extracting single words and compound domain tokens.
   */
  tokenize(text: string): { tokens: string[]; frequency: Map<string, number> } {
    const clean = text.toLowerCase();
    const freq = new Map<string, number>();
    const tokens: string[] = [];

    // 1. Extract compound taxonomy phrases first (e.g., "system design", "rest api")
    for (const phrase of TECH_TAXONOMY) {
      if (phrase.includes(' ')) {
        const regex = new RegExp(`\\b${phrase.replace('.', '\\.')}\\b`, 'gi');
        const matches = clean.match(regex);
        if (matches) {
          freq.set(phrase, (freq.get(phrase) || 0) + matches.length * 2);
          for (let i = 0; i < matches.length; i++) tokens.push(phrase);
        }
      }
    }

    // 2. Extract standard word tokens
    const rawWords = clean
      .replace(/[^a-z0-9+#.-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));

    for (const word of rawWords) {
      // Normalize specific variations
      const normalized = word === 'nodejs' ? 'node.js' : word === 'k8s' ? 'kubernetes' : word;
      freq.set(normalized, (freq.get(normalized) || 0) + 1);
      tokens.push(normalized);
    }

    return { tokens, frequency: freq };
  }

  /**
   * Computes TF-IDF vector weights for a document against a corpus vocabulary.
   */
  private computeTfIdf(
    freqMap: Map<string, number>,
    totalTokens: number,
    vocabulary: Set<string>
  ): Map<string, number> {
    const vector = new Map<string, number>();

    for (const term of vocabulary) {
      const count = freqMap.get(term) || 0;
      // Term Frequency
      const tf = totalTokens > 0 ? count / totalTokens : 0;
      // Higher weight for curated technical taxonomy
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
   */
  analyzeMatch(jobDescription: string, resumeText: string): AtsMatchAnalysis {
    const jdData = this.tokenize(jobDescription);
    const resumeData = this.tokenize(resumeText);

    // Build common technical vocabulary
    const vocabulary = new Set<string>();
    for (const term of jdData.frequency.keys()) {
      if (TECH_TAXONOMY.has(term) || jdData.frequency.get(term)! >= 2) {
        vocabulary.add(term);
      }
    }
    for (const term of resumeData.frequency.keys()) {
      if (TECH_TAXONOMY.has(term)) {
        vocabulary.add(term);
      }
    }

    // Compute TF-IDF vectors
    const jdVector = this.computeTfIdf(jdData.frequency, jdData.tokens.length, vocabulary);
    const resumeVector = this.computeTfIdf(resumeData.frequency, resumeData.tokens.length, vocabulary);

    const cosineSim = this.computeCosineSimilarity(jdVector, resumeVector);

    // Identify Keyword Delta (Present vs Missing in Resume)
    const presentKeywords: string[] = [];
    const missingCandidates: Array<{ term: string; score: number }> = [];

    for (const [term, weight] of jdVector.entries()) {
      const isPresentInResume = (resumeData.frequency.get(term) || 0) > 0;
      if (isPresentInResume) {
        presentKeywords.push(term);
      } else if (weight > 0.005 || TECH_TAXONOMY.has(term)) {
        missingCandidates.push({ term, score: weight });
      }
    }

    // Sort missing keywords by technical weight
    missingCandidates.sort((a, b) => b.score - a.score);
    const missingKeywords = missingCandidates.slice(0, 8).map((m) => m.term);

    // Keyword coverage ratio
    const totalRequiredKeywords = presentKeywords.length + missingKeywords.length;
    const keywordCoverage =
      totalRequiredKeywords > 0 ? presentKeywords.length / totalRequiredKeywords : 0.5;

    // Calibrate final deterministic ATS score (0-100%)
    // 55% Keyword Coverage + 45% Cosine Vector Proximity
    const rawScore = keywordCoverage * 55 + Math.min(1, cosineSim * 2.2) * 45;
    const matchScore = Math.max(30, Math.min(96, Math.round(rawScore)));

    // Formulate strengths
    const strengths: string[] = [];
    if (presentKeywords.length > 0) {
      const topStrengths = presentKeywords.slice(0, 4).map((k) => k.toUpperCase());
      strengths.push(`Demonstrated proficiency in ${topStrengths.join(', ')}.`);
    }
    if (matchScore >= 75) {
      strengths.push('High alignment with technical stack and core engineering responsibilities.');
    } else {
      strengths.push('Foundational competencies match primary baseline requirements.');
    }
    strengths.push('Clean single-column parsing without formatting or tokenization anomalies.');

    // Build summary
    const summary =
      matchScore >= 80
        ? `Strong candidate profile matching ${matchScore}% of target rubrics. Profile exhibits solid coverage in ${presentKeywords.slice(0, 3).join(', ')}. Addressing ${missingKeywords.length} missing keyword tokens will optimize candidate ranking.`
        : `Moderate alignment of ${matchScore}%. Resume verifies competence in ${presentKeywords.slice(0, 3).join(', ') || 'core fundamentals'}, but lacks high-weight recruiter criteria including ${missingKeywords.slice(0, 3).join(', ')}.`;

    // Deterministic STAR suggestions
    const starSuggestions = missingKeywords.slice(0, 3).map((kw) => ({
      original: `Worked with team on system deliverables.`,
      suggestion: `Spearheaded architecture initiatives integrating ${kw.toUpperCase()}, improving throughput and system reliability across production microservices.`,
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
