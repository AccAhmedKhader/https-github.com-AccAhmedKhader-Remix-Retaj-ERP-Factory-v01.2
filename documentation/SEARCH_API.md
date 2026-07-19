# Enterprise Search API Specification
## RESTful Discovery Interface

All search endpoints are versioned and require an active session token with corresponding scopes (like `documents:read`).

---

## 1. Search Query
Performs full-text, metadata, or AI semantic search across active records.

*   **URL**: `/api/v1/search`
*   **Method**: `GET`
*   **Query Parameters**:
    *   `q` (string, optional): Search term or advanced query string.
    *   `category` (string, optional): Document category filter (e.g. `Legal`, `Financial`).
    *   `securityLevel` (string, optional): Access restrictions (`Public`, `Confidential`, etc.).
    *   `extension` (string, optional): File extension (e.g., `.pdf`, `.docx`).
    *   `hasSignature` (boolean, optional): Signed document filter.
    *   `hasVersions` (boolean, optional): Versioned documents filter.
    *   `isLegalHold` (boolean, optional): Under legal hold filter.
    *   `minSize` / `maxSize` (integer, optional): File size in bytes.
    *   `dateFrom` / `dateTo` (string, optional): Archive date range (YYYY-MM-DD).
    *   `limit` (integer, default 20): Results limit.
    *   `offset` (integer, default 0): Pagination offset.
    *   `semantic` (boolean, default false): Toggle AI Semantic (vector similarity) discovery.

*   **Response Sample**:
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "IDX-DOC-001",
        "documentId": "DOC-001",
        "name": "عقد توريد برمجيات سحابية.pdf",
        "category": "Legal",
        "securityLevel": "Confidential",
        "score": 0.95,
        "snippet": "...تم تسليم فواتير المبيعات بنجاح تحت التدقيق <strong class=\"text-indigo-300\">القانوني</strong> المعتمد...",
        "sizeBytes": 45120,
        "extension": ".pdf",
        "hasSignature": true,
        "isLegalHold": false,
        "createdAt": "2026-07-18T12:00:00.000Z"
      }
    ],
    "total": 1,
    "latencyMs": 42
  }
}
```

---

## 2. Autocomplete Suggestions
Provides real-time typing autocomplete suggestions and spell-corrected suggestions.

*   **URL**: `/api/v1/search/suggestions`
*   **Method**: `GET`
*   **Query Parameters**:
    *   `prefix` (string, required): Term typed by the user.

*   **Response Sample**:
```json
{
  "success": true,
  "data": [
    "فاتورة مبيعات",
    "عقد توريد برمجيات سحابية.pdf",
    "فواتير الضرائب القيمة المضافة"
  ]
}
```

---

## 3. Intelligent Facets
Retrieves aggregation metrics across active document criteria for bento-grid sidebars.

*   **URL**: `/api/v1/search/facets`
*   **Method**: `GET`

*   **Response Sample**:
```json
{
  "success": true,
  "data": {
    "categories": [
      { "name": "Legal", "count": 12 },
      { "name": "Financial", "count": 48 }
    ],
    "securityLevels": [
      { "name": "Public", "count": 40 },
      { "name": "Confidential", "count": 20 }
    ],
    "extensions": [
      { "name": ".pdf", "count": 35 },
      { "name": ".xlsx", "count": 25 }
    ],
    "statuses": [
      { "name": "Active", "count": 60 }
    ],
    "tags": [
      { "name": "Signed", "count": 15 },
      { "name": "Audit", "count": 8 }
    ]
  }
}
```

---

## 4. Search Analytics
Returns search analytics logs for administrators.

*   **URL**: `/api/v1/search/analytics`
*   **Method**: `GET`

*   **Response Sample**:
```json
{
  "success": true,
  "data": {
    "totalSearches": 125,
    "averageLatencyMs": 35,
    "zeroResultSearches": 3,
    "trendingTerms": [
      { "term": "فاتورة ضريبية", "count": 34 },
      { "term": "عقود برمجيات", "count": 18 }
    ]
  }
}
```

---

## 5. Saved Searches
Saves an advanced query with associated filter configurations for future one-click recovery.

*   **URL**: `/api/v1/search/saved`
*   **Method**: `POST`
*   **Payload**:
```json
{
  "name": "عقود تحت المراجعة القانونية",
  "query": "category:Legal status:Draft",
  "filters": {
    "discCat": "Legal",
    "discSec": "Confidential"
  }
}
```
*   **Response**:
```json
{
  "success": true,
  "data": {
    "id": "SAV-1718062226",
    "name": "عقود تحت المراجعة القانونية",
    "query": "category:Legal status:Draft",
    "createdAt": "2026-07-18T13:30:00.000Z"
  }
}
```
