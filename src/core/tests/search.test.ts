import { describe, it, expect } from "vitest";
import { SearchRepository } from "../database/repositories/SearchRepository";

describe("Enterprise Search Unit & Logic Tests", () => {
  describe("Arabic Normalization & Text Cleanup", () => {
    it("should remove Arabic diacritics (harakat)", () => {
      const input = "كِتَابٌ جَدِيدٌ";
      const expected = "كتاب جديد";
      expect(SearchRepository.normalizeArabic(input)).toBe(expected);
    });

    it("should normalize variants of Alef, Teh Marbuta, and Alef Maksura", () => {
      // أ إ آ -> ا
      // ة -> ه
      // ى -> ي
      const input = "أبيكس تكنولوجيز القابضة فى القاهرة آمنة";
      const expected = "ابيكس تكنولوجيز القابضه في القاهره امنه";
      expect(SearchRepository.normalizeArabic(input)).toBe(expected);
    });

    it("should strip kashida/tatweel elongation", () => {
      const input = "شـــــركــــــة";
      const expected = "شركة";
      const normalized = SearchRepository.normalizeArabic(input);
      // After kashida removal, "شركة" normalized to Teh Marbuta -> ه is "شركه"
      expect(normalized).toBe("شركه");
    });
  });

  describe("Arabic & English Light Stemmers", () => {
    it("should stem common Arabic prefixes and suffixes", () => {
      // "المستندات" -> stem prefixes "ال" -> "مستندات" -> stem suffix "ات" -> "مستند"
      expect(SearchRepository.stemArabic("المستندات")).toBe("مستند");
      expect(SearchRepository.stemArabic("وبالعقود")).toBe("عقود");
      expect(SearchRepository.stemArabic("عقودكم")).toBe("عقود");
    });

    it("should stem English plural and continuous suffixes", () => {
      expect(SearchRepository.stemEnglish("contracts")).toBe("contract");
      expect(SearchRepository.stemEnglish("reviewing")).toBe("review");
      expect(SearchRepository.stemEnglish("effectiveness")).toBe("effective");
    });

    it("should automatically route to the correct language stemmer", () => {
      expect(SearchRepository.stemWord("المستندات")).toBe("مستند");
      expect(SearchRepository.stemWord("reviewing")).toBe("review");
    });
  });

  describe("Levenshtein Distance for Fuzzy Spell-Correction", () => {
    it("should compute accurate edit distance between two strings", () => {
      expect(SearchRepository.levenshteinDistance("invoice", "infoice")).toBe(1);
      expect(SearchRepository.levenshteinDistance("contract", "contrcat")).toBe(2);
      expect(SearchRepository.levenshteinDistance("ahmed", "khodr")).toBe(4);
    });
  });

  describe("Advanced Search Query Parser (Google-like Syntax)", () => {
    it("should parse exact phrases", () => {
      const query = '"tax report 2026" draft';
      const parsed = SearchRepository.parseAdvancedQuery(query);
      expect(parsed.phrases).toContain("tax report 2026");
      expect(parsed.shouldTerms).toContain("draft");
    });

    it("should parse field-specific queries", () => {
      const query = 'category:Legal status:"Under Review" tag:Audit';
      const parsed = SearchRepository.parseAdvancedQuery(query);
      expect(parsed.fieldQueries["category"]).toContain("Legal");
      expect(parsed.fieldQueries["status"]).toContain("Under Review");
      expect(parsed.fieldQueries["tag"]).toContain("Audit");
    });

    it("should identify negation and exclusion conditions", () => {
      const query = "invoice -draft NOT obsolete";
      const parsed = SearchRepository.parseAdvancedQuery(query);
      expect(parsed.shouldTerms).toContain("invoice");
      expect(parsed.mustNotTerms).toContain("draft");
      expect(parsed.mustNotTerms).toContain("obsolete");
    });

    it("should parse wildcard and fuzzy match symbols", () => {
      const query = "contr* report~";
      const parsed = SearchRepository.parseAdvancedQuery(query);
      expect(parsed.wildcards).toContain("contr*");
      expect(parsed.fuzzyTerms).toContain("report");
    });
  });

  describe("Highlighted Context Snippet Generator", () => {
    it("should select the sentence with high query match density and apply highlights", () => {
      const ocrText = "هذا مستند عام. تم تسليم فواتير المبيعات الضريبية بنجاح إلى الإدارة المالية. هذه الفواتير تحت التدقيق القانوني المعتمد.";
      const queryTerms = ["فواتير", "الضريبية"];
      
      const snippet = SearchRepository.generateHighlightSnippet(ocrText, queryTerms);
      // Should extract context containing matching keywords and wrap them in HTML highlight tags
      expect(snippet).toContain("فواتير");
      expect(snippet).toContain("الضريبية");
      expect(snippet).toContain("strong");
    });
  });
});
