# Enterprise Search Indexing & Management
## Backend Index Pipeline & Administrative Tools

This document covers index registration, automatic FTS vector updates, GIN/covering index layouts, and self-healing index validation.

---

## 1. Automatic Indexing Pipeline

Every time a document is newly uploaded, updated, or re-versioned inside the Electronic Archive, an asynchronous callback triggers the `SearchRepository.indexDocument()` routine.

```
+---------------------------+
| Document Created/Updated  |
+---------------------------+
              |
              v
+---------------------------+
| Fetch Full Version Set    |
| & Active Compliance State |
+---------------------------+
              |
              v
+---------------------------+
| Extract Text Metadata     |
| & OCR Scan Extracted Text |
+---------------------------+
              |
              v
+---------------------------+
| Fetch Vector Embeddings   |
| (AI Semantic Context math)|
+---------------------------+
              |
              v
+---------------------------+
|   Store Search Index      |
|  "document_search_index"  |
+---------------------------+
              |
              v
+---------------------------+
| Refresh tsvector Indexes  |
|  (Weighted SQL weights)   |
+---------------------------+
```

---

## 2. SQL Schema Details & Optimization

The database structures are automatically created and maintained via self-healing code inside `src/core/database/db.ts`:

### GIN Indexes
GIN indexes provide ultra-fast (sub-10ms) textual pattern lookup speeds across massive text corpora:
*   `doc_search_vector_gin_idx`: index built on `search_vector` (`tsvector`) column, enabling direct full-text scanning.
*   `doc_tags_gin_idx`: index built on tag fields for efficient taxonomy lookups.

### Specialized SQL Indices
*   `doc_active_partial_idx`: a partial index (`WHERE status = 'Active'`) designed to keep deleted, drafted, or archived documents from slowing down active index scans.
*   `doc_tenant_security_covering_idx`: a composite covering index (`tenant_id`, `document_id` INCLUDE `security_level`, `status`) that allows the system to verify security clearance levels without running expensive filesystem or disk page accesses.

---

## 3. Administrative Operations

Administrators have access to several maintenance and troubleshooting endpoints directly via the UI:

### A. Index Rebuilding (`POST /api/v1/search/rebuild`)
Forces a full, scratch-based administrative rebuild of the entire document search index for the active tenant. Extremely useful during schema migrations or after massive bulk imports.

### B. Integrity Verification (`POST /api/v1/search/verify`)
Performs a structural validation scan comparing the original Document Archive records with the Search Index database:
1.  **Orphan Check**: Identifies any indexes that reference non-existent, deleted documents.
2.  **Missing Check**: Identifies any documents that are missing search indexes.
3.  **Self-Healing**: Provides an administrative repair report to guide synchronization.
