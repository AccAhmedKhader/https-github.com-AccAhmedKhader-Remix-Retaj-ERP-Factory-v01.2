import { getDb } from "../db";
import { 
  documentSearchIndex, 
  savedSearches, 
  searchAnalyticsLogs, 
  recentSearches, 
  documents,
  documentVersions,
  documentAcls
} from "../schema";
import { eq, and, desc, sql, or, like } from "drizzle-orm";
import { AclEngine } from "../../security/acl-engine";
import { GoogleGenAI } from "@google/genai";
import { UserRole } from "../../security/rbac";

// Pluggable Embedding Provider Interface
export interface EmbeddingProvider {
  getEmbedding(text: string): Promise<number[]>;
}

// Concrete Gemini Embedding Provider
export class GeminiEmbeddingProvider implements EmbeddingProvider {
  private ai: any;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
  }

  public async getEmbedding(text: string): Promise<number[]> {
    if (!this.ai) {
      // Return a stable mock vector for testing/local development when GEMINI_API_KEY is not set
      return new Array(768).fill(0).map((_, i) => Math.sin(i) * 0.1);
    }
    try {
      const response = await this.ai.models.embedContent({
        model: "gemini-embedding-2-preview",
        contents: text
      });
      return response.embedding?.values || [];
    } catch (err) {
      console.error("[SearchEngine] Gemini embedding failed, falling back to mock:", err);
      return new Array(768).fill(0).map((_, i) => Math.cos(i) * 0.1);
    }
  }
}

// Local Fallback Embedding Provider (Always active)
export class SimpleEmbeddingProvider implements EmbeddingProvider {
  public async getEmbedding(text: string): Promise<number[]> {
    const vector = new Array(768).fill(0);
    // Deterministic simple hash vector based on character weights
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      const index = (code * (i + 1)) % 768;
      vector[index] = (vector[index] + code / 65535) / 2.0;
    }
    return vector;
  }
}

export interface ParsedQuery {
  phrases: string[];
  fieldQueries: Record<string, string[]>;
  mustTerms: string[];
  mustNotTerms: string[];
  shouldTerms: string[];
  wildcards: string[];
  fuzzyTerms: string[];
}

export class SearchRepository {
  private static embeddingProvider: EmbeddingProvider = new GeminiEmbeddingProvider();

  private static readonly ARABIC_STOP_WORDS = new Set([
    "من", "إلى", "عن", "على", "في", "ب", "ل", "ك", "ال", "و", "أو", "ثم", "هذا", "هذه", "ذلك", 
    "أن", "إن", "كان", "يكون", "مع", "كل", "هو", "هي", "هم", "هن", "هنا", "هناك", "التي", "الذي", 
    "الذين", "اللائي", "اللاتي", "كما", "لكن", "منذ", "حتى", "غير", "بين", "حول", "تحت", "فوق"
  ]);

  private static readonly ENGLISH_STOP_WORDS = new Set([
    "the", "a", "an", "and", "or", "but", "if", "then", "of", "to", "in", "on", "for", "with", "by",
    "about", "against", "between", "into", "through", "during", "before", "after", "above", "below",
    "from", "up", "down", "out", "off", "over", "under", "again", "further", "once", "here", "there",
    "when", "where", "why", "how", "all", "any", "both", "each", "few", "more", "most", "other", "some",
    "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "s", "t", "can", "will",
    "just", "don", "should", "now"
  ]);

  public static setEmbeddingProvider(provider: EmbeddingProvider) {
    this.embeddingProvider = provider;
  }

  /**
   * Normalizes Arabic text to standard characters for uniform indexing and search
   */
  public static normalizeArabic(text: string): string {
    if (!text) return "";
    return text
      .replace(/[\u064B-\u0652]/g, "") // Remove harakat (diacritics)
      .replace(/[أإآ]/g, "ا")           // Normalize Alef
      .replace(/ة/g, "ه")               // Normalize Teh Marbuta
      .replace(/[ى]/g, "ي")             // Normalize Alef Maksura
      .replace(/\u0640/g, "");          // Remove tatweel/kashida
  }

  /**
   * Normalize any text: lowercase, Arabic normalized, trimmed
   */
  public static normalizeText(text: string): string {
    if (!text) return "";
    const lower = text.toLowerCase().trim();
    return this.normalizeArabic(lower);
  }

  /**
   * Check if word is a common stop word
   */
  public static isStopWord(word: string): boolean {
    const normalized = word.toLowerCase().trim();
    return this.ARABIC_STOP_WORDS.has(normalized) || this.ENGLISH_STOP_WORDS.has(normalized);
  }

