# Enterprise Search Engine Architecture
## Electronic Archive Intelligent Discovery Platform

This document describes the production-grade, multi-lingual, multi-tenant search architecture of our enterprise ERP + Electronic Content Management (ECM) system.

---

## 1. Architectural Blueprint

The Search & Discovery Engine operates on a **dual-mode high-performance pipeline** designed to run seamlessly in standard PostgreSQL cloud environments as well as localized sandboxed environments (such as PGlite WASM):

```
                                  +-----------------------+
                                  |   Incoming Document   |
                                  +-----------------------+
                                              |
                                              v
                                  +-----------------------+
                                  |   Metadata Extraction |
                                  |     & OCR Pipeline    |
                                  +-----------------------+
                                              |
                                              v
                                  +-----------------------+
                                  | Pluggable Embeddings  |
                                  |   Provider (Gemini)   |
                                  +-----------------------+
                                              |
                                              v
                              +-------------------------------+
                              |    Central Search Index       |
                              |  ("document_search_index")    |
                              +-------------------------------+
                                              |
                     +------------------------+------------------------+
                     | (FTS Database Pushdown)                         | (Intelligent Match)
                     v                                                 v
       +----------------------------+                     +----------------------------+
       |   PostgreSQL Full-Text     |                     |    Advanced JS Parser      |
       |     (tsvector, GIN)        |                     |   & Highlighting Engine    |
       +----------------------------+                     +----------------------------+
                     |                                                 |
                     +------------------------+------------------------+
                                              |
                                              v
                                  +-----------------------+
                                  | Security ACL Filter   |
                                  |  (AclEngine & RLS)    |
                                  +-----------------------+
                                              |
                                              v
                                  +-----------------------+
                                  |   Weighted Ranking    |
                                  |   & Relevance Score   |
                                  +-----------------------+
                                              |
                                              v
                                  +-----------------------+
                                  |  Result Snippet w/   |
                                  |  Context Highlights   |
                                  +-----------------------+
```

---

## 2. Dynamic Query Parsing

Our custom query parser parses a comprehensive range of Boolean and field-specific operators directly in memory:
*   **Exact Phrases**: Tokens enclosed in double quotes `"tax invoice"` must match as a contiguous substring.
*   **Negations**: Excluded keywords starting with `-` or following `NOT` prevent matching files.
*   **Boolean operators**: supports explicit `AND`, `OR`, and grouping logic.
*   **Field-specific constraints**: syntax like `category:Legal`, `status:Approved`, `extension:.pdf`, or `owner:USR-001` are extracted and evaluated directly against SQL columns or nested keys inside the `customMetadata` JSON object.
*   **Wildcards**: Match parameters supporting `*` and `?` expressions.
*   **Fuzzy Search**: Implements edit distance searches based on Levenshtein's distance formula.

---

## 3. Linguistics (Arabic & English Core)

To ensure accurate discovery, our search engine implements specialized linguistic preprocessors:

### Arabic Normalization
Ensures spelling inconsistencies do not impair matching.
*   **Diacritic (Harakat) Removal**: Strips out fat-hah, dam-mah, kas-rah, and tan-ween.
*   **Alef Normalization**: Translates `أ`, `إ`, and `آ` into a standard `ا`.
*   **Teh Marbuta Normalization**: Translates `ة` into a plain `ه`.
*   **Alef Maksura Normalization**: Normalizes `ى` to `ي`.
*   **Kashida Stripping**: Removes horizontal elongations (e.g., `شـــــركة` to `شركة`).

### Multi-lingual Light Stemming
Removes common grammatical prefixes and suffixes to find the linguistic root of search terms:
*   **Arabic Roots**: Strips prefixes like `ال` (definite article), `وب`, `ف` and suffixes like `ات`, `ون`, `ين`, `ية`, `ة`, `ه`, `نا`.
*   **English Roots**: Strips suffixes like `ing`, `ed`, `ly`, `es`, `s`, `ness`, `ment`, and `tion`.

---

## 4. Weighted Relevance & Ranking Formula

For textual queries, search results are sorted according to a multi-layered TF-IDF ranking model:

$$\text{Relevance Score} = \sum (\text{Term Match Weight}) + \text{Bonus Filters}$$

Weights allocated by location:
*   **Exact Word match in Document Name**: $+0.5$ score per term.
*   **Stemmed Word match in Document Name**: $+0.3$ score per term.
*   **Match in Document Category**: $+0.2$ score per term.
*   **Match in OCR Text body**: $+0.1$ score per term.
*   **Exact Phrase match bonus**: $+0.4$ score.
*   **Explicit Field Query match**: $+0.25$ score.

---

## 5. Security & Isolation

Security is enforced at every layer of the search execution:
1.  **Multi-Tenant Isolation**: Tenant scoping is handled natively via **Row Level Security (RLS)** using `app.current_tenant_id` session settings.
2.  **Explicit ACL Auditing**: Before returning results, the Search Engine pipes each candidate document through the system `AclEngine` to evaluate the active user's permissions, ensuring restricted, confidential, or private records are completely hidden.