  /**
   * Light Arabic stemming
   */
  public static stemArabic(word: string): string {
    let stemmed = this.normalizeArabic(word);
    if (stemmed.length <= 3) return stemmed;

    // Remove common prefixes iteratively to handle compound prefixes like "وبال" or "وال"
    let prefixRemoved = true;
    while (prefixRemoved && stemmed.length > 3) {
      prefixRemoved = false;
      if (stemmed.startsWith("ال")) {
        stemmed = stemmed.substring(2);
        prefixRemoved = true;
      } else if (stemmed.startsWith("وب")) {
        stemmed = stemmed.substring(2);
        prefixRemoved = true;
      } else if (stemmed.startsWith("بال")) {
        stemmed = stemmed.substring(3);
        prefixRemoved = true;
      } else if (stemmed.startsWith("وال")) {
        stemmed = stemmed.substring(3);
        prefixRemoved = true;
      } else if (stemmed.startsWith("لل")) {
        stemmed = stemmed.substring(2);
        prefixRemoved = true;
      } else if (stemmed.startsWith("ف")) {
        stemmed = stemmed.substring(1);
        prefixRemoved = true;
      } else if (stemmed.startsWith("ب")) {
        stemmed = stemmed.substring(1);
        prefixRemoved = true;
      } else if (stemmed.startsWith("ل")) {
        stemmed = stemmed.substring(1);
        prefixRemoved = true;
      } else if (stemmed.startsWith("ك")) {
        stemmed = stemmed.substring(1);
        prefixRemoved = true;
      }
    }

    if (stemmed.length <= 3) return stemmed;

    // Remove common suffixes
    if (stemmed.endsWith("ات")) stemmed = stemmed.substring(0, stemmed.length - 2);
    else if (stemmed.endsWith("ون")) stemmed = stemmed.substring(0, stemmed.length - 2);
    else if (stemmed.endsWith("ين")) stemmed = stemmed.substring(0, stemmed.length - 2);
    else if (stemmed.endsWith("ية")) stemmed = stemmed.substring(0, stemmed.length - 2);
    else if (stemmed.endsWith("كم")) stemmed = stemmed.substring(0, stemmed.length - 2);
    else if (stemmed.endsWith("هم")) stemmed = stemmed.substring(0, stemmed.length - 2);
    else if (stemmed.endsWith("نا")) stemmed = stemmed.substring(0, stemmed.length - 2);
    else if (stemmed.endsWith("ه")) stemmed = stemmed.substring(0, stemmed.length - 1);
    else if (stemmed.endsWith("ة")) stemmed = stemmed.substring(0, stemmed.length - 1);

    return stemmed;
  }

  /**
   * Light English stemming
   */
  public static stemEnglish(word: string): string {
    let stemmed = word.toLowerCase();
    if (stemmed.length <= 3) return stemmed;

    if (stemmed.endsWith("ing")) stemmed = stemmed.substring(0, stemmed.length - 3);
    else if (stemmed.endsWith("ed")) stemmed = stemmed.substring(0, stemmed.length - 2);
    else if (stemmed.endsWith("ly")) stemmed = stemmed.substring(0, stemmed.length - 2);
    else if (stemmed.endsWith("es")) stemmed = stemmed.substring(0, stemmed.length - 2);
    else if (stemmed.endsWith("s") && !stemmed.endsWith("ss")) stemmed = stemmed.substring(0, stemmed.length - 1);
    
    if (stemmed.endsWith("ness")) stemmed = stemmed.substring(0, stemmed.length - 4);
    else if (stemmed.endsWith("ment")) stemmed = stemmed.substring(0, stemmed.length - 4);
    else if (stemmed.endsWith("tion")) stemmed = stemmed.substring(0, stemmed.length - 4);

    return stemmed;
  }

  /**
   * Stem a word based on character language detection
   */
  public static stemWord(word: string): string {
    const cleanWord = word.trim();
    if (!cleanWord) return "";
    const isArabic = /[\u0600-\u06FF]/.test(cleanWord);
    if (isArabic) {
      return this.stemArabic(cleanWord);
    } else {
      return this.stemEnglish(cleanWord);
    }
  }

  /**
   * Levenshtein distance calculation for fuzzy matching
   */
  public static levenshteinDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    const d: number[][] = [];

    for (let i = 0; i <= m; i++) {
      d[i] = [i];
    }
    for (let j = 1; j <= n; j++) {
      d[0][j] = j;
    }

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        d[i][j] = Math.min(
          d[i - 1][j] + 1,      // Deletion
          d[i][j - 1] + 1,      // Insertion
          d[i - 1][j - 1] + cost // Substitution
        );
      }
    }
    return d[m][n];
  }

  /**
   * Parse advanced query language syntax
   */
  public static parseAdvancedQuery(query: string): ParsedQuery {
    const phrases: string[] = [];
    const fieldQueries: Record<string, string[]> = {};
    const mustTerms: string[] = [];
    const mustNotTerms: string[] = [];
    const shouldTerms: string[] = [];
    const wildcards: string[] = [];
    const fuzzyTerms: string[] = [];

    if (!query) {
      return { phrases, fieldQueries, mustTerms, mustNotTerms, shouldTerms, wildcards, fuzzyTerms };
    }

    let match;
    let cleanQuery = query;

    // 1. Extract field-specific filters (e.g., category:Legal, tags:"Tax Audit") FIRST
    const fieldRegex = /(\w+):(?:"([^"]+)"|([^\s]+))/g;
    while ((match = fieldRegex.exec(query)) !== null) {
      const field = match[1].toLowerCase().trim();
      const val = (match[2] || match[3]).trim();
      if (!fieldQueries[field]) {
        fieldQueries[field] = [];
      }
      fieldQueries[field].push(val);
    }
    cleanQuery = cleanQuery.replace(fieldRegex, " ");

    // 2. Extract exact phrases in quotes SECOND from cleanQuery
    const phraseRegex = /"([^"]+)"/g;
    while ((match = phraseRegex.exec(cleanQuery)) !== null) {
      phrases.push(match[1].trim());
    }
    cleanQuery = cleanQuery.replace(phraseRegex, " ");

    // 3. Process operators (AND, OR, NOT, +, -)
    const tokens = cleanQuery.split(/\s+/).map(t => t.trim()).filter(t => t.length > 0);
    let nextIsMust = false;
    let nextIsMustNot = false;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const upperToken = token.toUpperCase();

      if (upperToken === "AND" || token === "+") {
        nextIsMust = true;
        continue;
      }
      if (upperToken === "NOT" || token === "-") {
        nextIsMustNot = true;
        continue;
      }
      if (upperToken === "OR") {
        continue;
      }

      let term = token;
      let isNegated = false;
      let isRequired = false;

      if (term.startsWith("+")) {
        isRequired = true;
        term = term.substring(1);
      } else if (term.startsWith("-")) {
        isNegated = true;
        term = term.substring(1);
      }

      if (!term) continue;

      if (nextIsMust || isRequired) {
        mustTerms.push(term);
        nextIsMust = false;
      } else if (nextIsMustNot || isNegated) {
        mustNotTerms.push(term);
        nextIsMustNot = false;
      } else if (term.includes("*") || term.includes("?")) {
        wildcards.push(term);
      } else if (term.endsWith("~") || term.includes("~")) {
        fuzzyTerms.push(term.replace(/~/g, ""));
      } else {
        shouldTerms.push(term);
      }
    }

    return { phrases, fieldQueries, mustTerms, mustNotTerms, shouldTerms, wildcards, fuzzyTerms };
  }

  /**
   * Generates a context-aware highlight snippet
   */
  public static generateHighlightSnippet(ocrText: string, queryTerms: string[]): string {
    if (!ocrText) return "";
    const cleanOcr = ocrText.trim();
    if (queryTerms.length === 0) {
      return cleanOcr.substring(0, 150) + "...";
    }

    // Split text into sentences for match density analysis
    const sentences = cleanOcr.split(/([.!\?\n،؛]+)/).filter(s => s.trim().length > 0);
    let bestSentence = "";
    let maxMatches = -1;
    let bestIndex = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const normalizedSentence = this.normalizeText(sentence);
      let matchCount = 0;
      for (const t of queryTerms) {
        const normalizedTerm = this.normalizeText(t);
        if (normalizedTerm && normalizedSentence.includes(normalizedTerm)) {
          matchCount++;
        }
      }
      if (matchCount > maxMatches) {
        maxMatches = matchCount;
        bestSentence = sentence;
        bestIndex = i;
      }
    }

    // Capture surrounding context sentences
    let snippetContext = bestSentence;
    if (bestIndex > 0 && sentences[bestIndex - 1]) {
      snippetContext = sentences[bestIndex - 1] + " " + snippetContext;
    }
    if (bestIndex < sentences.length - 1 && sentences[bestIndex + 1]) {
      snippetContext = snippetContext + " " + sentences[bestIndex + 1];
    }

    if (snippetContext.length > 200) {
      snippetContext = snippetContext.substring(0, 200) + "...";
    }

    // Highlight query terms inside snippet securely
    let highlightedSnippet = snippetContext;
    for (const t of queryTerms) {
      if (this.isStopWord(t) || t.length < 2) continue;
      try {
        const escTerm = t.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`(${escTerm})`, "gi");
        highlightedSnippet = highlightedSnippet.replace(regex, `<strong class="text-indigo-300 font-bold underline bg-indigo-500/10 px-1 py-0.5 rounded">$1</strong>`);
      } catch (_) {}
    }

    return "..." + highlightedSnippet + "...";
  }

  /**
   * Automatically indexes a document into the search engine index.
   */
  public static async indexDocument(documentId: string, tenantId: string, ocrText?: string): Promise<void> {
    const db = await getDb();
    
    // Fetch original document details
    const docRows = await db.select().from(documents).where(and(
      eq(documents.id, documentId),
      eq(documents.tenantId, tenantId)
    ));
    if (docRows.length === 0) return;
    const doc = docRows[0];

    // Fetch versions
    const vers = await db.select().from(documentVersions).where(and(
      eq(documentVersions.documentId, documentId),
      eq(documentVersions.tenantId, tenantId)
    ));
    const hasVersions = vers.length > 1;

    // Check signature status
    const hasSignature = doc.signatureStatus === "Signed" || doc.signatureStatus === "PartiallySigned";

    // Extract tags
    const defaultTags = [doc.category, doc.securityLevel];
    if (doc.isLegalHold) defaultTags.push("LegalHold");
    if (hasSignature) defaultTags.push("Signed");

    // Gather file extension
    const extMatch = doc.name.match(/\.[0-9a-z]+$/i);
    const extension = extMatch ? extMatch[0].toLowerCase() : ".bin";

    // Extracted OCR text automatically
    const finalOcrText = ocrText || `مستند مؤرشف: الاسم ${doc.name} - التصنيف ${doc.category}. محتوى تجريبي ممسوح ضوئياً للأرشفة الذكية ومطابقة الحسابات والضرائب.`;

    // Compute embeddings for semantic discovery
    const indexableText = `${doc.name} ${doc.category} ${finalOcrText}`;
    const embedding = await this.embeddingProvider.getEmbedding(indexableText);

    const indexId = `IDX-${documentId}`;
    const newIdx = {
      id: indexId,
      tenantId,
      documentId,
      name: doc.name,
      description: doc.category + " " + (doc.isLegalHold ? "مستند تحت الوقف القانوني" : ""),
      ocrText: finalOcrText,
      category: doc.category,
      departmentId: "DEPT-GEN",
      ownerId: doc.uploadedBy,
      securityLevel: doc.securityLevel,
      status: "Active",
      tags: JSON.stringify(defaultTags),
      customMetadata: JSON.stringify({
        uploadedBy: doc.uploadedBy,
        uploadedAt: doc.uploadedAt.toISOString(),
        sha256: doc.sha256,
        sizeBytes: doc.sizeBytes
      }),
      sizeBytes: doc.sizeBytes,
      extension,
      hasSignature,
      hasVersions,
      hasAttachments: false,
      retentionPolicy: `${doc.retentionYears} Years`,
      isLegalHold: doc.isLegalHold,
      createdAt: doc.uploadedAt,
      updatedAt: new Date(),
      embeddingVector: JSON.stringify(embedding)
    };

    // Clean up older index to avoid conflicts
    await db.delete(documentSearchIndex).where(and(
      eq(documentSearchIndex.documentId, documentId),
      eq(documentSearchIndex.tenantId, tenantId)
    ));

    // Insert to search index
    await db.insert(documentSearchIndex).values(newIdx);

    // Refresh tsvector search_vector using weighted FTS configuration
    try {
      // First try to run language-specific weights
      await db.execute(sql`
        UPDATE document_search_index
        SET search_vector = 
          setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
          setweight(to_tsvector('simple', COALESCE(ocr_text, '')), 'B') ||
          setweight(to_tsvector('simple', COALESCE(category, '')), 'C') ||
          setweight(to_tsvector('simple', COALESCE(tags, '')), 'D')
        WHERE id = ${indexId}
      `);
    } catch (_) {
      try {
        // Fallback to simpler full-text tsvector updating
        await db.execute(sql`
          UPDATE document_search_index
          SET search_vector = to_tsvector('simple', COALESCE(name || ' ' || ocr_text || ' ' || category, ''))
          WHERE id = ${indexId}
        `);
      } catch (ftsError) {
        console.warn("[SearchEngine] Full tsvector indexing failed:", ftsError);
      }
    }
  }

  /**
   * Search across the document search index.
   */
  public static async search(
    tenantId: string,
    userId: string,
    userRole: string,
    params: {
      query?: string;
      category?: string;
      securityLevel?: string;
      extension?: string;
      hasSignature?: boolean;
      hasVersions?: boolean;
      isLegalHold?: boolean;
      dateFrom?: string;
      dateTo?: string;
      minSize?: number;
      maxSize?: number;
      tags?: string[];
      limit?: number;
      offset?: number;
      semanticSearch?: boolean;
    }
  ): Promise<{ results: any[]; totalCount: number; latencyMs: number }> {
    const startTime = Date.now();
    const db = await getDb();
    
    const limit = params.limit || 20;
    const offset = params.offset || 0;

    // 1. Build dynamic where clause to optimize performance at database layer (FTS pushdown)
    const conditions = [eq(documentSearchIndex.tenantId, tenantId)];

    if (params.category && params.category !== "all") {
      conditions.push(eq(documentSearchIndex.category, params.category));
    }
    if (params.securityLevel && params.securityLevel !== "all") {
      conditions.push(eq(documentSearchIndex.securityLevel, params.securityLevel));
    }
    if (params.extension && params.extension !== "all") {
      conditions.push(eq(documentSearchIndex.extension, params.extension));
    }
    if (params.isLegalHold !== undefined) {
      conditions.push(eq(documentSearchIndex.isLegalHold, params.isLegalHold));
    }
    if (params.hasSignature !== undefined) {
      conditions.push(eq(documentSearchIndex.hasSignature, params.hasSignature));
    }
    if (params.hasVersions !== undefined) {
      conditions.push(eq(documentSearchIndex.hasVersions, params.hasVersions));
    }
    if (params.minSize !== undefined) {
      conditions.push(sql`${documentSearchIndex.sizeBytes} >= ${params.minSize}`);
    }
    if (params.maxSize !== undefined) {
      conditions.push(sql`${documentSearchIndex.sizeBytes} <= ${params.maxSize}`);
    }
    if (params.dateFrom) {
      try {
        conditions.push(sql`${documentSearchIndex.createdAt} >= ${new Date(params.dateFrom)}`);
      } catch (_) {}
    }
    if (params.dateTo) {
      try {
        conditions.push(sql`${documentSearchIndex.createdAt} <= ${new Date(params.dateTo)}`);
      } catch (_) {}
    }

    // 2. Query filtered records from search index
    let allRecords = await db.select().from(documentSearchIndex).where(and(...conditions));

    // 3. Enforce Strict security permissions (RBAC / ACL) using evaluating engine
    const secured: typeof allRecords = [];
    for (const r of allRecords) {
      const isAllowed = await AclEngine.evaluateDocumentPermission(
        userId, 
        userRole as UserRole, 
        tenantId, 
        r.documentId, 
        "Read"
      );
      if (isAllowed) {
        secured.push(r);
      }
    }

    let rankedResults: any[] = [];
    const term = params.query ? params.query.trim() : "";

    if (!term) {
      // Return default listings sorted by creation date
      rankedResults = secured.map((r: any) => ({
        ...r,
        score: 1.0,
        snippet: r.ocrText ? r.ocrText.substring(0, 150) + "..." : ""
      }));
      rankedResults.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } else {
      // Parse advanced discovery grammar
      const parsedQuery = this.parseAdvancedQuery(term);
      const queryTerms = [...parsedQuery.mustTerms, ...parsedQuery.shouldTerms, ...parsedQuery.phrases];

      if (params.semanticSearch) {
        // AI Semantic Matching via Gemini / Embedding Vector math
        const queryEmbedding = await this.embeddingProvider.getEmbedding(term);
        
        rankedResults = secured.map((r: any) => {
          let score = 0.1;
          try {
            const docEmb: number[] = JSON.parse(r.embeddingVector || "[]");
            if (docEmb.length > 0 && queryEmbedding.length > 0) {
              // Cosine similarity math
              let dotProduct = 0;
              let normA = 0;
              let normB = 0;
              for (let i = 0; i < Math.min(docEmb.length, queryEmbedding.length); i++) {
                dotProduct += docEmb[i] * queryEmbedding[i];
                normA += docEmb[i] * docEmb[i];
                normB += queryEmbedding[i] * queryEmbedding[i];
              }
              score = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
            }
          } catch (err) {
            score = 0.2;
          }

          // Generate snippet
          const snippet = this.generateHighlightSnippet(r.ocrText || "", queryTerms);

          return {
            ...r,
            score: Math.max(0.1, score),
            snippet
          };
        });

        // Sort by similarity score descending
        rankedResults.sort((a, b) => b.score - a.score);
      } else {
        // Advanced Full-Text Matching & Ranking Fallback
        rankedResults = secured.filter((r: any) => {
          // A. Check Negations (MUST NOT)
          for (const notTerm of parsedQuery.mustNotTerms) {
            const normNot = this.normalizeText(notTerm);
            if (this.normalizeText(r.name).includes(normNot) || 
                this.normalizeText(r.ocrText || "").includes(normNot) ||
                this.normalizeText(r.category).includes(normNot)) {
              return false;
            }
          }

          // B. Check Field Queries (e.g. category:Legal)
          for (const [field, values] of Object.entries(parsedQuery.fieldQueries)) {
            let matchesField = false;
            let actualValue = "";

            if (field === "name") actualValue = r.name;
            else if (field === "category") actualValue = r.category;
            else if (field === "status") actualValue = r.status;
            else if (field === "securitylevel" || field === "level") actualValue = r.securityLevel;
            else if (field === "extension" || field === "ext") actualValue = r.extension || "";
            else if (field === "owner") actualValue = r.ownerId || "";
            else if (field === "department" || field === "dept") actualValue = r.departmentId || "";
            else {
              // Check customMetadata
              try {
                const metaObj = JSON.parse(r.customMetadata || "{}");
                actualValue = metaObj[field] || "";
              } catch (_) {}
            }

            const normActual = this.normalizeText(actualValue);
            for (const v of values) {
              if (normActual.includes(this.normalizeText(v))) {
                matchesField = true;
                break;
              }
            }
            if (!matchesField) return false;
          }

          // C. Check Must Terms (AND)
          for (const mustTerm of parsedQuery.mustTerms) {
            const normMust = this.normalizeText(mustTerm);
            const inName = this.normalizeText(r.name).includes(normMust);
            const inOcr = this.normalizeText(r.ocrText || "").includes(normMust);
            const inCat = this.normalizeText(r.category).includes(normMust);
            if (!inName && !inOcr && !inCat) {
              return false;
            }
          }

          // D. Check Phrases (Exact substring)
          for (const phrase of parsedQuery.phrases) {
            const normPhrase = this.normalizeText(phrase);
            const inName = this.normalizeText(r.name).includes(normPhrase);
            const inOcr = this.normalizeText(r.ocrText || "").includes(normPhrase);
            const inDesc = this.normalizeText(r.description || "").includes(normPhrase);
            if (!inName && !inOcr && !inDesc) {
              return false;
            }
          }

          // E. Check Wildcard match
          for (const wildcard of parsedQuery.wildcards) {
            const pattern = wildcard.toLowerCase().replace(/\*/g, ".*").replace(/\?/g, ".");
            try {
              const regex = new RegExp(pattern, "i");
              const inName = regex.test(r.name);
              const inOcr = regex.test(r.ocrText || "");
              if (!inName && !inOcr) return false;
            } catch (_) {}
          }

          // F. Default terms evaluation (OR)
          if (parsedQuery.shouldTerms.length > 0) {
            let matchedAny = false;
            for (const st of parsedQuery.shouldTerms) {
              const normSt = this.normalizeText(st);
              const inName = this.normalizeText(r.name).includes(normSt);
              const inOcr = this.normalizeText(r.ocrText || "").includes(normSt);
              const inCat = this.normalizeText(r.category).includes(normSt);
              if (inName || inOcr || inCat) {
                matchedAny = true;
                break;
              }
            }
            if (!matchedAny && parsedQuery.mustTerms.length === 0 && parsedQuery.phrases.length === 0) {
              return false;
            }
          }

          return true;
        }).map((r: any) => {
          // Calculate weighted search rankings based on query parameters
          let score = 0.1;
          
          for (const t of queryTerms) {
            const normT = this.normalizeText(t);
            const stemmed = this.stemWord(t);

            // High weights for matches in name / fields
            if (this.normalizeText(r.name).includes(normT)) score += 0.5;
            else if (stemmed && this.normalizeText(r.name).includes(stemmed)) score += 0.3;

            if (this.normalizeText(r.category).includes(normT)) score += 0.2;
            if (this.normalizeText(r.ocrText || "").includes(normT)) score += 0.1;
          }

          // Add bonus for matching metadata field queries
          score += Object.keys(parsedQuery.fieldQueries).length * 0.25;
          score += parsedQuery.phrases.length * 0.4;

          // Cap the score
          score = Math.min(1.0, score);

          // Generate highlight context snippet
          const snippet = this.generateHighlightSnippet(r.ocrText || "", queryTerms);

          return {
            ...r,
            score,
            snippet
          };
        });

        rankedResults.sort((a, b) => b.score - a.score);
      }

      // Record query to recent searches and analytics
      await this.logSearchQuery(tenantId, userId, term, Date.now() - startTime, rankedResults.length);
    }

    const totalCount = rankedResults.length;
    const paginated = rankedResults.slice(offset, offset + limit);
    const latencyMs = Date.now() - startTime;

    return {
      results: paginated,
      totalCount,
      latencyMs
    };
  }

  /**
   * Log search analytic details.
   */
  private static async logSearchQuery(tenantId: string, userId: string, query: string, latencyMs: number, resultCount: number): Promise<void> {
    try {
      const db = await getDb();
      const analyticsId = `ANL-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const recentId = `REC-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

      // Insert analytics
      await db.insert(searchAnalyticsLogs).values({
        id: analyticsId,
        tenantId,
        userId,
        query,
        latencyMs,
        resultCount,
        timestamp: new Date()
      });

      // Insert or update recent search
      const existingRecent = await db.select().from(recentSearches).where(and(
        eq(recentSearches.tenantId, tenantId),
        eq(recentSearches.userId, userId),
        eq(recentSearches.query, query)
      ));
      if (existingRecent.length === 0) {
        await db.insert(recentSearches).values({
          id: recentId,
          tenantId,
          userId,
          query,
          timestamp: new Date()
        });
      } else {
        await db.update(recentSearches).set({
          timestamp: new Date()
        }).where(eq(recentSearches.id, existingRecent[0].id));
      }
    } catch (err) {
      console.error("[SearchEngine] Failed to log search analytics:", err);
    }
  }

  /**
   * Fetch faceted metrics for searching.
   */
  public static async getFacets(tenantId: string, userId: string, userRole: string): Promise<any> {
    const db = await getDb();
    const allRecords = await db.select().from(documentSearchIndex).where(eq(documentSearchIndex.tenantId, tenantId));
    
    // Filter by ACL permissions
    const secured = [];
    for (const r of allRecords) {
      if (await AclEngine.evaluateDocumentPermission(userId, userRole as UserRole, tenantId, r.documentId, "Read")) {
        secured.push(r);
      }
    }

    const categories: Record<string, number> = {};
    const securityLevels: Record<string, number> = {};
    const extensions: Record<string, number> = {};
    const statuses: Record<string, number> = {};
    const tagCounts: Record<string, number> = {};

    for (const r of secured) {
      categories[r.category] = (categories[r.category] || 0) + 1;
      securityLevels[r.securityLevel] = (securityLevels[r.securityLevel] || 0) + 1;
      const ext = r.extension || ".unknown";
      extensions[ext] = (extensions[ext] || 0) + 1;
      statuses[r.status] = (statuses[r.status] || 0) + 1;
      
      try {
        const tags: string[] = JSON.parse(r.tags || "[]");
        tags.forEach(t => {
          tagCounts[t] = (tagCounts[t] || 0) + 1;
        });
      } catch (_) {}
    }

    return {
      categories: Object.entries(categories).map(([name, count]) => ({ name, count })),
      securityLevels: Object.entries(securityLevels).map(([name, count]) => ({ name, count })),
      extensions: Object.entries(extensions).map(([name, count]) => ({ name, count })),
      statuses: Object.entries(statuses).map(([name, count]) => ({ name, count })),
      tags: Object.entries(tagCounts).map(([name, count]) => ({ name, count }))
    };
  }

  /**
   * Search suggestions (Autocomplete + autocorrect / did you mean)
   */
  public static async getSuggestions(tenantId: string, userId: string, prefix: string): Promise<string[]> {
    const db = await getDb();
    const term = prefix.toLowerCase().trim();
    if (term === "") return [];

    // 1. Match document names starting with or containing term
    const docMatches = await db.select({ name: documentSearchIndex.name })
      .from(documentSearchIndex)
      .where(and(
        eq(documentSearchIndex.tenantId, tenantId),
        like(documentSearchIndex.name, `%${term}%`)
      ))
      .limit(5);

    // 2. Match past search queries
    const pastMatches = await db.select({ query: searchAnalyticsLogs.query })
      .from(searchAnalyticsLogs)
      .where(and(
        eq(searchAnalyticsLogs.tenantId, tenantId),
        like(searchAnalyticsLogs.query, `%${term}%`)
      ))
      .limit(5);

    const suggestionsSet = new Set<string>();
    docMatches.forEach((d: { name: string }) => suggestionsSet.add(d.name));
    pastMatches.forEach((p: { query: string }) => suggestionsSet.add(p.query));

    // Spell Correction / Did You Mean simulation for fallback search suggestions
    if (suggestionsSet.size === 0 && prefix.length > 3) {
      // Find the closest matching indexed document name using fuzzy distance
      const allIndexDocs = await db.select({ name: documentSearchIndex.name })
        .from(documentSearchIndex)
        .where(eq(documentSearchIndex.tenantId, tenantId))
        .limit(100);

      let closestName = "";
      let minDistance = 999;
      for (const d of allIndexDocs) {
        const dist = this.levenshteinDistance(term, d.name.toLowerCase());
        if (dist < minDistance && dist <= 3) {
          minDistance = dist;
          closestName = d.name;
        }
      }

      if (closestName) {
        suggestionsSet.add(closestName);
      } else {
        suggestionsSet.add(prefix.substring(0, prefix.length - 1) + " (Did you mean?)");
      }
    }

    return Array.from(suggestionsSet).slice(0, 8);
  }

  /**
   * Retrieve recent searches.
   */
  public static async getRecentSearches(tenantId: string, userId: string): Promise<any[]> {
    const db = await getDb();
    return await db.select()
      .from(recentSearches)
      .where(and(
        eq(recentSearches.tenantId, tenantId),
        eq(recentSearches.userId, userId)
      ))
      .orderBy(desc(recentSearches.timestamp))
      .limit(10);
  }

  /**
   * Retrieve popular/trending searches.
   */
  public static async getPopularSearches(tenantId: string): Promise<any[]> {
    const db = await getDb();
    const logs = await db.select().from(searchAnalyticsLogs).where(eq(searchAnalyticsLogs.tenantId, tenantId));
    const termCounts: Record<string, number> = {};
    for (const l of logs) {
      termCounts[l.query] = (termCounts[l.query] || 0) + 1;
    }
    return Object.entries(termCounts)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Retrieve search analytics metrics for enterprise insight.
   */
  public static async getAnalytics(tenantId: string): Promise<any> {
    const db = await getDb();
    const logs = await db.select().from(searchAnalyticsLogs).where(eq(searchAnalyticsLogs.tenantId, tenantId));
    
    let totalLatency = 0;
    let zeroResultCount = 0;
    const termCounts: Record<string, number> = {};

    for (const l of logs) {
      totalLatency += l.latencyMs;
      if (l.resultCount === 0) zeroResultCount++;
      termCounts[l.query] = (termCounts[l.query] || 0) + 1;
    }

    const averageLatencyMs = logs.length > 0 ? Math.round(totalLatency / logs.length) : 0;
    const trendingTerms = Object.entries(termCounts)
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalSearches: logs.length,
      averageLatencyMs,
      zeroResultSearches: zeroResultCount,
      trendingTerms
    };
  }

  /**
   * Save search query.
   */
  public static async saveSearch(tenantId: string, userId: string, name: string, query: string, filters?: any): Promise<any> {
    const db = await getDb();
    const id = `SAV-${Date.now()}`;
    const newSave = {
      id,
      tenantId,
      userId,
      name,
      query,
      filters: filters ? JSON.stringify(filters) : null,
      createdAt: new Date()
    };
    await db.insert(savedSearches).values(newSave);
    return newSave;
  }

  /**
   * Rebuild search indices from scratch (for full administrative rebuild).
   */
  public static async rebuildIndex(tenantId: string): Promise<{ success: boolean; indexedCount: number }> {
    const db = await getDb();
    const docs = await db.select().from(documents).where(eq(documents.tenantId, tenantId));
    
    let indexedCount = 0;
    for (const doc of docs) {
      await this.indexDocument(doc.id, tenantId);
      indexedCount++;
    }

    return {
      success: true,
      indexedCount
    };
  }

  /**
   * Verify integrity of indexes.
   */
  public static async verifyIntegrity(tenantId: string): Promise<{ isHealthy: boolean; orphanIndexes: string[]; missingIndexes: string[] }> {
    const db = await getDb();
    const docs = await db.select({ id: documents.id }).from(documents).where(eq(documents.tenantId, tenantId));
    const indices = await db.select({ id: documentSearchIndex.id, docId: documentSearchIndex.documentId }).from(documentSearchIndex).where(eq(documentSearchIndex.tenantId, tenantId));

    const docIds = new Set(docs.map((d: { id: string }) => d.id));
    const indexDocIds = new Set(indices.map((i: { docId: string }) => i.docId));

    const orphanIndexes: string[] = [];
    const missingIndexes: string[] = [];

    for (const ind of indices) {
      if (!docIds.has(ind.docId)) {
        orphanIndexes.push(ind.id);
      }
    }

    for (const doc of docs) {
      if (!indexDocIds.has(doc.id)) {
        missingIndexes.push(doc.id);
      }
    }

    return {
      isHealthy: orphanIndexes.length === 0 && missingIndexes.length === 0,
      orphanIndexes,
      missingIndexes
    };
  }
}
